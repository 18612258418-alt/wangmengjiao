import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import type { CardData, ExerciseDifficulty, ExerciseSet, FeedGroup, GeneratedModule, HardPointSection, QuizBlueprint, QuizQuestion, SubjectData } from "../../types";
import { callTextStreamed } from "../../utils/api";
import { extractJsonObject, parseJsonLoose } from "../../utils/json";
import {
  buildHardPointPrompt,
  buildMindmapPrompt,
  buildQuizBlueprintPrompt,
  buildQuizPrompt,
  toExercisePromptNotes,
} from "../../prompts/exercise";
import { QuizQuestionBlock } from "../exercise/QuizQuestionBlock";
import { MindmapBlock } from "../exercise/MindmapBlock";
import { HardPointBlock } from "../exercise/HardPointBlock";
import { appearsInNotesTab } from "../../utils/cardSurfaces";

type DrawerPhase = "selecting" | "result";

type ModuleKey = "quiz" | "mindmap" | "hardPoint";

const MODULES: Array<{ key: ModuleKey; label: string; desc: string }> = [
  { key: "quiz", label: "练习题", desc: "选择/判断/简答" },
  { key: "mindmap", label: "思维导图", desc: "知识结构化" },
  { key: "hardPoint", label: "难点讲解", desc: "卡点拆解" },
];

const SKILL_LABELS: Record<string, string> = {
  theory_concept: "概念原理",
  math_problem: "计算推导",
  language: "语言学习",
  experiment_lab: "实验科学",
  code_cs: "计算机",
  literature_essay: "人文社科",
};

function skillLabel(skill?: string): string {
  return SKILL_LABELS[skill ?? "theory_concept"] ?? "其他";
}

function flattenNotes(feedGroups: FeedGroup[]): Array<{ card: CardData; date: string }> {
  const result: Array<{ card: CardData; date: string }> = [];
  for (const group of feedGroups) {
    for (const card of group.cards) {
      if (!appearsInNotesTab(card)) continue;
      result.push({ card, date: group.date });
    }
  }
  return result;
}

function parseBlueprint(text: string): QuizBlueprint | null {
  try {
    const json = extractJsonObject(text);
    if (!json) return null;
    const parsed = parseJsonLoose<{ examPoints?: QuizBlueprint["examPoints"] }>(json);
    if (!Array.isArray(parsed.examPoints) || parsed.examPoints.length === 0) return null;
    return { examPoints: parsed.examPoints };
  } catch {
    return null;
  }
}

function fallbackQuestions(cards: CardData[], count: number, difficulty: ExerciseDifficulty): QuizQuestion[] {
  const base = cards.length > 0 ? cards : [{ id: "note", title: "当前知识点", aiKeyPoints: [] } as CardData];
  return Array.from({ length: count }).map((_, index) => {
    const card = base[index % base.length];
    const point = card.aiKeyPoints?.[0] ?? card.title.replace(/^记忆：/, "");
    return {
      id: `q${index + 1}`,
      type: "single_choice",
      difficulty,
      stem: `结合「${card.title.replace(/^记忆：/, "")}」，以下哪一项最能体现 ${point} 的关键应用？`,
      options: [
        `A. 先识别适用条件，再选择对应公式或方法。`,
        `B. 只背诵结论，不需要理解推导过程。`,
        `C. 遇到同类题时直接套用任意公式。`,
        `D. 忽略题目边界条件，优先计算数值。`,
      ],
      answer: "A",
      explanation: "正确做法是先判断知识点的适用条件，再选择对应方法。B、C、D 都忽略了题目条件与推理过程，容易造成机械套公式。",
      knowledgePoints: [point],
      crossNotes: [card.id],
    };
  });
}

