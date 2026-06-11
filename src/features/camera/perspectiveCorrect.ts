/**
 * 静默透视矫正：
 * 1. Sobel 边缘检测
 * 2. 霍夫概率变换找最大矩形
 * 3. 单应矩阵把梯形黑板拉成正矩形
 *
 * 检测失败时静默返回 null，调用方直接用原图
 */

export interface Quad {
  tl: [number, number];
  tr: [number, number];
  br: [number, number];
  bl: [number, number];
}

// ─── Sobel 边缘检测 ────────────────────────────────────────────────────────────
function sobelEdges(data: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }
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
      const mag = Math.sqrt(gx * gx + gy * gy);
      edges[y * w + x] = mag > 40 ? 255 : 0;
    }
  }
  return edges;
}

// ─── 找轮廓最大矩形（4顶点） ──────────────────────────────────────────────────
function findLargestQuad(edges: Uint8Array, w: number, h: number): Quad | null {
  // 采样边缘点（降分辨率后仅取亮点）
  const pts: [number, number][] = [];
  const step = 4;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (edges[y * w + x] > 128) pts.push([x, y]);
    }
  }
  if (pts.length < 40) return null;

  // 利用凸包近似四边形：取4个极端点（左上/右上/右下/左下方向上最极端的点）
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

  // 校验：4点围成的四边形面积要占画面 25% 以上
  const area = quadArea(tl, tr, br, bl);
  if (area < w * h * 0.25) return null;

  // 校验：形状不能太歪（4点不能几乎共线）
  const isDegenerate = (
    Math.hypot(tl[0] - tr[0], tl[1] - tr[1]) < 20 ||
    Math.hypot(bl[0] - br[0], bl[1] - br[1]) < 20
  );
  if (isDegenerate) return null;

  return { tl, tr, br, bl };
}

function quadArea(
  tl: [number, number], tr: [number, number],
  br: [number, number], bl: [number, number],
): number {
  // 利用叉积计算四边形面积
  const cross = (a: [number, number], b: [number, number], c: [number, number]) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return Math.abs(cross(tl, tr, br) + cross(tl, br, bl)) / 2;
}

// ─── 单应矩阵（Homography）计算 ────────────────────────────────────────────────
type M3 = number[]; // 3x3 行优先

function computeHomography(src: [number, number][], dst: [number, number][]): M3 | null {
  // 构建 8x8 线性系统（DLT 算法），求解 H
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [sx, sy] = src[i];
    const [dx, dy] = dst[i];
    A.push([-sx, -sy, -1, 0, 0, 0, dx * sx, dx * sy, dx]);
    A.push([0, 0, 0, -sx, -sy, -1, dy * sx, dy * sy, dy]);
  }
  // 高斯消元
  const n = 8;
  const aug = A.map((row, i) => [...row.slice(0, n), row[n]]); // 8×9
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-10) return null;
    const pivot = aug[col][col];
    for (let j = col; j <= n; j++) aug[col][j] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = aug[row][col];
      for (let j = col; j <= n; j++) aug[row][j] -= f * aug[col][j];
    }
  }
  const h = aug.map(row => row[n]);
  return [...h, 1]; // H 最后一个元素固定为 1
}

function applyH(H: M3, x: number, y: number): [number, number] {
  const w = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
}

// ─── 公开 API ─────────────────────────────────────────────────────────────────

/**
 * 尝试检测 canvas 图像中的黑板/文档矩形并矫正透视。
 * 失败时返回 null（调用方使用原图）。
 */
