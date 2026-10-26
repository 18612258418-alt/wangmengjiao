/**
 * 本地用户偏好学习：记录每次解析的技能类型与用户澄清回复，
 * 汇总成一段简短画像注入提示词，让 AI 推断意图越来越准。
 * 仅存 localStorage，不上传原始数据。
 */

const STORAGE_KEY = "pdfReader.userProfile.v1";

const SKILL_LABELS: Record<string, string> = {
  theory_concept: "概念理解",
  math_problem: "数学/物理解题",
  language: "语言学习",
  experiment_lab: "实验方法",
  code_cs: "代码/算法",
  literature_essay: "文献论述",
};

interface ProfileData {
  /** skill → 出现次数 */
  skills: Record<string, number>;
  /** 最近的澄清回复（用户亲口说的意图，最有学习价值） */
  clarifications: string[];
  total: number;
}

function load(): ProfileData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as ProfileData;
      if (d && typeof d === "object" && d.skills) return d;
    }
  } catch { /* 损坏则重建 */ }
  return { skills: {}, clarifications: [], total: 0 };
}

function save(data: ProfileData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* 存储满则放弃 */ }
}

/** 每次解析成功后记录该次的技能类型 */
export function recordAnalysis(skill: string) {
  const data = load();
  data.skills[skill] = (data.skills[skill] ?? 0) + 1;
  data.total += 1;
  save(data);
}

/** 用户回复澄清提问时记录原话 */
export function recordClarification(reply: string) {
  const t = reply.trim();
  if (!t) return;
  const data = load();
  data.clarifications = [t, ...data.clarifications.filter(c => c !== t)].slice(0, 5);
  save(data);
}

/** 汇总成 ≤150 字的画像文本；样本太少时返回空（避免误导模型） */
export function summarizeProfile(): string {
  const data = load();
  if (data.total < 3) return "";

  const ranked = Object.entries(data.skills)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([skill, n]) => `${SKILL_LABELS[skill] ?? skill}（${Math.round((n / data.total) * 100)}%）`);

  const parts: string[] = [];
  if (ranked.length) parts.push(`该用户标记的常见需求：${ranked.join("、")}`);
  if (data.clarifications.length) {
    parts.push(`用户最近说明过的意图：「${data.clarifications.slice(0, 2).join("」「")}」`);
  }
  return parts.join("；").slice(0, 150);
}
