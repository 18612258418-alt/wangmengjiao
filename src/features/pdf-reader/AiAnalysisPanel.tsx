import type { RecalledMemory } from "../../utils/memoryRecall";
import { AiConversationModule } from "../ai-conversation/AiConversationModule";

export interface CircleSection {
  title: string;
  content: string;
}

export interface AiEntry {
  id: string;
  status: "loading" | "streaming" | "done" | "error";
  intent?: string;
  sections?: CircleSection[];
  warnings?: string[];
  answer: string;
  circleIndex: number;
  kind?: "circle" | "ink";
  clarifyQuestion?: string;
  erased?: boolean;
  fromMemory?: boolean;
  recalledMemories?: RecalledMemory[];
}

interface Props {
  entries: AiEntry[];
  onClose: () => void;
  onDeleteEntry?: (entryId: string) => void;
  onClarifyReply?: (entryId: string, reply: string) => void;
  onOpenRecalledCard?: (item: RecalledMemory) => void;
}

const SKIP = new Set(["本圈选内容不涉及", "不涉及", "无", "暂无", "N/A", "n/a"]);

function entryToMessage(entry: AiEntry) {
  if (entry.status === "loading") return entry.fromMemory ? "正在从你的长期记忆中寻找相关内容…" : "正在理解刚才的圈选和笔迹…";
  if (entry.clarifyQuestion) return entry.clarifyQuestion;
  if (entry.fromMemory && entry.recalledMemories?.length) {
    return `我从你的记忆中找到了这些相关内容：\n${entry.recalledMemories.map(item => `• ${item.title}：${item.summary}`).join("\n")}`;
  }
  const sections = (entry.sections ?? []).filter(section => section.content.trim() && !SKIP.has(section.content.trim()));
  const parts = [entry.intent?.trim(), ...sections.map(section => `${section.title}\n${section.content.trim()}`), ...(entry.warnings ?? [])].filter(Boolean);
  return parts.join("\n\n") || entry.answer || "已完成当前内容的理解。";
}

export function AiAnalysisPanel({ entries, onClose, onClarifyReply }: Props) {
  const visible = entries.filter(entry => entry.status !== "error" && !entry.erased);
  const latest = [...visible].reverse().find(entry => entry.status === "done");
  const ask = (question: string) => {
    if (latest?.clarifyQuestion && onClarifyReply) {
      onClarifyReply(latest.id, question);
      return "好的，我会按你刚才说明的意图重新理解这处内容。";
    }
    return `我会继续结合当前 PDF、圈选位置和已有解析回答“${question}”。如果问题涉及公式或结论，我会保留对应原文位置。`;
  };

  return (
    <AiConversationModule
      contextKey="pdf-ai-conversation"
      contextLabel={`当前 PDF · ${visible.length} 处圈选/笔迹`}
      title="AI 对话"
      initialAssistant="在页面上圈选、书写或直接提问都可以。我会把每次解析放进同一段对话，并持续保留当前 PDF 上下文。"
      externalAssistantMessages={visible.map(entry => ({ id: `${entry.id}-${entry.status}`, content: entryToMessage(entry) }))}
      onAsk={ask}
      onClose={onClose}
      placeholder="问圈选内容、公式或当前页面…"
      suggestions={["解释刚才圈选的内容","推导这个公式","检查我写的是否正确"]}
      className="h-full w-[390px] shrink-0 border-y-0 border-r-0 shadow-[-4px_0_24px_rgba(0,0,0,0.12)]"
    />
  );
}
