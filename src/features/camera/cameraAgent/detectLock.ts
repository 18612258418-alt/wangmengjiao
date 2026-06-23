import type { Quad } from "../perspectiveCorrect";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 平滑角点，避免框抖动 */
export function smoothQuad(prev: Quad | null, next: Quad, alpha = 0.38): Quad {
  if (!prev) return next;
  return {
    tl: [lerp(prev.tl[0], next.tl[0], alpha), lerp(prev.tl[1], next.tl[1], alpha)],
    tr: [lerp(prev.tr[0], next.tr[0], alpha), lerp(prev.tr[1], next.tr[1], alpha)],
    br: [lerp(prev.br[0], next.br[0], alpha), lerp(prev.br[1], next.br[1], alpha)],
    bl: [lerp(prev.bl[0], next.bl[0], alpha), lerp(prev.bl[1], next.bl[1], alpha)],
  };
}

/** 连续命中/未命中计数，避免虚线↔实线闪烁 */
export class DetectLock {
  private hit = 0;
  private miss = 0;
  active = false;
  quad: Quad | null = null;

  constructor(
    private readonly hitToLock: number,
    private readonly missToUnlock: number,
  ) {}

  update(candidate: Quad | null): { active: boolean; quad: Quad | null } {
    if (candidate) {
      this.hit += 1;
      this.miss = 0;
      this.quad = smoothQuad(this.quad, candidate);
      if (!this.active && this.hit >= this.hitToLock) {
        this.active = true;
      }
    } else {
      this.miss += 1;
      this.hit = 0;
      if (this.active && this.miss >= this.missToUnlock) {
        this.active = false;
        this.quad = null;
      }
    }
    return { active: this.active, quad: this.active ? this.quad : null };
  }

  reset() {
    this.hit = 0;
    this.miss = 0;
    this.active = false;
    this.quad = null;
  }
}
