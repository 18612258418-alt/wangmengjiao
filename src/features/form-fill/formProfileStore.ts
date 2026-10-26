const STORAGE_KEY = "imemo_form_profile";

export interface FormProfile {
  name: string;
  studentId: string;
  college: string;
  major: string;
  advisor: string;
  thesisTitle: string;
  phone: string;
  aiToolsDeclaration: string;
  aiDedupStatement: string;
  experimentDataSource: string;
  experimentAuthenticity: string;
  signatureDataUrl: string | null;
  photoDataUrl: string | null;
}

export const DEFAULT_PROFILE: FormProfile = {
  name: "张同学",
  studentId: "2024010123",
  college: "理学院",
  major: "应用物理学",
  advisor: "李教授",
  thesisTitle: "基于旋转矢量法的简谐振动与同频叠加研究",
  phone: "138****5678",
  aiToolsDeclaration:
    "撰写过程中使用 ChatGPT 辅助润色英文摘要、检查 LaTeX 公式排版；未使用 AI 生成实验数据或核心推导。",
  aiDedupStatement:
    "本人承诺已对全文进行 AI 生成内容排查与去重，引用与 AI 辅助段落均已标注；正文重复率符合学院要求（≤15%）。",
  experimentDataSource:
    "实验数据来源于大学物理实验室 2025 秋季学期「机械振动」课程实验记录（原始数据表编号 PHY-2025-08）。",
  experimentAuthenticity:
    "所有实验均在指导教师监督下完成，原始记录、照片与数据处理脚本已存档，可按学院要求提交复核。",
  signatureDataUrl: null,
  photoDataUrl: null,
};

export function loadFormProfile(): FormProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const merged = { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
    if (
      merged.signatureDataUrl
      && (merged.signatureDataUrl.startsWith("data:image/svg") || merged.signatureDataUrl.includes("stroke-linecap"))
    ) {
      merged.signatureDataUrl = null;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveFormProfile(patch: Partial<FormProfile>) {
  const next = { ...loadFormProfile(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function formatSignDate(d = new Date()): string {
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

export function profileKeyForField(fieldId: string): keyof FormProfile | null {
  if (fieldId === "signature") return "signatureDataUrl";
  if (fieldId === "idPhoto") return "photoDataUrl";
  if (fieldId === "signDate") return null;
  if (fieldId in DEFAULT_PROFILE) return fieldId as keyof FormProfile;
  return null;
}

export function saveFieldToProfile(fieldId: string, value: string): FormProfile | null {
  const key = profileKeyForField(fieldId);
  if (!key) return null;
  return saveFormProfile({ [key]: value });
}

export function clearFieldInProfile(fieldId: string): FormProfile | null {
  const key = profileKeyForField(fieldId);
  if (!key) return null;
  const defaultVal = DEFAULT_PROFILE[key];
  return saveFormProfile({ [key]: defaultVal ?? null });
}

export function resetFormProfile(): FormProfile {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_PROFILE };
}

export const PROFILE_EDIT_FIELDS: Array<{ key: keyof FormProfile; label: string; multiline?: boolean }> = [
  { key: "thesisTitle", label: "论文题目" },
  { key: "name", label: "姓名" },
  { key: "studentId", label: "学号" },
  { key: "college", label: "学院" },
  { key: "major", label: "专业" },
  { key: "advisor", label: "指导教师" },
  { key: "aiToolsDeclaration", label: "AI 工具使用说明", multiline: true },
  { key: "aiDedupStatement", label: "AI 成分去重承诺", multiline: true },
  { key: "experimentDataSource", label: "实验数据来源", multiline: true },
  { key: "experimentAuthenticity", label: "试验真实性说明", multiline: true },
];

export function profileValueForField(
  fieldId: string,
  profile: FormProfile = loadFormProfile(),
): string {
  if (fieldId === "signDate") return formatSignDate();
  if (fieldId === "signature") return profile.signatureDataUrl ?? "";
  if (fieldId === "idPhoto") return profile.photoDataUrl ?? "default";
  const key = fieldId as keyof FormProfile;
  const val = profile[key];
  return typeof val === "string" ? val : "";
}

export function signatureNameForProfile(profile: FormProfile): string {
  return profile.name.trim() || DEFAULT_PROFILE.name;
}

export function canFillSignatureFromMemory(profile: FormProfile): boolean {
  return !profile.signatureDataUrl && Boolean(signatureNameForProfile(profile));
}

export function canFillPhotoFromMemory(_profile: FormProfile): boolean {
  return true;
}
