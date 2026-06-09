export interface Point { x: number; y: number }
export interface BoundingBox { x: number; y: number; w: number; h: number }

function pathLength(pts: Point[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len;
}

/**
 * Returns a bounding box (with padding) if the given stroke forms a roughly
 * closed shape (circle, loop, freehand selection), or null if it is an open stroke.
 *
 * Heuristic: the distance from the last point back to the first point must be
 * less than 25% of the total path length, and the path must be at least 40px long.
 */
export function detectClosedShape(pts: Point[]): BoundingBox | null {
  if (pts.length < 8) return null;

  const first = pts[0];
  const last = pts[pts.length - 1];
  const closeDist = Math.hypot(last.x - first.x, last.y - first.y);
  const total = pathLength(pts);

  if (total < 40 || closeDist > total * 0.25) return null;

  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);
  const pad = 14;

  return {
    x: Math.max(0, Math.min(...xs) - pad),
    y: Math.max(0, Math.min(...ys) - pad),
    w: Math.max(...xs) - Math.min(...xs) + pad * 2,
    h: Math.max(...ys) - Math.min(...ys) + pad * 2,
  };
}
