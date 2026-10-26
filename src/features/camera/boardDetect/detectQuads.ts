import type { DetectQuadOptions, Quad } from "../perspectiveCorrect";
import {
  detectBrightPaperQuad,
  detectContentBoundsQuad,
  measureFrameMotion,
} from "./paperDetect";
import type { DetectedPanel, FrameMetrics } from "./types";

/** 分析用最大边长，避免 getImageData 过大 */
const ANALYSIS_MAX = 240;

export type DetectMethod = "edge" | "paper" | "content";

export interface DetectResult extends DetectedPanel {
  method: DetectMethod;
}

export interface FrameAnalysis {
  videoW: number;
  videoH: number;
  scale: number;
  panel: DetectResult | null;
  metrics: FrameMetrics;
  camMotion: number;
}

let analysisCanvas: HTMLCanvasElement | null = null;
let prevGray: Float32Array | null = null;
let sharedGray: Float32Array | null = null;

export function defaultGuideQuad(videoW: number, videoH: number): Quad {
  const m = 0.11;
  return {
    tl: [videoW * m, videoH * m],
    tr: [videoW * (1 - m), videoH * m],
    br: [videoW * (1 - m), videoH * (1 - m)],
    bl: [videoW * m, videoH * (1 - m)],
  };
}

function getAnalysisCanvas(dw: number, dh: number): HTMLCanvasElement {
  if (!analysisCanvas) analysisCanvas = document.createElement("canvas");
  if (analysisCanvas.width !== dw || analysisCanvas.height !== dh) {
    analysisCanvas.width = dw;
    analysisCanvas.height = dh;
  }
  return analysisCanvas;
}

function getSharedGray(w: number, h: number): Float32Array {
  const n = w * h;
  if (!sharedGray || sharedGray.length !== n) sharedGray = new Float32Array(n);
  return sharedGray;
}

function fillGray(data: Uint8ClampedArray, w: number, h: number): Float32Array {
  const gray = getSharedGray(w, h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }
  return gray;
}

function quadArea(q: Quad): number {
  const cross = (a: [number, number], b: [number, number], c: [number, number]) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return Math.abs(cross(q.tl, q.tr, q.br) + cross(q.tl, q.br, q.bl)) / 2;
}

function scaleQuad(quad: Quad, invScale: number): Quad {
  return {
    tl: [quad.tl[0] * invScale, quad.tl[1] * invScale],
    tr: [quad.tr[0] * invScale, quad.tr[1] * invScale],
    br: [quad.br[0] * invScale, quad.br[1] * invScale],
    bl: [quad.bl[0] * invScale, quad.bl[1] * invScale],
  };
}

function findQuadFromGrayEdges(
  gray: Float32Array,
  w: number,
  h: number,
  threshold: number,
  minRatio: number,
): Quad | null {
  const edges = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (r: number, c: number) => r * w + c;
      const gx =
        -gray[idx(y - 1, x - 1)] + gray[idx(y - 1, x + 1)]
        - 2 * gray[idx(y, x - 1)] + 2 * gray[idx(y, x + 1)]
        - gray[idx(y + 1, x - 1)] + gray[idx(y + 1, x + 1)];
      const gy =
        gray[idx(y - 1, x - 1)] + 2 * gray[idx(y - 1, x)] + gray[idx(y - 1, x + 1)]
        - gray[idx(y + 1, x - 1)] - 2 * gray[idx(y + 1, x)] - gray[idx(y + 1, x + 1)];
      edges[y * w + x] = Math.hypot(gx, gy) > threshold ? 255 : 0;
    }
  }

  const pts: [number, number][] = [];
  const step = 4;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (edges[y * w + x] > 128) pts.push([x, y]);
    }
  }
  if (pts.length < 12) return null;

  const score = {
    tl: (p: [number, number]) => p[0] + p[1],
    tr: (p: [number, number]) => p[0] - p[1],
    br: (p: [number, number]) => -(p[0] + p[1]),
    bl: (p: [number, number]) => -(p[0] - p[1]),
  };
  const tl = pts.reduce((a, b) => score.tl(a) < score.tl(b) ? a : b);
  const tr = pts.reduce((a, b) => score.tr(a) > score.tr(b) ? a : b);
  const br = pts.reduce((a, b) => score.br(a) < score.br(b) ? a : b);
  const bl = pts.reduce((a, b) => score.bl(a) < score.bl(b) ? a : b);

  const area = quadArea({ tl, tr, br, bl });
  if (area < w * h * minRatio) return null;

  const minEdge = Math.min(w, h) * 0.04;
  if (
    Math.hypot(tl[0] - tr[0], tl[1] - tr[1]) < minEdge
    || Math.hypot(bl[0] - br[0], bl[1] - br[1]) < minEdge
  ) return null;

  return { tl, tr, br, bl };
}