export function correctPerspective(src: HTMLCanvasElement): HTMLCanvasElement | null {
  try {
    // 缩小到最长边 400px 做检测（速度优先）
    const DETECT_MAX = 400;
    const scale = Math.min(DETECT_MAX / src.width, DETECT_MAX / src.height, 1);
    const dw = Math.round(src.width * scale);
    const dh = Math.round(src.height * scale);

    const small = document.createElement("canvas");
    small.width = dw;
    small.height = dh;
    small.getContext("2d")!.drawImage(src, 0, 0, dw, dh);
    const imgData = small.getContext("2d")!.getImageData(0, 0, dw, dh);
    const edges = sobelEdges(imgData.data, dw, dh);
    const quad = findLargestQuad(edges, dw, dh);
    if (!quad) return null;

    // 把检测角点映射回原图坐标
    const inv = 1 / scale;
    const srcPts: [number, number][] = [
      [quad.tl[0] * inv, quad.tl[1] * inv],
      [quad.tr[0] * inv, quad.tr[1] * inv],
      [quad.br[0] * inv, quad.br[1] * inv],
      [quad.bl[0] * inv, quad.bl[1] * inv],
    ];

    // 目标矩形尺寸（保持检测到的宽高比，最长边 2000px）
    const topW = Math.hypot(srcPts[1][0] - srcPts[0][0], srcPts[1][1] - srcPts[0][1]);
    const botW = Math.hypot(srcPts[2][0] - srcPts[3][0], srcPts[2][1] - srcPts[3][1]);
    const leftH = Math.hypot(srcPts[3][0] - srcPts[0][0], srcPts[3][1] - srcPts[0][1]);
    const rightH = Math.hypot(srcPts[2][0] - srcPts[1][0], srcPts[2][1] - srcPts[1][1]);
    const outW = Math.round((topW + botW) / 2);
    const outH = Math.round((leftH + rightH) / 2);
    const MAX_OUT = 2000;
    const outScale = Math.min(MAX_OUT / outW, MAX_OUT / outH, 1);
    const fw = Math.round(outW * outScale);
    const fh = Math.round(outH * outScale);

    const dstPts: [number, number][] = [[0, 0], [fw, 0], [fw, fh], [0, fh]];
    const H = computeHomography(dstPts, srcPts); // dst→src（反向映射）
    if (!H) return null;

    const out = document.createElement("canvas");
    out.width = fw;
    out.height = fh;
    const outCtx = out.getContext("2d")!;
    const srcCtx = src.getContext("2d")!;
    const srcData = srcCtx.getImageData(0, 0, src.width, src.height);
    const outData = outCtx.createImageData(fw, fh);

    // 像素级反向映射（双线性插值）
    for (let dy = 0; dy < fh; dy++) {
      for (let dx = 0; dx < fw; dx++) {
        const [sx, sy] = applyH(H, dx, dy);
        const xi = Math.floor(sx), yi = Math.floor(sy);
        if (xi < 0 || yi < 0 || xi >= src.width - 1 || yi >= src.height - 1) continue;
        const fx = sx - xi, fy = sy - yi;
        const i00 = (yi * src.width + xi) * 4;
        const i10 = (yi * src.width + xi + 1) * 4;
        const i01 = ((yi + 1) * src.width + xi) * 4;
        const i11 = ((yi + 1) * src.width + xi + 1) * 4;
        const di = (dy * fw + dx) * 4;
        for (let c = 0; c < 3; c++) {
          outData.data[di + c] = Math.round(
            srcData.data[i00 + c] * (1 - fx) * (1 - fy) +
            srcData.data[i10 + c] * fx * (1 - fy) +
            srcData.data[i01 + c] * (1 - fx) * fy +
            srcData.data[i11 + c] * fx * fy,
          );
        }
        outData.data[di + 3] = 255;
      }
    }
    outCtx.putImageData(outData, 0, 0);
    return out;
  } catch {
    return null;
  }
}

/**
 * 对 dataURL 图片尝试透视矫正，返回处理后的 dataURL。
 * 失败则返回原 dataURL。
 */
export async function correctPerspectiveDataUrl(dataUrl: string): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      const result = correctPerspective(canvas);
      resolve(result ? result.toDataURL("image/jpeg", 0.92) : dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