/** 解析出题结果。失败时直接抛出带原始片段的错误，由调用方决定是否回退并展示原因（不再静默套模板）。 */
function parseQuizModule(text: string, count: number, difficulty: ExerciseDifficulty): GeneratedModule {
  const snippet = text.slice(0, 280) || "(空)";
  const json = extractJsonObject(text);
  if (!json) throw new Error(`AI 返回中未找到 JSON。原始片段：${snippet}`);
  let parsed: { questions?: QuizQuestion[] };
  try {
    parsed = parseJsonLoose<{ questions?: QuizQuestion[] }>(json);
  } catch (e) {
    // 修复转义后仍失败，多半是输出被截断导致 JSON 不完整
    throw new Error(`JSON 解析失败（可能被截断）：${(e as Error).message}。末尾片段：${json.slice(-200)}`);
  }
  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error(`解析成功但 questions 为空。片段：${snippet}`);
  }
  const questions = parsed.questions.slice(0, count).map((q, index) => ({
    ...q,
    id: q.id || `q${index + 1}`,
    difficulty: q.difficulty || difficulty,
    options: Array.isArray(q.options) ? q.options : [],
  }));
  return { kind: "quiz", questions };
}

function parseHardPointSections(text: string): HardPointSection[] {
  const sections: HardPointSection[] = [];
  const matches = [...text.matchAll(/【([^】]+)】\s*([\s\S]*?)(?=【[^】]+】|$)/g)];
  for (const match of matches) {
    const title = match[1]?.trim();
    const content = match[2]?.trim();
    if (title && content) sections.push({ title, content });
  }
  return sections.length > 0
    ? sections
    : [{ title: "难点讲解", content: text.trim() || "暂未生成难点讲解，请稍后重试。" }];
}

function normalizeMindmap(text: string): string {
  return text.replace(/```mermaid/g, "").replace(/```/g, "").trim();
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EAEDF2] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[#4D5CFF]">
        <Loader2 size={15} className="animate-spin" />
        <span className="text-[13px]" style={{ fontWeight: 700 }}>{label}生成中...</span>
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="h-3 rounded-full bg-[#E9ECF2]" style={{ width: i === 3 ? "70%" : "100%" }} />
      ))}
    </div>
  );
}

const DIFF_LABEL: Record<ExerciseDifficulty, string> = { basic: "基础", advanced: "进阶", challenge: "挑战" };
const QTYPE_LABEL: Record<string, string> = { single_choice: "选择", true_false: "判断", short_answer: "简答" };

