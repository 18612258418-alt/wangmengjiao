import { useEffect, useState } from "react";
import {
  FlaskConical,
  BookMarked,
  Languages,
  ListOrdered,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import type { HomeworkTaskBreakdown } from "../../utils/generateHomeworkBreakdown";
import type { HomeworkTrack } from "../../utils/homeworkTrack";
import { OriginalImageViewer } from "../../shared/OriginalImageViewer";
import { MathContent } from "../../shared/MathContent";
import { callText } from "../../utils/api";
import { buildHomeworkAnswerPrompt } from "../../prompts";
import { extractJsonObject, parseJsonLoose } from "../../utils/json";

const TRACK_ICON: Record<HomeworkTrack, typeof FlaskConical> = {
  stem: FlaskConical,
  humanities: BookMarked,
  language: Languages,
};

const TRACK_ACCENT: Record<HomeworkTrack, string> = {
  stem: "#3B82F6",
  humanities: "#8B5CF6",
  language: "#10B981",
};

interface HomeworkAnswer {
  stepExamples: string[];
  answer: string;
}

function parseHomeworkAnswer(raw: string): HomeworkAnswer | null {
  const json = extractJsonObject(raw);
  if (!json) return null;
  try {
    const parsed = parseJsonLoose<{ stepExamples?: unknown; answer?: unknown }>(json);
    const stepExamples = Array.isArray(parsed.stepExamples)
      ? parsed.stepExamples.map(s => String(s ?? "").trim()).filter(Boolean)
      : [];
    const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
    if (!answer && stepExamples.length === 0) return null;
    return { stepExamples, answer };
  } catch {
    return null;
  }
}

export function HomeworkTaskPanel({
  task,
  breakdown,
  subjectShort,
  sourceTitle,
  sourceImage,
  sourceImageAlt,
  onUploadCheck,
}: {
  task: string;
  breakdown: HomeworkTaskBreakdown;
  /** 学科简称，用于「查看答案」提示词 */
  subjectShort?: string;
  sourceTitle?: string;
  /** 上传/拍照时的原始图片，用于对照作业要求 */
  sourceImage?: string;
  sourceImageAlt?: string;
  /** 「上传检查」按钮：打开上传入口 */
  onUploadCheck?: () => void;
}) {
  const Icon = TRACK_ICON[breakdown.track];
  const accent = TRACK_ACCENT[breakdown.track];

  const cleanTask = task.replace(/【[^】]+】/g, "").trim() || task;

  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<HomeworkAnswer | null>(null);

  // 切换 task 时重置答案显隐状态
  useEffect(() => {
    setRevealed(false);
    setLoading(false);
    setError(null);
    setAnswer(null);
  }, [task]);

  const fetchAnswer = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const prompt = buildHomeworkAnswerPrompt({
        task: cleanTask,
        subjectShort: subjectShort ?? breakdown.trackLabel,
        approachTitle: breakdown.approachTitle,
        steps: breakdown.steps.map(s => ({ title: s.title, detail: s.detail })),
      });
      const raw = await callText(prompt, { maxTokens: 1200 });
      const parsed = parseHomeworkAnswer(raw);
      if (!parsed) {
        setError("答案解析失败，请重试");
      } else {
        setAnswer(parsed);
      }
    } catch {
      setError("生成答案失败，请检查网络后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAnswer = () => {
    if (revealed) {
      setRevealed(false);
      return;
    }
    setRevealed(true);
    if (!answer && !loading) void fetchAnswer();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-6 pt-5 pb-4 flex-shrink-0 border-b border-[#EAEDF2]/80">
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 mb-3"
          style={{ background: `${accent}14`, color: accent }}
        >
          <Icon size={14} />
          <span className="text-[11px]" style={{ fontWeight: 600 }}>
            {breakdown.trackLabel}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[14px] text-[#020418] leading-relaxed flex-1 min-w-0" style={{ fontWeight: 600 }}>
            {cleanTask}
          </p>
          {sourceImage && (
            <OriginalImageViewer
              src={sourceImage}
              alt={sourceImageAlt ?? "作业原始图片"}
              label="查看原图"
            />
          )}
        </div>
        {sourceTitle && (
          <p className="text-[12px] text-[#9CA3AF] mt-1.5 truncate">
            来源：{sourceTitle.replace(/^记忆[:：]\s*/, "")}
          </p>
        )}
        {sourceImage && (
          <p className="text-[12px] text-[#7B8291] mt-1">
            不理解本条 task？可点「查看原图」对照照片中的作业要求与手写内容
          </p>
        )}
        <div className="flex items-center justify-between gap-3 mt-3">
          <p className="text-[13px] text-[#4D5CFF]" style={{ fontWeight: 700 }}>
            {breakdown.approachTitle}
          </p>
          <button
            type="button"
            onClick={handleToggleAnswer}
            className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-colors ${
              revealed
                ? "bg-[#EEF0FF] text-[#4D5CFF] hover:bg-[#E0E4FF]"
                : "bg-[#4D5CFF] text-white hover:bg-[#3D4CEF] shadow-sm"
            }`}
            style={{ fontWeight: 600 }}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : revealed ? (
              <EyeOff size={14} />
            ) : (
              <Eye size={14} />
            )}
            {revealed ? "隐藏答案" : "查看答案"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <div className="flex items-center gap-2 text-[12px] text-[#7B8291]">
          <ListOrdered size={14} />
          <span style={{ fontWeight: 600 }}>步骤拆解</span>
        </div>

        {breakdown.steps.map((step, i) => {
          const example = revealed ? answer?.stepExamples[i] : undefined;
          return (
            <div
              key={i}
              className="rounded-2xl bg-white border border-[#EAEDF2] px-4 py-3.5"
            >
              <p className="text-[13px] text-[#020418] mb-1.5" style={{ fontWeight: 700 }}>
                {step.title}
              </p>
              <p className="text-[13px] text-[#41464F] leading-relaxed">{step.detail}</p>
              {step.tip && (
                <p
                  className="text-[12px] mt-2 pl-3 border-l-2 leading-relaxed"
                  style={{ borderColor: accent, color: "#6B7280" }}
                >
                  💡 {step.tip}
                </p>
              )}
              {revealed && loading && !answer && (
                <div className="mt-2.5 flex items-center gap-1.5 text-[12px] text-[#9CA3AF]">
                  <Loader2 size={12} className="animate-spin" />
                  正在生成样例…
                </div>
              )}
              {example && (
                <div
                  className="mt-2.5 rounded-xl px-3 py-2.5"
                  style={{ background: `${accent}0D` }}
                >
                  <p
                    className="text-[11px] mb-1 inline-flex items-center gap-1"
                    style={{ color: accent, fontWeight: 700 }}
                  >
                    <Sparkles size={11} />
                    样例
                  </p>
                  <MathContent
                    text={example}
                    className="text-[12.5px] text-[#41464F] leading-relaxed"
                  />
                </div>
              )}
            </div>
          );
        })}

        {revealed && (
          <div
            className="rounded-2xl border px-4 py-3.5"
            style={{ borderColor: `${accent}40`, background: `${accent}0A` }}
          >
            <p
              className="text-[12px] mb-2 inline-flex items-center gap-1.5"
              style={{ color: accent, fontWeight: 700 }}
            >
              <Sparkles size={13} />
              参考答案
            </p>
            {loading && !answer ? (
              <div className="flex items-center gap-1.5 text-[13px] text-[#7B8291]">
                <Loader2 size={14} className="animate-spin" />
                正在生成参考答案…
              </div>
            ) : error ? (
              <div className="text-[13px] text-[#EF4444]">
                {error}
                <button
                  type="button"
                  onClick={() => void fetchAnswer()}
                  className="ml-2 underline"
                >
                  重试
                </button>
              </div>
            ) : answer?.answer ? (
              <MathContent
                text={answer.answer}
                className="text-[13px] text-[#020418] leading-relaxed"
              />
            ) : (
              <p className="text-[13px] text-[#7B8291]">暂无可展示的参考答案</p>
            )}
          </div>
        )}

        <div className="rounded-2xl bg-[#F8FAFB] border border-[#EAEDF2] px-4 py-3.5">
          <p className="text-[12px] text-[#7B8291] mb-2" style={{ fontWeight: 600 }}>
            完成自查
          </p>
          <ul className="space-y-1.5">
            {breakdown.checkpoints.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-[#41464F]">
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: accent }}
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {onUploadCheck && (
        <div className="flex-shrink-0 px-6 py-4 border-t border-[#EAEDF2]/80 bg-[#F5F6FA]">
          <button
            type="button"
            onClick={onUploadCheck}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-[14px] bg-[#4D5CFF] text-white hover:bg-[#3D4CEF] shadow-sm transition-colors"
            style={{ fontWeight: 600 }}
          >
            <Upload size={18} />
            上传检查
          </button>
        </div>
      )}
    </div>
  );
}
