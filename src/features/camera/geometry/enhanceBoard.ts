/** 板书对比度轻量增强（大图跳过，避免移动端 OOM） */
export function enhanceBoardCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  if (src.width * src.height > 960 * 960) return src;
  const ctx = src.getContext("2d")!;
  const img = ctx.getImageData(0, 0, src.width, src.height);
  const d = img.data;

  let min = 255;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (g < min) min = g;
    if (g > max) max = g;
  }

  const range = Math.max(max - min, 1);
  const lo = min + range * 0.04;
  const hi = max - range * 0.02;
  const span = Math.max(hi - lo, 1);

  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = ((d[i + c] - lo) / span) * 255;
      d[i + c] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
  ctx.putImageData(img, 0, 0);
  return src;
}
