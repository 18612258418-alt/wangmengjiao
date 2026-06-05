import { useState, useEffect, Fragment } from "react";
import type { CardData, InteractiveSpec } from "../../types";
import { streamText } from "../../utils/api";
import { buildCardQuizPrompt, buildDetailPagePrompt } from "../../prompts";
import { ConceptPage, InteractiveQuiz } from "../../components/ConceptPage";
import { DynamicRenderer, ModuleBadge } from "../../shared/DynamicRenderer";
import { MathContent, MathParagraph } from "../../shared/MathContent";
import { KnowledgeTree } from "../../shared/KnowledgeTree";
import { InteractiveBlock } from "../interactive/InteractiveBlock";
import { DetailFeedbackBar } from "../../shared/DetailFeedbackBar";
import { generateInteractionPlan, generateInteractiveCode } from "../../utils/interactiveGeneration";
import {
  getSkillMeta, parseSkillSections,
  UNIFIED_SECTION_COLORS, UNIFIED_SECTION_DEFAULT,
} from "../../utils/cardDetailParsing";
import { parseSections } from "../../utils/parseSections";
import { OriginalImageOverlay, ViewOriginalImageButton } from "../../shared/OriginalImageViewer";

type InteractivePhase = "idle" | "planning" | "coding" | "ready" | "skipped" | "failed";

