import type { Quad } from "../perspectiveCorrect";

/** Otsu 自动阈值 */
function otsuThreshold(gray: Float32Array): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) {
    hist[Math.min(255, Math.max(0, Math.round(gray[i])))]++;
  }
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];

  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const varBetween = wB * wF * (mB - mF) ** 2;
    if (varBetween > maxVar) {
      maxVar = varBetween;
      threshold = t;
    }
  }
  return threshold;
}

function toGray(data: Uint8ClampedArray, w: number, h: number): Float32Array {
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }
  return gray;
}

function boxToQuad(minX: number, minY: number, maxX: number, maxY: number): Quad {
  return {
    tl: [minX, minY],
    tr: [maxX, minY],
    br: [maxX, maxY],
    bl: [minX, maxY],
  };
}

function validBox(
  minX: number, minY: number, maxX: number, maxY: number,
  w: number, h: number,
  minAreaRatio: number,
): boolean {
  const bw = maxX - minX;
  const bh = maxY - minY;
  if (bw <= 0 || bh <= 0) return false;
  if (bw * bh < w * h * minAreaRatio) return false;
  const aspect = bw / bh;
  if (aspect < 0.22 || aspect > 4.5) return false;
  return true;
}

/**
 * 亮区检测：白纸、屏幕、证件等通常比背景更亮
 */
export function detectBrightPaperQuad(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  minAreaRatio: number,
): Quad | null {
  const gray = toGray(data, w, h);
  const thr = Math.max(otsuThreshold(gray), 90);
  const margin = Math.floor(Math.min(w, h) * 0.04);

  let minX = w, minY = h, maxX = 0, maxY = 0;
  let count = 0;
  for (let y = margin; y < h - margin; y++) {
    for (let x = margin; x < w - margin; x++) {
      if (gray[y * w + x] >= thr) {
        count++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (count < w * h * minAreaRatio * 0.35) return null;
  if (!validBox(minX, minY, maxX, maxY, w, h, minAreaRatio)) return null;
  return boxToQuad(minX, minY, maxX, maxY);
}

/**
 * 内容边界：按行列梯度能量找文字/线条密集区
 */
export function detectContentBoundsQuad(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  minAreaRatio: number,
): Quad | null {
  const gray = toGray(data, w, h);
  const rowE = new Float32Array(h);
  const colE = new Float32Array(w);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx = Math.abs(gray[y * w + x + 1] - gray[y * w + x - 1]);
      const gy = Math.abs(gray[(y + 1) * w + x] - gray[(y - 1) * w + x]);
      rowE[y] += gx + gy * 0.5;
      colE[x] += gy + gx * 0.5;
    }
  }

  let rowMax = 0;
  let colMax = 0;
  for (let i = 0; i < h; i++) if (rowE[i] > rowMax) rowMax = rowE[i];
  for (let i = 0; i < w; i++) if (colE[i] > colMax) colMax = colE[i];
  const rowThr = rowMax * 0.22;
  const colThr = colMax * 0.22;

  let top = 0;
  let bottom = h - 1;
  let left = 0;
  let right = w - 1;

  while (top < h && rowE[top] < rowThr) top++;
  while (bottom > top && rowE[bottom] < rowThr) bottom--;
  while (left < w && colE[left] < colThr) left++;
  while (right > left && colE[right] < colThr) right--;

  const padX = Math.round((right - left) * 0.03);
  const padY = Math.round((bottom - top) * 0.03);
  left = Math.max(0, left - padX);
  right = Math.min(w - 1, right + padX);
  top = Math.max(0, top - padY);
  bottom = Math.min(h - 1, bottom + padY);

  if (!validBox(left, top, right, bottom, w, h, minAreaRatio)) return null;
  return boxToQuad(left, top, right, bottom);
}

/** 帧间运动量，用于相机稳定判定 */
export function measureFrameMotion(
  data: Uint8ClampedArray,
  prev: Float32Array | null,
  w: number,
  h: number,
): { motion: number; gray: Float32Array } {
  const gray = toGray(data, w, h);
  if (!prev || prev.length !== gray.length) {
    return { motion: 999, gray };
  }
  let diff = 0;
  const step = 4;
  let n = 0;
  for (let i = 0; i < gray.length; i += step) {
    diff += Math.abs(gray[i] - prev[i]);
    n++;
  }
  return { motion: diff / n, gray };
}
