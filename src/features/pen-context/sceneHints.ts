import type { PenScene, PenSceneMeta } from "./types";

const ANNOTATION_HINTS: Record<string, string> = {
  courseware: "正在阅读课件——圈选您关注的知识点，AI 将自动整理成记忆卡",
  notes: "正在整理笔记——圈选公式或要点，AI 将自动提炼重点",
  exercises: "正在看网课——圈选屏幕上的知识点，AI 将自动留存核心内容",
  webpage: "正在浏览资料——圈选关注内容，AI 将自动摘录知识点",
};

const SCENE_HINTS: Record<PenScene, string | null> = {
  idle: null,
  annotation: null,
  pdf: "正在阅读 PDF——停笔后 AI 将识别圈选、下划线与手写标记，自动存入记忆",
  screenshot: "已捕获屏幕内容——AI 正在理解当前页面情境",
  camera: "情境感知相机已激活——对准板书或文档，AI 自动识别并整理",
  voice: "录音进行中——课堂内容将自动转写并存入记忆",
  "form-fill": "检测到学术表格控件——记忆库可自动填充申明信息、AI 去重说明与签名",
};

export function getSceneHint(scene: PenScene, meta: PenSceneMeta = {}): string | null {
  if (scene === "annotation") {
    const key = meta.annotationType ?? "notes";
    return ANNOTATION_HINTS[key] ?? ANNOTATION_HINTS.notes;
  }
  if (scene === "pdf" && meta.fileName) {
    return `正在阅读「${meta.fileName}」——停笔后 AI 将识别您的标记并自动存入记忆`;
  }
  return SCENE_HINTS[scene];
}
