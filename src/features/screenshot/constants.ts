import type { SourceAnchor } from "../../types";

/** 演示截图页固定锚点：同页重复截图视为同一条记忆 */
export const DEMO_SCREENSHOT_ANCHOR: SourceAnchor = {
  kind: "screenshot",
  fileId: "demo_physics_ch12",
  fileName: "机械振动与机械波",
};

/** 演示截图固定卡片 id，避免并发/状态滞后导致重复落卡 */
export const DEMO_SCREENSHOT_CARD_ID = "note_screenshot_demo_physics_ch12";

export function sourceAnchorKey(anchor: SourceAnchor): string {
  return [
    anchor.kind,
    anchor.fileId ?? "",
    anchor.page ?? "",
    anchor.contentId ?? "",
  ].join(":");
}