function BlueprintBlock({ blueprint }: { blueprint: QuizBlueprint }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EAEDF2] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-4 rounded-full bg-[#4D5CFF]" />
        <p className="text-[13px] text-[#020418]" style={{ fontWeight: 700 }}>命题蓝图</p>
        <span className="text-[11px] text-[#9CA3AF]">先规划考点，再据此出题</span>
      </div>
      <div className="flex flex-col gap-2">
        {blueprint.examPoints.map((p, i) => (
          <div key={i} className="flex items-start gap-2.5 rounded-xl bg-[#F8FAFB] border border-[#EEF0F4] px-3 py-2">
            <span className="text-[12px] text-[#4D5CFF] mt-0.5" style={{ fontWeight: 700 }}>{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[13px] text-[#020418]" style={{ fontWeight: 600 }}>{p.point}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#EEF0FF] text-[#4D5CFF]">{QTYPE_LABEL[p.type] ?? p.type}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FFF7ED] text-[#F97316]">{DIFF_LABEL[p.difficulty] ?? p.difficulty}</span>
              </div>
              {p.rationale && <p className="text-[11px] text-[#7B8291] mt-1 line-clamp-2">{p.rationale}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GenerateDrawer({
  isOpen,
  subject,
  feedGroups,
  presetSelectedIds,
  onClose,
  onCreateExerciseSet,
}: {
  isOpen: boolean;
  subject: SubjectData;
  feedGroups: FeedGroup[];
  presetSelectedIds?: string[];
  onClose: () => void;
  onCreateExerciseSet: (exerciseSet: ExerciseSet) => void;
}) {
  const notes = useMemo(() => flattenNotes(feedGroups), [feedGroups]);
  const [phase, setPhase] = useState<DrawerPhase>("selecting");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<ExerciseDifficulty>("advanced");
  const [questionCount, setQuestionCount] = useState(5);
  const [activeModule, setActiveModule] = useState<ModuleKey>("quiz");

  // 渐进式生成状态
  const [blueprint, setBlueprint] = useState<QuizBlueprint | null>(null);
  const [blueprintLoading, setBlueprintLoading] = useState(false);
  const [moduleResults, setModuleResults] = useState<Partial<Record<ModuleKey, GeneratedModule>>>({});
  const [moduleLoading, setModuleLoading] = useState<Partial<Record<ModuleKey, boolean>>>({});
  const [moduleError, setModuleError] = useState<Partial<Record<ModuleKey, string>>>({});
  const [currentSet, setCurrentSet] = useState<ExerciseSet | null>(null);

  // 打开时按预选笔记初始化（单条笔记快速出题入口）
  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds(new Set(presetSelectedIds ?? []));
    setPhase("selecting");
    setQuery("");
  }, [isOpen, presetSelectedIds]);

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(({ card }) => {
      const hay = `${card.title} ${(card.aiKeyPoints ?? []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [notes, query]);

  // 按学习类型分组
  const groups = useMemo(() => {
    const map = new Map<string, Array<{ card: CardData; date: string }>>();
    for (const item of filteredNotes) {
      const key = item.card.skill ?? "theory_concept";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries());
  }, [filteredNotes]);

  const selectedCards = useMemo(
    () => notes.filter(item => selectedIds.has(item.card.id)).map(item => item.card),
    [notes, selectedIds],
  );

  const toggleNote = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allFilteredSelected = filteredNotes.length > 0 && filteredNotes.every(item => selectedIds.has(item.card.id));
  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredNotes.forEach(item => next.delete(item.card.id));
      } else {
        filteredNotes.forEach(item => next.add(item.card.id));
      }
      return next;
    });
  };

  const toggleGroup = (items: Array<{ card: CardData }>) => {
    const allSelected = items.every(item => selectedIds.has(item.card.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      items.forEach(item => allSelected ? next.delete(item.card.id) : next.add(item.card.id));
      return next;
    });
  };

  const reset = () => {
    setPhase("selecting");
    setBlueprint(null);
    setBlueprintLoading(false);
    setModuleResults({});
    setModuleLoading({});
    setModuleError({});
    setCurrentSet(null);
  };

  const close = () => {
    onClose();
    setTimeout(reset, 280);
  };

  const handleGenerate = async () => {
    if (selectedCards.length === 0) return;
    const cards = selectedCards;
    const promptNotes = toExercisePromptNotes(cards);
    const config = { questionCount, difficulty };

    setPhase("result");
    setBlueprint(null);
    setModuleResults({});
    setModuleLoading({});
    setModuleError({});

    const acc: Partial<Record<ModuleKey, GeneratedModule>> = {};

    // 练习题：两段式（蓝图 → 出题）
    const runQuiz = async () => {
      if (activeModule !== "quiz") return;
      setBlueprintLoading(true);
      let bp: QuizBlueprint | null = null;
      try {
        // 蓝图只是考点清单，用快模型 + 小 token，快速出结果
        bp = parseBlueprint(await callTextStreamed(buildQuizBlueprintPrompt(promptNotes, config), { model: "deepseek-v4-flash", maxTokens: 1500 }));
      } catch { /* 蓝图失败则跳过，直接出题 */ }
      setBlueprint(bp);
      setBlueprintLoading(false);

      setModuleLoading(prev => ({ ...prev, quiz: true }));
      let quizMod: GeneratedModule;
      try {
        // 流式 + 快模型出题；解析失败/截断/空内容都会抛错并在 UI 显示原因
        const raw = await callTextStreamed(buildQuizPrompt(promptNotes, config, bp ?? undefined), { model: "deepseek-v4-flash", maxTokens: 4096 });
        quizMod = parseQuizModule(raw, questionCount, difficulty);
      } catch (err) {
        // 不再静默吞错：记录真实失败原因，UI 会显示，方便定位接口/Key/超时/解析问题
        setModuleError(prev => ({ ...prev, quiz: err instanceof Error ? err.message : String(err) }));
        quizMod = { kind: "quiz", questions: fallbackQuestions(cards, questionCount, difficulty) };
      }
      acc.quiz = quizMod;
      setModuleResults(prev => ({ ...prev, quiz: quizMod }));
      setModuleLoading(prev => ({ ...prev, quiz: false }));
    };

    const runMindmap = async () => {
      if (activeModule !== "mindmap") return;
      setModuleLoading(prev => ({ ...prev, mindmap: true }));
      let mod: GeneratedModule;
      try {
        mod = { kind: "mindmap", mermaid: normalizeMindmap(await callTextStreamed(buildMindmapPrompt(promptNotes), { maxTokens: 1500 })) };
      } catch {
        mod = { kind: "mindmap", mermaid: `mindmap\n  root((${subject.short}练习))\n    核心概念\n    典型题型\n    易错提醒` };
      }
      acc.mindmap = mod;
      setModuleResults(prev => ({ ...prev, mindmap: mod }));
      setModuleLoading(prev => ({ ...prev, mindmap: false }));
    };

    const runHardPoint = async () => {
      if (activeModule !== "hardPoint") return;
      setModuleLoading(prev => ({ ...prev, hardPoint: true }));
      let mod: GeneratedModule;
      try {
        mod = { kind: "hardPoint", sections: parseHardPointSections(await callTextStreamed(buildHardPointPrompt(promptNotes), { maxTokens: 3000 })) };
      } catch {
        mod = { kind: "hardPoint", sections: [{ title: "难点讲解", content: "生成暂时失败。建议先从来源笔记的核心公式、适用条件和易错点三个角度复习。" }] };
      }
      acc.hardPoint = mod;
      setModuleResults(prev => ({ ...prev, hardPoint: mod }));
      setModuleLoading(prev => ({ ...prev, hardPoint: false }));
    };

    await Promise.allSettled([runQuiz(), runMindmap(), runHardPoint()]);

    const orderedModules = (["quiz", "mindmap", "hardPoint"] as ModuleKey[])
      .map(k => acc[k])
      .filter((m): m is GeneratedModule => Boolean(m));

    if (orderedModules.length === 0) {
      orderedModules.push({ kind: "quiz", questions: fallbackQuestions(cards, questionCount, difficulty) });
    }

    const titleBase = cards[0]?.title.replace(/^记忆：/, "") ?? subject.short;
    const exerciseSet: ExerciseSet = {
      id: `exercise_${Date.now()}`,
      title: `${subject.short} · ${titleBase}练习`,
      subjectId: subject.id,
      sourceNoteIds: cards.map(card => card.id),
      generatedAt: Date.now(),
      difficulty,
      modules: orderedModules,
      status: "untouched",
    };
    setCurrentSet(exerciseSet);
    onCreateExerciseSet(exerciseSet);
  };

  const canGenerate = selectedCards.length > 0;
  const activeModuleLabel = MODULES.find(m => m.key === activeModule)?.label ?? "练习题";

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none" }}
        onClick={close}
      />
      <div
        className="fixed top-0 right-0 bg-[#F5F6FA] z-50 shadow-[-8px_0_32px_rgba(0,0,0,0.12)] rounded-l-3xl transition-transform duration-300"
        style={{
          width: "48%",
          height: "100dvh",
          maxHeight: "100dvh",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 bg-white border-b border-[#EAEDF2] flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-[16px] text-[#020418]" style={{ fontWeight: 700 }}>AI 学习助手</p>
            <p className="text-[12px] text-[#7B8291] mt-1">{subject.short} · 选笔记，自动生成练习题等学习材料</p>
          </div>
          {phase !== "selecting" && (
            <button onClick={reset} className="text-[12px] px-3 py-1.5 rounded-lg bg-[#EEF0FF] text-[#4D5CFF]" style={{ fontWeight: 600 }}>
              重新选择
            </button>
          )}
          <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#ECECEC] hover:bg-[#E0E0E0] transition-colors">
            <X size={14} className="text-[#020418]" />
          </button>
        </div>

        {phase === "selecting" && (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
              {/* 搜索 + 全选 */}
              <div className="flex items-center gap-2 mb-4 sticky top-0 z-10">
                <div className="flex-1 flex items-center gap-2 bg-white rounded-xl border border-[#EAEDF2] px-3 py-2">
                  <Search size={15} className="text-[#9CA3AF] flex-shrink-0" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="搜索笔记标题或知识点"
                    className="flex-1 min-w-0 text-[13px] outline-none bg-transparent text-[#020418] placeholder:text-[#B0B5C0]"
                  />
                  {query && <button onClick={() => setQuery("")}><X size={13} className="text-[#9CA3AF]" /></button>}
                </div>
                <button
                  onClick={toggleSelectAll}
                  disabled={filteredNotes.length === 0}
                  className="text-[12px] px-3 py-2 rounded-xl bg-white border border-[#EAEDF2] text-[#4D5CFF] disabled:opacity-40 flex-shrink-0"
                  style={{ fontWeight: 600 }}
                >
                  {allFilteredSelected ? "取消全选" : "全选"}
                </button>
              </div>

              {filteredNotes.length === 0 ? (
                <p className="text-[13px] text-[#B0B5C0] text-center mt-16">没有匹配的笔记</p>
              ) : (
                groups.map(([skill, items]) => {
                  const groupAllSelected = items.every(item => selectedIds.has(item.card.id));
                  return (
                    <div key={skill} className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[12px] text-[#7B8291]" style={{ fontWeight: 700 }}>
                          {skillLabel(skill)} <span className="text-[#B0B5C0]">· {items.length}</span>
                        </p>
                        <button onClick={() => toggleGroup(items)} className="text-[11px] text-[#4D5CFF]" style={{ fontWeight: 600 }}>
                          {groupAllSelected ? "取消本组" : "选择本组"}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {items.map(({ card }) => {
                          const active = selectedIds.has(card.id);
                          return (
                            <button
                              key={card.id}
                              onClick={() => toggleNote(card.id)}
                              className="bg-white rounded-2xl border p-3 text-left transition-all"
                              style={{ borderColor: active ? "#4D5CFF" : "#EAEDF2", boxShadow: active ? "0 0 0 3px rgba(77,92,255,0.10)" : "none" }}
                            >
                              <div className="flex gap-3">
                                <img src={card.img} alt="" className="w-16 h-12 rounded-lg object-cover bg-[#F0F2F5] flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[13px] text-[#020418] line-clamp-2" style={{ fontWeight: 600 }}>{card.title}</p>
                                  <p className="text-[11px] text-[#9CA3AF] mt-1 line-clamp-1">{(card.aiKeyPoints ?? []).slice(0, 2).join(" · ")}</p>
                                </div>
                                <span className="w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0" style={{ borderColor: active ? "#4D5CFF" : "#D1D5DB", background: active ? "#4D5CFF" : "#fff" }}>
                                  {active && <Check size={13} className="text-white" />}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex-shrink-0 mx-5 mb-5 max-h-[55dvh] overflow-y-auto bg-white rounded-3xl border border-[#EAEDF2] shadow-[0_12px_40px_rgba(0,0,0,0.12)] p-4">
              {/* 已选 chips */}
              <div className="mb-3">
                <p className="text-[12px] text-[#7B8291] mb-1.5">已选 {selectedCards.length} 项</p>
                {selectedCards.length === 0 ? (
                  <p className="text-[13px] text-[#B0B5C0]">请选择要生成的笔记</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                    {selectedCards.map(card => (
                      <span key={card.id} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-[#EEF0FF] text-[#4D5CFF] text-[11px]" style={{ fontWeight: 600 }}>
                        <span className="max-w-32 truncate">{card.title.replace(/^记忆：/, "")}</span>
                        <button onClick={() => toggleNote(card.id)} className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-[#D6DBFF]">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3" role="radiogroup">
                {MODULES.map(item => {
                  const active = activeModule === item.key;
                  return (
                    <button
                      key={item.key}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setActiveModule(item.key)}
                      className="relative rounded-xl border px-3 py-2 text-left transition-all"
                      style={{ borderColor: active ? "#4D5CFF" : "#EAEDF2", background: active ? "#EEF0FF" : "#F8FAFB", boxShadow: active ? "0 0 0 3px rgba(77,92,255,0.10)" : "none" }}
                    >
                      <p className="text-[13px]" style={{ fontWeight: 700, color: active ? "#4D5CFF" : "#020418" }}>{item.label}</p>
                      <p className="text-[11px] text-[#7B8291] mt-0.5">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-3">
                {activeModule === "quiz" ? (
                  <div className="flex items-center gap-2">
                    {(["basic", "advanced", "challenge"] as ExerciseDifficulty[]).map(item => (
                      <button
                        key={item}
                        onClick={() => setDifficulty(item)}
                        className="px-3 py-1.5 rounded-full text-[12px]"
                        style={{ background: difficulty === item ? "#4D5CFF" : "#F5F6FA", color: difficulty === item ? "#fff" : "#7B8291", fontWeight: 600 }}
                      >
                        {DIFF_LABEL[item]}
                      </button>
                    ))}
                  <select
                    value={questionCount}
                    onChange={e => setQuestionCount(Number(e.target.value))}
                    className="appearance-none rounded-lg bg-[#F5F6FA] text-[12px] text-[#41464F] border border-[#EAEDF2]"
                    style={{
                      padding: "6px 28px 6px 10px",
                      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237B8291' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 9px center",
                    }}
                  >
                    <option value={3}>3题</option>
                    <option value={5}>5题</option>
                    <option value={10}>10题</option>
                  </select>
                  </div>
                ) : (
                  <p className="text-[12px] text-[#9CA3AF]">将基于所选 {selectedCards.length} 条笔记生成{activeModuleLabel}</p>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="px-4 py-2 rounded-xl bg-[#4D5CFF] text-white text-[13px] disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  style={{ fontWeight: 700 }}
                >
                  开始生成
                </button>
              </div>
            </div>
          </>
        )}

        {phase === "result" && (
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
            <div className="bg-[#EEF0FF] border border-[#D6DBFF] rounded-2xl p-4">
              <p className="text-[14px] text-[#4D5CFF]" style={{ fontWeight: 700 }}>{currentSet?.title ?? `${subject.short}练习生成中`}</p>
              <p className="text-[12px] text-[#7B8291] mt-1">已生成习题集，关闭抽屉后可在 AI 学习助手中查看历史记录。</p>
            </div>

            {/* 练习题：蓝图 → 题目 */}
            {activeModule === "quiz" && (
              <>
                {moduleError.quiz && (
                  <div className="bg-[#FFF1F0] border border-[#FFCCC7] rounded-2xl p-4">
                    <p className="text-[13px] text-[#CF1322]" style={{ fontWeight: 700 }}>AI 出题失败，下面是占位题</p>
                    <p className="text-[12px] text-[#A8071A] mt-1 break-all">原因：{moduleError.quiz}</p>
                  </div>
                )}
                {blueprintLoading && <LoadingBlock label="命题蓝图" />}
                {blueprint && <BlueprintBlock blueprint={blueprint} />}
                {moduleLoading.quiz && <LoadingBlock label="练习题" />}
                {moduleResults.quiz?.kind === "quiz" && (
                  <div className="flex flex-col gap-3">
                    {moduleResults.quiz.questions.map((question, qi) => (
                      <QuizQuestionBlock key={question.id} question={question} index={qi} />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeModule === "mindmap" && (
              <>
                {moduleLoading.mindmap && <LoadingBlock label="思维导图" />}
                {moduleResults.mindmap?.kind === "mindmap" && <MindmapBlock mermaid={moduleResults.mindmap.mermaid} />}
              </>
            )}

            {activeModule === "hardPoint" && (
              <>
                {moduleLoading.hardPoint && <LoadingBlock label="难点讲解" />}
                {moduleResults.hardPoint?.kind === "hardPoint" && <HardPointBlock sections={moduleResults.hardPoint.sections} />}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
