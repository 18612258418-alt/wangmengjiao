import type { CardData, FeedGroup } from "../types";

type RecordingVisual = {
  subject: string;
  icon: "physics" | "math" | "chemistry" | "english";
  accent: string;
  soft: string;
};

function recordingPlaceholder({ subject, icon, accent, soft }: RecordingVisual) {
  const iconSvg = icon === "physics"
    ? `<g fill="none" stroke="${accent}" stroke-width="2"><ellipse cx="46" cy="42" rx="15" ry="6"/><ellipse cx="46" cy="42" rx="15" ry="6" transform="rotate(60 46 42)"/><ellipse cx="46" cy="42" rx="15" ry="6" transform="rotate(120 46 42)"/><circle cx="46" cy="42" r="2.5" fill="${accent}" stroke="none"/></g>`
    : icon === "math"
      ? `<path d="M34 49c5-1 7-5 8-14 1-7 4-10 10-9m-16 16h16" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>`
      : icon === "chemistry"
        ? `<path d="M41 27h10m-7 0v8L36 50c-2 4 1 7 5 7h10c4 0 7-3 5-7l-8-15v-8m-8 21h12" fill="none" stroke="${accent}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<text x="46" y="49" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${accent}">Aa</text>`;
  const bars = [18, 32, 48, 28, 58, 38, 68, 42, 54, 26, 44, 20]
    .map((height, index) => {
      const x = 77 + index * 15;
      const y = 104 - height / 2;
      return `<rect x="${x}" y="${y}" width="7" height="${height}" rx="3.5" fill="${accent}" opacity="${0.46 + (index % 4) * 0.14}"/>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
    <rect width="320" height="200" rx="30" fill="${soft}"/>
    <circle cx="46" cy="42" r="22" fill="white" fill-opacity=".82"/>
    ${iconSvg}
    <text x="76" y="47" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#252A36">${subject}</text>
    ${bars}
    <circle cx="270" cy="104" r="25" fill="${accent}"/>
    <path d="M270 89v18m-8-8v7a8 8 0 0 0 16 0v-7m-8 15v6m-7 0h14" fill="none" stroke="white" stroke-width="3.2" stroke-linecap="round"/>
    <text x="28" y="168" font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="#6F7685">课堂录音</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const RECORDING_PLACEHOLDERS = {
  physics: recordingPlaceholder({ subject: "大学物理", icon: "physics", accent: "#5868F7", soft: "#EEF0FF" }),
  math: recordingPlaceholder({ subject: "高等数学", icon: "math", accent: "#8B5CF6", soft: "#F3EEFF" }),
  chemistry: recordingPlaceholder({ subject: "大学化学", icon: "chemistry", accent: "#16A085", soft: "#EAF8F4" }),
  english: recordingPlaceholder({ subject: "大学英语", icon: "english", accent: "#E07A3F", soft: "#FFF1E8" }),
} as const;

export function recordingPlaceholderFor(subjectId: string, text = "") {
  if (subjectId in RECORDING_PLACEHOLDERS) return RECORDING_PLACEHOLDERS[subjectId as keyof typeof RECORDING_PLACEHOLDERS];
  if (/数学|积分|数列|函数/.test(text)) return RECORDING_PLACEHOLDERS.math;
  if (/化学|电池|反应|分子/.test(text)) return RECORDING_PLACEHOLDERS.chemistry;
  if (/英语|听力|英文|写作/.test(text)) return RECORDING_PLACEHOLDERS.english;
  return RECORDING_PLACEHOLDERS.physics;
}

function recordingCard(
  id: string,
  title: string,
  img: string,
  time: string,
  durationSeconds: number,
  overview: string,
  sections: CardData["detailSections"],
  anchors: NonNullable<CardData["sourceDocument"]>["audioKnowledgePoints"],
): CardData {
  const knowledgePoints = anchors?.map((point, index) => {
    const segmentCount = point.kind === "concept" || !point.kind ? 2 : 1;
    return {
      ...point,
      transcriptSegmentIds: Array.from({ length: segmentCount }, (_, partIndex) => `segment_${id}_${index + 1}_${partIndex + 1}`),
    };
  });
  const transcriptSegments = knowledgePoints?.flatMap((point, index) => {
    const span = Math.max(12, point.endTime - point.startTime);
    const firstEnd = Math.min(point.endTime, point.startTime + Math.max(18, Math.round(span * .38)));
    const secondStart = Math.min(point.endTime, point.startTime + Math.max(28, Math.round(span * .68)));
    const speakerIsStudent = point.kind === "task";
    const common = {
      speakerId: speakerIsStudent ? "student_1" : "teacher",
      speakerName: speakerIsStudent ? "学生 1" : "老师",
      speakerRole: speakerIsStudent ? "student" as const : "teacher" as const,
    };
    const primary = {
      id: `segment_${id}_${index + 1}_1`,
      startTime: point.startTime,
      endTime: firstEnd,
      text: point.summary,
      label: point.kind === "task" ? "任务说明" : point.kind === "emphasis" ? "老师强调" : "首次讲解",
      ...common,
    };
    if ((point.transcriptSegmentIds?.length ?? 0) < 2) return [primary];
    return [primary, {
      id: `segment_${id}_${index + 1}_2`,
      startTime: secondStart,
      endTime: point.endTime,
      text: `${point.title}的补充说明与课堂示例。`,
      label: "课堂示例",
      ...common,
    }];
  });
  return {
    id,
    title: `记忆：${title}`,
    img,
    source: "voice",
    time,
    contentType: "note",
    unread: true,
    overview,
    detailIntro: overview,
    detailSections: sections,
    sourceAnchor: { kind: "voice", fileId: id, fileName: title },
    sourceDocument: {
      type: "voice",
      title,
      durationSeconds,
      excerpt: "课堂录音的完整转写与原始音频",
      paragraphs: [overview],
      audioKnowledgePoints: knowledgePoints,
      transcriptSegments,
    },
  };
}

export const RECORDING_SEED_PATCH: Record<string, FeedGroup[]> = {
  physics: [{
    date: "20260924", label: "新增了1个记忆", summary: "本节围绕简谐振动方程、旋转矢量法与同频振动叠加展开，重点说明相位关系和合振幅计算。",
    cards: [recordingCard("voice_demo_physics", "机械振动课堂录音", RECORDING_PLACEHOLDERS.physics, "10:24", 2542, "梳理简谐振动方程、旋转矢量法与同频振动叠加的核心关系。", [
      { title: "核心内容", items: ["简谐振动的位移、振幅、角频率与初相", "用旋转矢量理解相位差和振动叠加"] },
    ], [
      { id: "phy_k1", title: "简谐振动的基本方程", summary: "x(t)=A·cos(ωt+φ₀)，振幅、角频率和初相共同决定运动状态。", startTime: 198, endTime: 666, kind: "concept" },
      { id: "phy_k2", title: "旋转矢量法", summary: "用匀速圆周运动在坐标轴上的投影解释简谐振动。", startTime: 1122, endTime: 1455, kind: "concept" },
      { id: "phy_k3", title: "同频振动叠加", summary: "合振幅由各振动的振幅与相位差共同决定。", startTime: 1866, endTime: 2302, kind: "concept" },
      { id: "phy_e1", title: "老师强调：先比较相位差", summary: "同频叠加计算前必须先判断相位差，不能直接相加振幅。", startTime: 2202, endTime: 2268, kind: "emphasis" },
      { id: "phy_t1", title: "课后任务：完成合成振动练习", summary: "完成 π/3 相位差的两列振动合成题。", startTime: 2412, endTime: 2463, kind: "task" },
    ])],
  }],
  math: [{
    date: "20260923", label: "新增了1个记忆", summary: "本节讲解换元积分的识别方法与计算步骤，重点区分凑微分和三角换元的使用条件。",
    cards: [recordingCard("voice_demo_math", "换元积分课堂录音", RECORDING_PLACEHOLDERS.math, "16:40", 2186, "从复合函数结构出发，区分凑微分与三角换元的使用场景。", [
      { title: "核心内容", items: ["识别 f(g(x))·g'(x) 结构", "根据根式形式选择三角换元"] },
    ], [
      { id: "math_k1", title: "第一换元法", summary: "从复合函数结构识别凑微分条件。", startTime: 286, endTime: 732, kind: "concept" },
      { id: "math_k2", title: "三角换元", summary: "根据根式形式选择正弦或正切换元。", startTime: 1034, endTime: 1580, kind: "concept" },
    ])],
  }],
  chemistry: [{
    date: "20260922", label: "新增了1个记忆", summary: "本节对比原电池与电解池，讲解电极名称、电子流向和氧化还原反应的判断方法。",
    cards: [recordingCard("voice_demo_chemistry", "电化学课堂录音", RECORDING_PLACEHOLDERS.chemistry, "14:10", 1948, "对比原电池和电解池，归纳电极名称、电子流向与氧化还原反应。", [
      { title: "核心内容", items: ["先判断装置类型，再判断电极", "阳极发生氧化，阴极发生还原"] },
    ], [
      { id: "chem_k1", title: "原电池电极判断", summary: "负极发生氧化，正极发生还原。", startTime: 238, endTime: 692, kind: "concept" },
      { id: "chem_k2", title: "电解池电极判断", summary: "阳极发生氧化，阴极发生还原。", startTime: 936, endTime: 1485, kind: "concept" },
    ])],
  }],
  english: [{
    date: "20260921", label: "新增了1个记忆", summary: "本节讲解学术听力中的信号词和长句拆解方法，帮助定位转折、因果与举例信息。",
    cards: [recordingCard("voice_demo_english", "学术听力课堂录音", RECORDING_PLACEHOLDERS.english, "09:35", 2315, "通过转折、因果和举例信号词定位关键信息，并拆分长难句主干。", [
      { title: "核心内容", items: ["用 discourse markers 预判信息关系", "先抓主谓，再补充从句细节"] },
    ], [
      { id: "eng_k1", title: "听力信号词", summary: "通过转折、因果和举例信号词预测信息关系。", startTime: 205, endTime: 755, kind: "concept" },
      { id: "eng_k2", title: "长句主干定位", summary: "先识别主谓结构，再补充从句细节。", startTime: 1015, endTime: 1692, kind: "concept" },
    ])],
  }],
};

export const RECORDING_SEED_PATCH_KEY = "seed-patch-v1-subject-recordings";
export const RECORDING_ANCHOR_PATCH_KEY = "seed-patch-v2-recording-anchors";

export const RECORDING_SEED_CARDS_BY_ID = Object.fromEntries(
  Object.values(RECORDING_SEED_PATCH)
    .flat()
    .flatMap(group => group.cards)
    .map(card => [card.id, card]),
) as Record<string, CardData>;
