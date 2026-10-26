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
function sobelEdges(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  threshold = 32,
): Uint8Array {
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
      edges[y * w + x] = mag > threshold ? 255 : 0;
    }
  }
  return edges;
}

export interface DetectQuadOptions {
  /** 四边形面积占画面最小比例，默认 0.25 */
  minAreaRatio?: number;
}

// ─── 找轮廓最大矩形（4顶点） ──────────────────────────────────────────────────
export function detectQuadFromCanvas(
  src: HTMLCanvasElement,
  opts?: DetectQuadOptions,
): Quad | null {
  try {
    const imgData = src.getContext("2d")!.getImageData(0, 0, src.width, src.height);
    const minRatio = opts?.minAreaRatio ?? 0.06;
    for (const threshold of [28, 20, 14, 10]) {
      const edges = sobelEdges(imgData.data, src.width, src.height, threshold);
      const quad = findLargestQuad(edges, src.width, src.height, minRatio);
      if (quad) return quad;
    }
    return null;
  } catch {
    return null;
  }
}

function findLargestQuad(
  edges: Uint8Array,
  w: number,
  h: number,
  minAreaRatio: number,
): Quad | null {
  // 采样边缘点（降分辨率后仅取亮点）
  const pts: [number, number][] = [];
  const step = 4;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (edges[y * w + x] > 128) pts.push([x, y]);
    }
  }
  if (pts.length < 20) return null;

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
  if (area < w * h * minAreaRatio) return null;

  // 校验：形状不能太歪（边长相对画面过短）
  const minEdge = Math.min(w, h) * 0.05;
  const isDegenerate = (
    Math.hypot(tl[0] - tr[0], tl[1] - tr[1]) < minEdge
    || Math.hypot(bl[0] - br[0], bl[1] - br[1]) < minEdge
    || Math.hypot(tl[0] - bl[0], tl[1] - bl[1]) < minEdge
    || Math.hypot(tr[0] - br[0], tr[1] - br[1]) < minEdge
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

const WARP_MAX_SRC = 960;
const WARP_MAX_OUT = 960;

function scaleQuad(quad: Quad, s: number): Quad {
  return {
    tl: [quad.tl[0] * s, quad.tl[1] * s],
    tr: [quad.tr[0] * s, quad.tr[1] * s],
    br: [quad.br[0] * s, quad.br[1] * s],
    bl: [quad.bl[0] * s, quad.bl[1] * s],
  };
}

function downscaleCanvas(
  src: HTMLCanvasElement,
  maxEdge: number,
): { canvas: HTMLCanvasElement; scale: number } {
  const scale = Math.min(maxEdge / src.width, maxEdge / src.height, 1);
  if (scale >= 1) return { canvas: src, scale: 1 };
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(src.width * scale));
  canvas.height = Math.max(1, Math.round(src.height * scale));
  canvas.getContext("2d")!.drawImage(src, 0, 0, canvas.width, canvas.height);
  return { canvas, scale };
}

/** 仿射变换绘制三角形，避免 getImageData 全图拷贝（移动端 OOM 杀手） */
function drawImageTriangle(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  s0: [number, number],
  s1: [number, number],
  s2: [number, number],
  d0: [number, number],
  d1: [number, number],
  d2: [number, number],
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0[0], d0[1]);
  ctx.lineTo(d1[0], d1[1]);
  ctx.lineTo(d2[0], d2[1]);
  ctx.closePath();
  ctx.clip();

  const denom = (s0[0] - s2[0]) * (s1[1] - s2[1]) - (s1[0] - s2[0]) * (s0[1] - s2[1]);
  if (Math.abs(denom) < 1e-6) {
    ctx.restore();
    return;
  }

  const m11 = ((d0[0] - d2[0]) * (s1[1] - s2[1]) - (d1[0] - d2[0]) * (s0[1] - s2[1])) / denom;
  const m12 = ((d1[0] - d2[0]) * (s0[0] - s2[0]) - (d0[0] - d2[0]) * (s1[0] - s2[0])) / denom;
  const m21 = ((d0[1] - d2[1]) * (s1[1] - s2[1]) - (d1[1] - d2[1]) * (s0[1] - s2[1])) / denom;
  const m22 = ((d1[1] - d2[1]) * (s0[0] - s2[0]) - (d0[1] - d2[1]) * (s1[0] - s2[0])) / denom;
  const dx = d2[0] - m11 * s2[0] - m12 * s2[1];
  const dy = d2[1] - m21 * s2[0] - m22 * s2[1];

  ctx.transform(m11, m21, m12, m22, dx, dy);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/** 将源图中 quad 区域透视拉正为矩形 canvas */
export function warpCanvasWithQuad(src: HTMLCanvasElement, quad: Quad): HTMLCanvasElement | null {
  try {
    const { canvas: workSrc, scale: srcScale } = downscaleCanvas(src, WARP_MAX_SRC);
    const q = srcScale < 1 ? scaleQuad(quad, srcScale) : quad;

    const topW = Math.hypot(q.tr[0] - q.tl[0], q.tr[1] - q.tl[1]);
    const botW = Math.hypot(q.br[0] - q.bl[0], q.br[1] - q.bl[1]);
    const leftH = Math.hypot(q.bl[0] - q.tl[0], q.bl[1] - q.tl[1]);
    const rightH = Math.hypot(q.br[0] - q.tr[0], q.br[1] - q.tr[1]);
    const outW = Math.round((topW + botW) / 2);
    const outH = Math.round((leftH + rightH) / 2);
    if (outW < 8 || outH < 8) return null;

    const outScale = Math.min(WARP_MAX_OUT / outW, WARP_MAX_OUT / outH, 1);
    const fw = Math.max(1, Math.round(outW * outScale));
    const fh = Math.max(1, Math.round(outH * outScale));

    const out = document.createElement("canvas");
    out.width = fw;
    out.height = fh;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, fw, fh);

    drawImageTriangle(ctx, workSrc, q.tl, q.tr, q.bl, [0, 0], [fw, 0], [0, fh]);
    drawImageTriangle(ctx, workSrc, q.tr, q.br, q.bl, [fw, 0], [fw, fh], [0, fh]);
    return out;
  } catch {
    return null;
  }
}

/**
 * 尝试检测 canvas 图像中的黑板/文档矩形并矫正透视。
 * 失败时返回 null（调用方使用原图）。
 */
export function correctPerspective(src: HTMLCanvasElement): HTMLCanvasElement | null {
  try {
    const { canvas: work } = downscaleCanvas(src, WARP_MAX_SRC);
    const DETECT_MAX = 400;
    const detectScale = Math.min(DETECT_MAX / work.width, DETECT_MAX / work.height, 1);
    const dw = Math.max(1, Math.round(work.width * detectScale));
    const dh = Math.max(1, Math.round(work.height * detectScale));

    const small = document.createElement("canvas");
    small.width = dw;
    small.height = dh;
    small.getContext("2d")!.drawImage(work, 0, 0, dw, dh);
    const quadSmall = detectQuadFromCanvas(small);
    if (!quadSmall) return null;

    const inv = 1 / detectScale;
    const quad: Quad = {
      tl: [quadSmall.tl[0] * inv, quadSmall.tl[1] * inv],
      tr: [quadSmall.tr[0] * inv, quadSmall.tr[1] * inv],
      br: [quadSmall.br[0] * inv, quadSmall.br[1] * inv],
      bl: [quadSmall.bl[0] * inv, quadSmall.bl[1] * inv],
    };

    return warpCanvasWithQuad(work, quad);
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