export function CardDetailContent({
  card, unifiedContent, onUpdateCard, exportRef,
}: {
  card: CardData;
  unifiedContent?: string;
  onUpdateCard?: (cardId: string, updates: Partial<CardData>) => void;
  exportRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const skillMeta = getSkillMeta(card.skill);
  const [activeTab, setActiveTab] = useState<"analysis" | "mindmap" | "interactive">("analysis");
  const [conceptStack, setConceptStack] = useState<Array<{ keyword: string; cardTitle: string }>>([]);
  const [quizRaw, setQuizRaw] = useState<string>("");
  const [quizLoading, setQuizLoading] = useState<boolean>(false);
  const [localUnifiedContent, setLocalUnifiedContent] = useState<string>("");
  const [generatingUnified, setGeneratingUnified] = useState<boolean>(false);
  const [localInteractiveSpec, setLocalInteractiveSpec] = useState<InteractiveSpec | null>(null);
  const [interactivePhase, setInteractivePhase] = useState<InteractivePhase>("idle");
  const [interactiveError, setInteractiveError] = useState<string>("");
  const [showOriginalImage, setShowOriginalImage] = useState(false);

  const pushConcept = (keyword: string) =>
    setConceptStack(prev => [...prev, { keyword, cardTitle: card.title }]);
  const popConcept = () => setConceptStack(prev => prev.slice(0, -1));

  const buildUnifiedPrompt = () => buildDetailPagePrompt({
    skill: card.skill ?? "theory_concept",
    title: card.title,
    hasAnnotations: card.hasAnnotations,
    overview: card.overview ?? "",
    detailIntro: card.detailIntro ?? "",
    detailSections: card.detailSections ?? [],
    aiKeyPoints: card.aiKeyPoints ?? [],
  });

  const regenerateUnified = () => {
    setGeneratingUnified(true);
    setLocalUnifiedContent("");
    let buffer = "";
    streamText(
      buildUnifiedPrompt(),
      (chunk) => { buffer += chunk; },
      () => {
        setLocalUnifiedContent(buffer);
        setGeneratingUnified(false);
        onUpdateCard?.(card.id, { unifiedDetail: buffer });
      },
    ).catch(() => setGeneratingUnified(false));
  };

  const runInteractiveGeneration = async (opts?: { force?: boolean }) => {
    setLocalInteractiveSpec(null);
    setInteractiveError("");
    setInteractivePhase("planning");
    try {
      const plan = await generateInteractionPlan([card]);
      if (!plan.suitable && !opts?.force) {
        setInteractivePhase("skipped");
        return;
      }
      const planForCode = opts?.force ? { ...plan, suitable: true } : plan;
      setInteractivePhase("coding");
      const spec = await generateInteractiveCode([card], planForCode);
      setLocalInteractiveSpec(spec);
      setInteractivePhase("ready");
      onUpdateCard?.(card.id, { interactiveSpec: spec });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setInteractiveError(message);
      setInteractivePhase("failed");
      if (typeof console !== "undefined") console.error("[interactive] generation failed", err);
    }
  };

  const regenerateInteractive = () => {
    if (interactivePhase === "planning" || interactivePhase === "coding") return;
    runInteractiveGeneration();
  };

  const forceGenerateInteractive = () => {
    if (interactivePhase === "planning" || interactivePhase === "coding") return;
    runInteractiveGeneration({ force: true });
  };

  useEffect(() => {
    setConceptStack([]);
    setActiveTab("analysis");
    setLocalUnifiedContent("");
    setLocalInteractiveSpec(null);
    setShowOriginalImage(false);
    setGeneratingUnified(false);
    setQuizRaw("");
    setQuizLoading(true);

    const quizPrompt = buildCardQuizPrompt(card.title, card.detailIntro || card.overview || "");
    streamText(quizPrompt,
      (chunk) => setQuizRaw(prev => prev + chunk),
      () => setQuizLoading(false),
    ).catch(() => setQuizLoading(false));

    if (!card.unifiedDetail) {
      regenerateUnified();
    }

    setInteractiveError("");
    // 交互演示改为「点击 tab 时」按需生成：避免与智能总结抢占 DeepSeek 接口、也省 token
    setInteractivePhase(card.interactiveSpec?.appCode ? "ready" : "idle");
  }, [card.id]);

  const effectiveUnifiedContent = localUnifiedContent || unifiedContent || "";
  const effectiveInteractiveSpec = localInteractiveSpec || card.interactiveSpec;
  const interactiveBusy = interactivePhase === "planning" || interactivePhase === "coding";

  return (
    <div style={{ position: "relative", flex: "1 1 auto", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div ref={exportRef} style={{ flex: "1 1 auto", minHeight: 0, overflowY: "scroll", scrollbarGutter: "stable" }}>
        <div style={{
          position: "sticky", top: 0, zIndex: 5,
          display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px", gap: 12,
          background: "#fff",
          borderBottom: "1px solid #F0F2F5",
        }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: 4, background: "#F5F6FA", border: "1px solid #EAEDF2", borderRadius: 14 }}>
            {([
              { key: "analysis", label: "智能总结" },
              { key: "mindmap", label: "知识脉络" },
              { key: "interactive", label: "交互演示" },
            ] as const).map(tab => {
              const isActive = activeTab === tab.key;
              const isInteractive = tab.key === "interactive";
              const showLoadingDot = isInteractive && (interactivePhase === "planning" || interactivePhase === "coding");
              const showReadyDot = isInteractive && interactivePhase === "ready" && !isActive;
              const showFailedDot = isInteractive && interactivePhase === "failed" && !isActive;
              return (
                <button key={tab.key} onClick={() => {
                  setActiveTab(tab.key);
                  if (tab.key === "interactive" && interactivePhase === "idle" && !effectiveInteractiveSpec) {
                    runInteractiveGeneration();
                  }
                }} style={{
                  width: 120,
                  height: 34,
                  padding: "0 12px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: isActive ? "#4F46E5" : "#7B8291",
                  background: isActive ? "#fff" : "transparent",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "color 0.2s, background 0.2s, box-shadow 0.2s",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                  boxShadow: isActive ? "0 1px 3px rgba(15,23,42,0.10)" : "none",
                }}>
                  {tab.label}
                  {showLoadingDot && (
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8B5CF6", animation: "shimmer 1.4s ease-in-out infinite", flexShrink: 0 }} />
                  )}
                  {showReadyDot && (
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", flexShrink: 0 }} />
                  )}
                  {showFailedDot && (
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#CBD5E1", flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
          {card.img && (
            <ViewOriginalImageButton onClick={() => setShowOriginalImage(true)} />
          )}
        </div>

        <div style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 32 }}>
        {activeTab === "analysis" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 20 }}>
            {generatingUnified && !localUnifiedContent && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ width: 90, height: 24, borderRadius: 8, background: "#E9ECF2", animation: "shimmer 1.4s ease-in-out infinite" }} />
                    <div style={{ borderRadius: 14, background: "#F7F8FA", border: "1px solid #EAEDF2", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {[1,2].map(j => <div key={j} style={{ height: 14, borderRadius: 6, background: "#E9ECF2", width: j === 2 ? "70%" : "100%", animation: "shimmer 1.4s ease-in-out infinite" }} />)}
                    </div>
                  </div>
                ))}
                <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
              </div>
            )}

            {effectiveUnifiedContent && (() => {
              const sections = parseSections(effectiveUnifiedContent);
              const chipsNode = card.aiKeyPoints && card.aiKeyPoints.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ModuleBadge label="AI 提炼重点" textColor="#4338CA" bgColor="#EEF2FF" barColor="#818CF8" />
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>点击知识点深度解析 →</span>
                  </div>
                  <div style={{ background: "#F7F8FA", border: "1px solid #EAEDF2", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                    {card.aiKeyPoints.map((point, i) => (
                      <button key={i} onClick={() => pushConcept(point)}
                        style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", background: "none", border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: 10, textAlign: "left", transition: "background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#EEF2FF")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      >
                        <div style={{ minWidth: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg, #818CF8, #6366F1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{i + 1}</span>
                        </div>
                        <span style={{ fontSize: 13, color: "#334155", flex: 1, lineHeight: 1.6 }}>{point}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {card.hasAnnotations === true && card.detailSections && card.detailSections.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <ModuleBadge label="圈选重点" textColor="#BE123C" bgColor="#FFE4E6" barColor="#FB7185" />
                      <div style={{ background: "#F7F8FA", border: "1px solid #EAEDF2", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
                        {card.detailIntro && <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.75, fontStyle: "italic", margin: 0 }}>"{card.detailIntro}"</p>}
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          {card.detailSections.map((section, si) => (
                            <div key={si}>
                              <p style={{ fontWeight: 700, fontSize: 13, color: "#BE123C", marginBottom: 8 }}>{si + 1}. {section.title}</p>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {section.items.map((item, ii) => (
                                  <div key={ii} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                    <span style={{ color: "#FB7185", fontSize: 12, marginTop: 2, flexShrink: 0 }}>▸</span>
                                    <DynamicRenderer text={item} onLinkClick={pushConcept} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {sections.map((sec, si) => {
                    const meta = UNIFIED_SECTION_COLORS[sec.title] ?? UNIFIED_SECTION_DEFAULT;
                    return (
                      <Fragment key={si}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <ModuleBadge label={sec.title} textColor={meta.textColor} bgColor={meta.bgColor} barColor={meta.barColor} />
                          <div style={{ background: "#F7F8FA", border: "1px solid #EAEDF2", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                            {sec.content.split(/\n+/).filter(Boolean).map((line, li) => (
                              <p key={li} style={{ fontSize: 13, color: "#334155", lineHeight: 1.85, margin: 0 }}><MathContent text={line} onLinkClick={pushConcept} /></p>
                            ))}
                          </div>
                        </div>
                        {si === 1 && chipsNode}
                      </Fragment>
                    );
                  })}
                  {sections.length <= 1 && chipsNode}
                </div>
              );
            })()}

            {!effectiveUnifiedContent && !generatingUnified && (<>
              {card.overview && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <ModuleBadge label="内容概述" textColor="#0369A1" bgColor="#E0F2FE" barColor="#38BDF8" />
                  <div style={{ background: "#F7F8FA", border: "1px solid #EAEDF2", borderRadius: 14, padding: "14px 16px" }}>
                    <MathParagraph text={card.overview ?? ""} onLinkClick={pushConcept} />
                  </div>
                </div>
              )}
              {card.skillRawSections && (() => {
                const skillSections = parseSkillSections(card.skillRawSections!);
                if (skillSections.length === 0) return null;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ModuleBadge label={`${skillMeta.emoji} ${skillMeta.label}深度解析`} textColor={skillMeta.textColor} bgColor={skillMeta.bgColor} barColor={skillMeta.barColor} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {skillSections.map((sec, si) => (
                        <div key={si} style={{ background: "#F7F8FA", border: `1px solid ${skillMeta.barColor}30`, borderRadius: 14, padding: "12px 16px", borderLeft: `3px solid ${skillMeta.barColor}` }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: skillMeta.textColor, marginBottom: 6 }}>{sec.title}</p>
                          {sec.content.split(/\n+/).filter(Boolean).map((line, li) => (
                            <p key={li} style={{ fontSize: 13, color: "#334155", lineHeight: 1.85, margin: "2px 0" }}><MathContent text={line} onLinkClick={pushConcept} /></p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {card.detailSections && card.detailSections.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <ModuleBadge label={card.hasAnnotations === false ? "核心重点解析" : card.hasAnnotations ? "手写内容重点" : "圈选重点"} textColor="#BE123C" bgColor="#FFE4E6" barColor="#FB7185" />
                  <div style={{ background: "#F7F8FA", border: "1px solid #EAEDF2", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
                    {card.hasAnnotations !== false && card.detailIntro && (
                      <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.75, fontStyle: "italic", margin: 0 }}>"{card.detailIntro}"</p>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {card.detailSections.map((section, si) => (
                        <div key={si}>
                          <p style={{ fontWeight: 700, fontSize: 13, color: "#BE123C", marginBottom: 8 }}>{si + 1}. {section.title}</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {section.items.map((item, ii) => (
                              <div key={ii} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                <span style={{ color: "#FB7185", fontSize: 12, marginTop: 2, flexShrink: 0 }}>▸</span>
                                <DynamicRenderer text={item} onLinkClick={pushConcept} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {card.expandedKnowledge && card.expandedKnowledge.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <ModuleBadge label="关联知识扩展" textColor="#C2410C" bgColor="#FFF7ED" barColor="#FB923C" />
                  <div style={{ background: "#F7F8FA", border: "1px solid #EAEDF2", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {card.expandedKnowledge.map((item, i) => (
                      <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "10px 12px", border: "1px solid #EAEDF2" }}>
                        <button onClick={() => pushConcept(item.concept)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 5 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#D97706", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>{item.concept}</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                        <DynamicRenderer text={item.explanation} onLinkClick={pushConcept} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {card.nextAction && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <ModuleBadge label="下一步建议" textColor="#065F46" bgColor="#D1FAE5" barColor="#34D399" />
                  <div style={{ background: "#F7F8FA", border: "1px solid #EAEDF2", borderRadius: 14, padding: "14px 16px" }}>
                    <MathParagraph text={card.nextAction ?? ""} onLinkClick={pushConcept} />
                  </div>
                </div>
              )}
              {!card.overview && !card.detailIntro && !(card.detailSections?.length) && !(card.aiKeyPoints?.length) && (
                <p style={{ marginTop: 48, fontSize: 13, color: "#B0B5C0", textAlign: "center" }}>AI 正在分析批注内容...</p>
              )}
            </>)}

            {(quizRaw || quizLoading) && (
              <div style={{ marginTop: 10 }}>
                <InteractiveQuiz rawText={quizRaw} loading={quizLoading} />
              </div>
            )}

            <DetailFeedbackBar onRegenerate={regenerateUnified} regenerating={generatingUnified} />
          </div>
        )}

        {activeTab === "mindmap" && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <ModuleBadge label="知识脉络" textColor="#065F46" bgColor="#D1FAE5" barColor="#34D399" />
              <div style={{ background: "#F8FAFB", border: "1px solid #E9EDF2", borderRadius: 14, padding: "16px 20px" }}>
                <KnowledgeTree nodes={card.knowledgeTree ?? []} />
              </div>
              <p style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", marginTop: 4 }}>📍 当前节点为本次圈选的知识点</p>
            </div>
          </div>
        )}

        {activeTab === "interactive" && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            {effectiveInteractiveSpec && interactivePhase === "ready" ? (
              <>
                <InteractiveBlock spec={effectiveInteractiveSpec} />
                <DetailFeedbackBar
                  onRegenerate={regenerateInteractive}
                  regenerating={interactiveBusy}
                  regenerateLabel="重新生成演示"
                />
              </>
            ) : interactivePhase === "skipped" ? (
              <div style={{ background: "#fff", border: "1px solid #EAEDF2", borderRadius: 16, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💡</div>
                  <p style={{ fontSize: 14, color: "#0F172A", fontWeight: 700, margin: 0 }}>该知识点更适合静态阅读</p>
                </div>
                <p style={{ fontSize: 13, color: "#475569", margin: 0, lineHeight: 1.7 }}>
                  AI 判断这条笔记偏概念/历史/理论性，做动态演示反而会增加理解成本。建议直接看「智能总结」和「知识脉络」。
                </p>
                <button
                  onClick={forceGenerateInteractive}
                  style={{ alignSelf: "flex-start", fontSize: 12, padding: "8px 14px", borderRadius: 10, background: "#EEF2FF", color: "#4338CA", border: "none", cursor: "pointer", fontWeight: 600 }}
                >
                  我还是想试一下 →
                </button>
              </div>
            ) : interactivePhase === "failed" ? (
              <div style={{ background: "#fff", border: "1px solid #EAEDF2", borderRadius: 16, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🧩</div>
                  <p style={{ fontSize: 14, color: "#0F172A", fontWeight: 700, margin: 0 }}>当前内容不太适合动态演示</p>
                </div>
                <p style={{ fontSize: 13, color: "#475569", margin: 0, lineHeight: 1.7 }}>
                  这条笔记的知识点用文字和图示讲解会更清晰，AI 没能把它转成稳定的交互动画。建议直接看「智能总结」和「知识脉络」，理解效果通常更好。
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    onClick={regenerateInteractive}
                    style={{ fontSize: 12, padding: "8px 14px", borderRadius: 10, background: "#EEF2FF", color: "#4338CA", border: "none", cursor: "pointer", fontWeight: 600 }}
                  >
                    再试一次 →
                  </button>
                </div>
                {interactiveError && (
                  <details style={{ marginTop: 2 }}>
                    <summary style={{ fontSize: 11, color: "#94A3B8", cursor: "pointer", userSelect: "none" }}>技术详情</summary>
                    <pre style={{ fontSize: 11, color: "#64748B", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 10px", margin: "8px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5 }}>{interactiveError}</pre>
                  </details>
                )}
              </div>
            ) : (
              <div style={{ background: "#fff", border: "1px solid #EAEDF2", borderRadius: 16, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#8B5CF6", animation: "shimmer 1.4s ease-in-out infinite" }} />
                  <p style={{ fontSize: 14, color: "#0F172A", fontWeight: 700, margin: 0 }}>
                    {interactivePhase === "planning" ? "AI 正在设计交互方案..." : interactivePhase === "coding" ? "AI 正在生成动态演示..." : "AI 准备启动交互生成..."}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ height: 12, borderRadius: 6, background: "#E9ECF2", width: i === 4 ? "55%" : "100%", animation: "shimmer 1.4s ease-in-out infinite" }} />
                  ))}
                </div>
              </div>
            )}
          </div>
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

      <div style={{ position: "absolute", inset: 0, background: "#fff", borderRadius: "inherit", transform: conceptStack.length > 0 ? "translateX(0)" : "translateX(105%)", transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)", zIndex: 10 }}>
        {conceptStack.length > 0 && (
          <ConceptPage
            keyword={conceptStack[conceptStack.length - 1].keyword}
            cardTitle={conceptStack[conceptStack.length - 1].cardTitle}
            onBack={popConcept}
          />
        )}
      </div>
    </div>
  );
}
