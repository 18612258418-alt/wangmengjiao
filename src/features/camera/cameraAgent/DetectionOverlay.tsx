import { memo } from "react";
import type { Quad } from "../perspectiveCorrect";

interface Props {
  quad: Quad | null;
  detected: boolean;
  stable: boolean;
  videoRect: { left: number; top: number; width: number; height: number };
  videoSize: { w: number; h: number };
}

function mapPoint(
  x: number,
  y: number,
  videoRect: Props["videoRect"],
  videoSize: Props["videoSize"],
): [number, number] {
  const vw = videoSize.w || 1;
  const vh = videoSize.h || 1;
  const sx = videoRect.width / vw;
  const sy = videoRect.height / vh;
  return [videoRect.left + x * sx, videoRect.top + y * sy];
}

function guidePath(videoRect: Props["videoRect"]): string {
  const m = 0.1;
  const x1 = videoRect.left + videoRect.width * m;
  const y1 = videoRect.top + videoRect.height * m;
  const x2 = videoRect.left + videoRect.width * (1 - m);
  const y2 = videoRect.top + videoRect.height * (1 - m);
  return `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2} L ${x1} ${y2} Z`;
}

function quadPath(
  q: Quad,
  videoRect: Props["videoRect"],
  videoSize: Props["videoSize"],
): string {
  const pts = [q.tl, q.tr, q.br, q.bl].map(([x, y]) =>
    mapPoint(x, y, videoRect, videoSize),
  );
  return `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]} L ${pts[2][0]} ${pts[2][1]} L ${pts[3][0]} ${pts[3][1]} Z`;
}

export const DetectionOverlay = memo(function DetectionOverlay({
  quad,
  detected,
  stable,
  videoRect,
  videoSize,
}: Props) {
  if (videoRect.width <= 0 || videoRect.height <= 0) return null;

  // 有 quad 时始终跟 quad 走，避免虚线参考框 ↔ 检测框瞬间切换造成闪烁
  const useQuad = !!quad;
  const d = useQuad ? quadPath(quad!, videoRect, videoSize) : guidePath(videoRect);
  const stroke = detected
    ? (stable ? "#4D5CFF" : "rgba(255,255,255,0.95)")
    : "rgba(255,255,255,0.55)";
  const fill = detected
    ? (stable ? "rgba(77,92,255,0.14)" : "rgba(255,255,255,0.06)")
    : "rgba(255,255,255,0.03)";

  const corners = useQuad
    ? [quad!.tl, quad!.tr, quad!.br, quad!.bl].map(([x, y]) =>
      mapPoint(x, y, videoRect, videoSize),
    )
    : [];

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: "100%", height: "100%" }}
    >
      <path
        d={d}
        fill={fill}
        stroke={stroke}
        strokeWidth={detected ? 2.5 : 2}
        strokeDasharray={detected ? undefined : "12 8"}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{ transition: "stroke 0.4s ease, fill 0.4s ease" }}
      />
      {corners.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={detected ? 4 : 3}
          fill={stroke}
          style={{ transition: "fill 0.4s ease, r 0.3s ease" }}
        />
      ))}
    </svg>
  );
});
