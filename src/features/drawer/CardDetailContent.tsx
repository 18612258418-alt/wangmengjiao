import { useEffect, useMemo, useState } from "react";
import { ChevronRight, FileText } from "lucide-react";
import type { CardData, InteractiveSpec } from "../../types";
import { OriginalImageOverlay } from "../../shared/OriginalImageViewer";
import { OriginalSourceOverlay } from "../../shared/OriginalSourceViewer";
import { KnowledgeTree } from "../../shared/KnowledgeTree";
import { InteractiveBlock } from "../interactive/InteractiveBlock";
import { generateInteractionPlan, generateInteractiveCode } from "../../utils/interactiveGeneration";

function interactionSuitable(card: CardData) {
  if (card.sourceDocument) return false;
  const explicit = card.learningContext?.capabilities?.interactive;
  if (typeof explicit === "boolean") return explicit;
  if (card.interactiveSpec) return true;
  const text = [
    card.title,
    card.overview,
    card.detailIntro,
    ...(card.aiKeyPoints ?? []),
  ].filter(Boolean).join(" ");
  const dynamicSkill = card.skill === "math_problem" || card.skill === "experiment_lab" || card.skill === "code_cs";
  const dynamicContent = /(变化|调节|拖动|参数|变量|函数|曲线|实验|仿真|算法|积分|导数|概率分布|受力|电路|磁场|运动)/.test(text);
  const physicsProcess = /(受力|运动|速度|加速度|能量|动量|引力|卫星|轨道|电场|电势|磁场|电磁|感应|光电|波|振动|电路|变压器)/.test(text);
  return dynamicContent && (dynamicSkill || physicsProcess);
}

function isPhysicsProcess(card: CardData) {
  const text = [card.title, card.overview, card.detailIntro, ...(card.aiKeyPoints ?? [])].filter(Boolean).join(" ");
  return /(受力|运动|速度|加速度|能量|动量|引力|卫星|轨道|电场|电势|磁场|电磁|感应|光电|波|振动|电路|变压器)/.test(text);
}

function studyActivity(card: CardData): "reading" | "steps" | "expression" | "recall" {
  if (card.sourceDocument) return "reading";
  if (card.skill === "language" || card.skill === "literature_essay") return "expression";
  const text = [card.title, card.detailIntro, ...(card.aiKeyPoints ?? [])].filter(Boolean).join(" ");
  if (/(步骤|流程|方法|制作|判断|解题|操作)/.test(text)) return "steps";
  return "recall";
}

