export const DEMO_TRANSCRIPT = `好的，今天我们继续讲第十二章机械振动与机械波。

上节课我们介绍了简谐振动的基本方程 x(t) = A·cos(ωt + φ₀)，今天重点讲旋转矢量法和多振动的叠加。

旋转矢量法的核心思想是用一个匀速旋转的矢量来表示简谐振动，矢量的长度等于振幅，矢量在 x 轴上的投影就是位移。

当 N 个同频等幅振动叠加时，相邻振动的相位差为 δ，合振幅公式为 R = A·sin(Nδ/2) / sin(δ/2)。

下课前布置一道题：两列振幅相同、频率相同但相位相差 π/3 的振动叠加，求合振幅和初相位。`;

export function isDemoTranscript(text: string): boolean {
  return text.trim() === DEMO_TRANSCRIPT.trim();
}
