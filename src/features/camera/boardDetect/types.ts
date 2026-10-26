import type { Quad } from "../perspectiveCorrect";

export interface DetectedPanel {
  quad: Quad;
  /** 0–1，占画面面积比 */
  areaRatio: number;
}

export interface FrameMetrics {
  sharpness: number;
  edgeDensity: number;
}