function detectFromImageData(
  data: Uint8ClampedArray,
  dw: number,
  dh: number,
  minRatio: number,
): DetectResult | null {
  const paperQuad = detectBrightPaperQuad(data, dw, dh, minRatio);
  if (paperQuad) {
    return { quad: paperQuad, areaRatio: quadArea(paperQuad) / (dw * dh), method: "paper" };
  }

  const contentQuad = detectContentBoundsQuad(data, dw, dh, minRatio * 0.8);
  if (contentQuad) {
    return { quad: contentQuad, areaRatio: quadArea(contentQuad) / (dw * dh), method: "content" };
  }

  const gray = fillGray(data, dw, dh);
  const edgeQuad = findQuadFromGrayEdges(gray, dw, dh, 18, minRatio);
  if (edgeQuad) {
    return { quad: edgeQuad, areaRatio: quadArea(edgeQuad) / (dw * dh), method: "edge" };
  }

  return null;
}

function measureMetricsFromRgba(data: Uint8ClampedArray, w: number, h: number): FrameMetrics {
  let lapSum = 0;
  let edgeCount = 0;
  let n = 0;
  const step = 3;
  for (let y = 1; y < h - 1; y += step) {
    for (let x = 1; x < w - 1; x += step) {
      const i = (y * w + x) * 4;
      const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const gL = 0.299 * data[i - 4] + 0.587 * data[i - 3] + 0.114 * data[i - 2];
      const gR = 0.299 * data[i + 4] + 0.587 * data[i + 5] + 0.114 * data[i + 6];
      const gT = 0.299 * data[i - w * 4] + 0.587 * data[i - w * 4 + 1] + 0.114 * data[i - w * 4 + 2];
      const gB = 0.299 * data[i + w * 4] + 0.587 * data[i + w * 4 + 1] + 0.114 * data[i + w * 4 + 2];
      const lap = Math.abs(-4 * g + gL + gR + gT + gB);
      lapSum += lap;
      if (lap > 20) edgeCount++;
      n++;
    }
  }
  return { sharpness: lapSum / n, edgeDensity: edgeCount / n };
}

/** 单次低分辨率分析（复用 canvas / gray，避免内存暴涨） */
export function analyzeVideoFrame(
  video: HTMLVideoElement,
  opts?: DetectQuadOptions,
): FrameAnalysis | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh || video.readyState < 2) return null;

  const scale = Math.min(ANALYSIS_MAX / vw, ANALYSIS_MAX / vh, 1);
  const dw = Math.max(1, Math.round(vw * scale));
  const dh = Math.max(1, Math.round(vh * scale));
  const canvas = getAnalysisCanvas(dw, dh);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  try {
    ctx.drawImage(video, 0, 0, dw, dh);
    const imgData = ctx.getImageData(0, 0, dw, dh);
    const data = imgData.data;
    if (data.length === 0) return null;

    const minRatio = opts?.minAreaRatio ?? 0.06;
    const local = detectFromImageData(data, dw, dh, minRatio);

    const { motion, gray } = measureFrameMotion(data, prevGray, dw, dh);
    prevGray = gray;

    const inv = 1 / scale;
    const panel = local
      ? { ...local, quad: scaleQuad(local.quad, inv), areaRatio: local.areaRatio }
      : null;

    return {
      videoW: vw,
      videoH: vh,
      scale,
      panel,
      metrics: measureMetricsFromRgba(data, dw, dh),
      camMotion: motion,
    };
  } catch (err) {
    console.warn("[analyzeVideoFrame]", err);
    return null;
  }
}

export function resetFrameAnalyzer() {
  prevGray = null;
  sharedGray = null;
}

/** @deprecated 使用 analyzeVideoFrame */
export function detectPrimaryPanel(
  source: HTMLVideoElement | HTMLCanvasElement,
  opts?: DetectQuadOptions,
): DetectResult | null {
  if (source instanceof HTMLVideoElement) {
    return analyzeVideoFrame(source, opts)?.panel ?? null;
  }
  return null;
}

export function quadMotion(a: Quad, b: Quad): number {
  const ptsA = [a.tl, a.tr, a.br, a.bl];
  const ptsB = [b.tl, b.tr, b.br, b.bl];
  let sum = 0;
  for (let i = 0; i < 4; i++) {
    sum += Math.hypot(ptsA[i][0] - ptsB[i][0], ptsA[i][1] - ptsB[i][1]);
  }
  return sum / 4;
}

export function measureFrameMetrics(_canvas: HTMLCanvasElement): FrameMetrics {
  return { sharpness: 0, edgeDensity: 0 };
}

export function computeCaptureScore(
  metrics: FrameMetrics,
  stability: number,
  areaRatio: number,
): number {
  const sharpNorm = Math.min(1, metrics.sharpness / 12);
  const edgeNorm = Math.min(1, metrics.edgeDensity / 0.06);
  const areaNorm = Math.min(1, Math.max(0, (areaRatio - 0.05) / 0.45));
  return (
    0.36 * stability
    + 0.34 * sharpNorm
    + 0.18 * edgeNorm
    + 0.12 * areaNorm
  );
}

export { measureFrameMotion };
