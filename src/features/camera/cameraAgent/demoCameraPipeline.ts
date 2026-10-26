import type { Quad } from "../perspectiveCorrect";
import type { DeepSeekResult } from "../../../utils/api";
import {
  DEMO_CAMERA_IMAGE,
  DEMO_CAMERA_TIMING,
  DEMO_CAMERA_UNIFIED_DETAIL,
  resolveDemoCameraSubject,
} from "./demoCamera";

export type DemoProcessStep = "edge" | "warp" | "ai";

export const DEMO_PROCESS_COPY: Record<DemoProcessStep, string> = {
  edge: "正在检测资料边缘…",
  warp: "正在透视矫正…",
  ai: "AI 正在理解资料…",
};

export function sleep(ms: number): Promise<void> {
  return new Promise(r => window.setTimeout(r, ms));
}

/** 模拟边缘从虚线框收敛为略带透视的四边形 */
export function fakeDetectQuadAtProgress(vw: number, vh: number, t: number): Quad {
  const p = Math.min(1, Math.max(0, t));
  const ease = p * p * (3 - 2 * p);
  const m = 0.11 + 0.04 * (1 - ease);
  const skew = ease * vw * 0.018;
  const lift = ease * vh * 0.012;
  return {
    tl: [vw * m + skew * 0.15, vh * m + lift],
    tr: [vw * (1 - m) - skew, vh * m + lift * 0.6],
    br: [vw * (1 - m) + skew * 0.35, vh * (1 - m) - lift * 0.4],
    bl: [vw * m + skew * 0.55, vh * (1 - m) - lift],
  };
}

export function getDemoDoubaoResult(activeSubject: string): DeepSeekResult {
  const subjectId = resolveDemoCameraSubject(activeSubject);
  return {
    subjectId,
    skill: "theory_concept",
    contentType: "note",
    title: "记忆：极限概念课堂笔记",
    summary: "通过瞬时速度和曲边梯形面积问题引入极限概念",
    overview:
      "介绍极限概念从两个经典问题中诞生：瞬时速度问题与曲边梯形面积问题，均通过区间划分与极限求解，分别引出导数与定积分。",
    detailIntro: "情境感知相机识别到课堂板书/文档区域",
    detailSections: [
      {
        title: "曲边梯形面积问题",
        items: [
          "场景：y = f(x) 与 x 轴围成面积",
          "近似：划分区间求和",
          "精确解：取极限，引出定积分",
        ],
      },
      {
        title: "瞬时速度问题",
        items: [
          "平均速度 Δs/Δt 在 Δt→0 时的极限",
          "即瞬时速度，引出导数概念",
        ],
      },
    ],
    aiKeyPoints: [
      "曲边梯形面积：划分 → 求和 → 取极限",
      "瞬时速度：平均速度在 Δt→0 的极限",
      "极限是导数与定积分的共同基础",
    ],
    expandedKnowledge: [
      {
        concept: "定积分",
        explanation: "解决曲边梯形面积等问题的数学工具，基于极限定义",
      },
    ],
    knowledgeTree: [
      { label: "高等数学 - 极限 - 经典问题", level: 1, current: false },
    ],
    nextAction: "可继续圈注课件或做一道极限计算练习题巩固",
  };
}

/** 从视频抓一帧小图，用于「矫正前」预览；失败则返回 null */
export function grabVideoSnapshot(
  video: HTMLVideoElement,
  maxEdge = 240,
): string | null {
  try {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;
    const s = Math.min(maxEdge / vw, maxEdge / vh, 1);
    const w = Math.max(1, Math.round(vw * s));
    const h = Math.max(1, Math.round(vh * s));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.drawImage(video, 0, 0, w, h);
    return c.toDataURL("image/jpeg", 0.72);
  } catch {
    return null;
  }
}

export async function runFakeCapturePipeline(opts: {
  video: HTMLVideoElement | null;
  onStep: (step: DemoProcessStep, previewUrl: string | null, status: string) => void;
}): Promise<string> {
  const { video, onStep } = opts;

  onStep("edge", null, DEMO_PROCESS_COPY.edge);
  await sleep(DEMO_CAMERA_TIMING.edgeMs);

  onStep("warp", null, DEMO_PROCESS_COPY.warp);
  await sleep(DEMO_CAMERA_TIMING.warpBeforeMs);
  onStep("warp", DEMO_CAMERA_IMAGE, DEMO_PROCESS_COPY.warp);
  await sleep(DEMO_CAMERA_TIMING.warpAfterMs);

  onStep("ai", DEMO_CAMERA_IMAGE, DEMO_PROCESS_COPY.ai);
  await sleep(DEMO_CAMERA_TIMING.aiMs);

  return DEMO_CAMERA_IMAGE;
}

/** 模拟 DeepSeek 流式输出 unifiedDetail */
export async function fakeStreamUnifiedDetail(
  onChunk: (text: string) => void,
): Promise<string> {
  const full = DEMO_CAMERA_UNIFIED_DETAIL;
  const step = 36;
  for (let i = step; i < full.length + step; i += step) {
    onChunk(full.slice(0, Math.min(i, full.length)));
    await sleep(48);
  }
  return full;
}

export async function fakeDoubaoDelay(): Promise<void> {
  await sleep(DEMO_CAMERA_TIMING.doubaoMs);
}