export function CardDetailContent({
  card,
  exportRef,
  onUpdateCard,
}: {
  card: CardData;
  unifiedContent?: string;
  onUpdateCard?: (cardId: string, updates: Partial<CardData>) => void;
  exportRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [showOriginalImage, setShowOriginalImage] = useState(false);
  const [showOriginalSource, setShowOriginalSource] = useState(false);
  const [interactiveSpec, setInteractiveSpec] = useState<InteractiveSpec | null>(card.interactiveSpec ?? null);
  const [generatingInteraction, setGeneratingInteraction] = useState(false);
  const [interactionMessage, setInteractionMessage] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const knowledgeNodes = useMemo(
    () => card.knowledgeTree?.length
      ? card.knowledgeTree
      : (card.aiKeyPoints ?? []).map((label, index) => ({
          label,
          level: index === 0 ? 0 : 1,
          current: index === 0,
        })),
    [card],
  );
  const showKnowledgeMap = (card.learningContext?.capabilities?.knowledgeMap ?? knowledgeNodes.length > 1)
    && knowledgeNodes.length > 1;
  const showInteraction = interactionSuitable(card);
  const activity = studyActivity(card);

  useEffect(() => {
    setShowOriginalImage(false);
    setShowOriginalSource(false);
    setInteractiveSpec(card.interactiveSpec ?? null);
    setGeneratingInteraction(false);
    setInteractionMessage("");
    setActivityOpen(false);
  }, [card.id]);

  const createInteraction = async () => {
    if (generatingInteraction) return;
    setGeneratingInteraction(true);
    setInteractionMessage("");
    try {
      const proposedPlan = await generateInteractionPlan([card]);
      const plan = isPhysicsProcess(card) && /机械能|动量|碰撞|弹簧/.test(card.title)
        ? {
            ...proposedPlan,
            suitable: true,
            interactionType: "physics_sim" as const,
            renderStrategy: "canvas_animation" as const,
            learningGoal: "调节小球初速度与弹簧劲度系数，观察碰撞前后动量、动能和弹性势能的变化。",
            controls: [
              { key: "position", label: "振子位置", min: -5, max: 5, step: 0.1, default: 0, unit: "cm" },
            ],
            outputs: ["势能", "动能"],
            visualMetaphor: "拖动振子位置，观察抛物线上的状态点以及动能、势能之间的转换。",
            sceneDescription: "1) 逻辑画布 760×280，CSS 宽度 100%，左右安全边距各 55px。2) 中央绘制简洁的 U 形势能曲线，横轴为位置 x，纵轴为能量 E；左侧用小弹簧图标提示振子。3) position 控制曲线上的蓝色状态点左右移动。4) 用一条水平虚线表示总机械能。5) 画布下只显示势能与动能两个紧凑结果；不显示标题、播放按钮、重置按钮或额外说明。",
            fallbackMode: "step_cards" as const,
          }
        : proposedPlan;
      if (!plan.suitable) {
        setInteractionMessage("这条内容用图文理解更清楚，暂不生成互动实验。");
        return;
      }
      const spec = await generateInteractiveCode([card], plan);
      setInteractiveSpec(spec);
      onUpdateCard?.(card.id, { interactiveSpec: spec });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error("[interactive] generation failed", error);
      setInteractionMessage("互动实验生成连接已中断，请再试一次。");
    } finally {
      setGeneratingInteraction(false);
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div ref={exportRef} className="flex-1 overflow-y-auto px-6 pb-8 pt-4">
        <div className="space-y-4">
          {card.sourceDocument?.type === "pdf" ? (
            <button
              type="button"
              onClick={() => setShowOriginalSource(true)}
              className="group block w-full overflow-hidden rounded-2xl border border-[#EAEDF2] bg-[#EEF0F4] p-4 text-left transition-colors hover:border-[#C9CFFF]"
              aria-label="预览 PDF 原文"
            >
              <span className="mx-auto block min-h-[230px] max-w-[390px] bg-white px-8 py-7 shadow-[0_3px_14px_rgba(15,23,42,0.12)] transition-transform group-hover:scale-[1.01]">
                <span className="block text-center text-[8px] tracking-[0.2em] text-[#AAB1C2]">PDF 文档</span>
                <span className="mt-3 block text-center text-[15px] font-bold leading-6 text-[#111827]">{card.sourceDocument.title}</span>
                {card.sourceDocument.author && (
                  <span className="mt-2 block text-center text-[9px] text-[#9CA3AF]">
                    {card.sourceDocument.author}{card.sourceDocument.publishedAt ? ` · ${card.sourceDocument.publishedAt}` : ""}
                  </span>
                )}
                <span className="mt-5 block space-y-2">
                  {(card.sourceDocument.paragraphs ?? []).slice(0, 2).map((paragraph, index) => (
                    <span key={index} className="block line-clamp-2 text-[9px] leading-4 text-[#596170]">{paragraph}</span>
                  ))}
                </span>
                <span className="mt-5 block text-center text-[8px] text-[#B0B5C0]">
                  {card.sourceDocument.page ? `— 第 ${card.sourceDocument.page} 页 —` : "— 原文预览 —"}
                </span>
              </span>
              <span className="mt-3 flex items-center justify-center gap-1 text-[10px] font-semibold text-[#4D5CFF]">
                点击预览 PDF <ChevronRight size={13} />
              </span>
            </button>
          ) : card.sourceDocument ? (
            <button
              type="button"
              onClick={() => setShowOriginalSource(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-[#EAEDF2] bg-white p-4 text-left transition-colors hover:border-[#C9CFFF] hover:bg-[#FAFAFF]"
            >
              <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-[#EEF0FF] text-[#4D5CFF]">
                <FileText size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-bold text-[#020418]">{card.sourceDocument.title}</span>
                <span className="mt-1 block text-[10px] text-[#7B8291]">
                  {card.sourceDocument.type === "pptx"
                    ? `PPT 课件 · ${card.sourceDocument.pageCount ?? card.sourceDocument.pages?.length ?? 0} 页${card.sourceDocument.page ? ` · 定位 P${card.sourceDocument.page}` : ""}`
                    : "网页原文"}
                </span>
              </span>
              <span className="text-[10px] font-semibold text-[#4D5CFF]">
                {card.sourceDocument.type === "pptx" ? "查看课件" : "打开原文"}
              </span>
              <ChevronRight size={14} className="text-[#AAB1C2]" />
            </button>
          ) : card.img ? (
            <button
              type="button"
              onClick={() => setShowOriginalImage(true)}
              className="group block w-full overflow-hidden rounded-2xl border border-[#EAEDF2] bg-[#F7F8FA]"
              aria-label="预览笔记图片"
            >
              <img src={card.img} alt={card.title} className="max-h-[300px] w-full object-contain transition-transform group-hover:scale-[1.01]" />
              <span className="block border-t border-[#EAEDF2] bg-white px-4 py-2.5 text-right text-[10px] font-semibold text-[#4D5CFF]">
                点击查看大图
              </span>
            </button>
          ) : null}

          <section className="rounded-2xl border border-[#EAEDF2] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[12px] font-bold text-[#020418]">笔记重点</h2>
              <span className="text-[9px] text-[#9CA3AF]">仅整理这条笔记</span>
            </div>
            {(card.detailIntro || card.overview) && (
              <p className="mt-2 text-[11px] leading-6 text-[#596170]">{card.detailIntro ?? card.overview}</p>
            )}
            {card.aiKeyPoints && card.aiKeyPoints.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {card.aiKeyPoints.map(point => (
                  <span key={point} className="rounded-lg bg-[#F2F4F8] px-2.5 py-1.5 text-[10px] text-[#41464F]">{point}</span>
                ))}
              </div>
            )}
            {card.detailSections && card.detailSections.length > 0 && (
              <div className="mt-4 space-y-3 border-t border-[#EEF0F4] pt-3">
                {card.detailSections.map((section, sectionIndex) => (
                  <div key={`${section.title}-${sectionIndex}`}>
                    <p className="text-[10px] font-semibold text-[#41464F]">{section.title}</p>
                    <ul className="mt-1.5 space-y-1">
                      {section.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex gap-2 text-[10px] leading-5 text-[#596170]">
                          <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-[#AAB1C2]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          {showKnowledgeMap && (
            <section className="rounded-2xl border border-[#EAEDF2] bg-white p-4">
              <h2 className="text-[12px] font-bold text-[#020418]">知识导图</h2>
              <p className="mt-1 text-[10px] text-[#9CA3AF]">展示这条笔记内部的概念关系</p>
              <div className="mt-3 rounded-xl bg-[#F8FAFB] p-3">
                <KnowledgeTree nodes={knowledgeNodes} />
              </div>
            </section>
          )}

          {showInteraction && (
            <section className="rounded-2xl border border-[#E2E5FF] bg-[#F9F9FF] p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[12px] font-bold text-[#020418]">互动实验</h2>
                {interactiveSpec && (
                  <button
                    type="button"
                    onClick={() => {
                      setInteractiveSpec(null);
                      void createInteraction();
                    }}
                    className="rounded-lg bg-[#EEF0FF] px-3 py-1.5 text-[9px] font-semibold text-[#4D5CFF]"
                  >
                    重新生成
                  </button>
                )}
              </div>
              <p className="mt-1 text-[10px] text-[#7B8291]">通过改变参数或步骤，验证这条笔记中的规律。</p>
              {interactiveSpec ? (
                <div className="mt-3 overflow-hidden rounded-xl bg-white">
                  <InteractiveBlock spec={interactiveSpec} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={createInteraction}
                  disabled={generatingInteraction}
                  className="mt-3 rounded-xl bg-[#EEF0FF] px-4 py-2.5 text-[10px] font-semibold text-[#4D5CFF] disabled:opacity-60"
                >
                  {generatingInteraction ? "正在准备互动实验…" : "打开互动实验"}
                </button>
              )}
              {interactionMessage && <p className="mt-2 text-[10px] text-[#7B8291]">{interactionMessage}</p>}
            </section>
          )}

          {!showInteraction && activity === "reading" && (
            <section className="rounded-2xl border border-[#E4E8F0] bg-[#FAFAFC] p-4">
              <h2 className="text-[12px] font-bold text-[#020418]">阅读检查</h2>
              <p className="mt-1 text-[10px] text-[#7B8291]">读完原文后，用下面三个问题检查是否抓住重点。</p>
              <div className="mt-3 space-y-2">
                {["这份资料主要回答了什么问题？", "最重要的结论是什么？", "哪一处需要回到课堂或教材继续确认？"].map((question, index) => (
                  <label key={question} className="flex cursor-pointer items-start gap-2 rounded-xl bg-white p-3 text-[10px] leading-5 text-[#596170]">
                    <input type="checkbox" className="mt-1 accent-[#4D5CFF]" />
                    <span>{index + 1}. {question}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {!showInteraction && activity === "steps" && (
            <section className="rounded-2xl border border-[#E4E8F0] bg-[#FAFAFC] p-4">
              <h2 className="text-[12px] font-bold text-[#020418]">按步骤复述</h2>
              <p className="mt-1 text-[10px] text-[#7B8291]">先不看笔记，按顺序说出这个方法的关键步骤。</p>
              <button
                type="button"
                onClick={() => setActivityOpen(open => !open)}
                className="mt-3 rounded-xl bg-[#EEF0FF] px-4 py-2.5 text-[10px] font-semibold text-[#4D5CFF]"
              >
                {activityOpen ? "收起提示" : "查看步骤提示"}
              </button>
              {activityOpen && (
                <ol className="mt-3 space-y-2 rounded-xl bg-white p-3">
                  {(card.detailSections?.flatMap(section => section.items).slice(0, 4) ?? card.aiKeyPoints ?? []).map((item, index) => (
                    <li key={`${item}-${index}`} className="text-[10px] leading-5 text-[#596170]">{index + 1}. {item}</li>
                  ))}
                </ol>
              )}
            </section>
          )}

          {!showInteraction && activity === "expression" && (
            <section className="rounded-2xl border border-[#E4E8F0] bg-[#FAFAFC] p-4">
              <h2 className="text-[12px] font-bold text-[#020418]">表达练习</h2>
              <p className="mt-2 text-[10px] leading-5 text-[#596170]">
                合上笔记，用自己的话概括“{card.title.replace(/^记忆：/, "")}”，并补充一个例子或反例。
              </p>
              <textarea
                aria-label="输入表达练习"
                placeholder="在这里写下你的理解…"
                className="mt-3 min-h-24 w-full resize-none rounded-xl border border-[#DDE1EA] bg-white p-3 text-[10px] leading-5 text-[#41464F] outline-none focus:border-[#AEB7FF]"
              />
            </section>
          )}

          {!showInteraction && activity === "recall" && (
            <section className="rounded-2xl border border-[#E4E8F0] bg-[#FAFAFC] p-4">
              <h2 className="text-[12px] font-bold text-[#020418]">快速自测</h2>
              <p className="mt-2 text-[10px] font-semibold leading-5 text-[#41464F]">
                不看笔记，你能用两句话解释“{card.title.replace(/^记忆：/, "")}”吗？
              </p>
              <button
                type="button"
                onClick={() => setActivityOpen(open => !open)}
                className="mt-3 rounded-xl bg-[#EEF0FF] px-4 py-2.5 text-[10px] font-semibold text-[#4D5CFF]"
              >
                {activityOpen ? "隐藏参考" : "查看参考"}
              </button>
              {activityOpen && (
                <p className="mt-3 rounded-xl bg-white p-3 text-[10px] leading-5 text-[#596170]">
                  {card.detailIntro ?? card.overview ?? card.aiKeyPoints?.join("、")}
                </p>
              )}
            </section>
          )}

        </div>
      </div>

      {card.img && (
        <OriginalImageOverlay
          open={showOriginalImage}
          onClose={() => setShowOriginalImage(false)}
          src={card.img}
          alt={card.title}
        />
      )}
      {card.sourceDocument && (
        <OriginalSourceOverlay
          open={showOriginalSource}
          onClose={() => setShowOriginalSource(false)}
          source={card.sourceDocument}
        />
      )}
    </div>
  );
}
