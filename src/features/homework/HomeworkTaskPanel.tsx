import { FlaskConical, BookMarked, Languages, ListOrdered, CheckCircle2 } from "lucide-react";
import type { HomeworkTaskBreakdown } from "../../utils/generateHomeworkBreakdown";
import type { HomeworkTrack } from "../../utils/homeworkTrack";
import { OriginalImageViewer } from "../../shared/OriginalImageViewer";

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

export function HomeworkTaskPanel({
  task,
  breakdown,
  sourceTitle,
  sourceImage,
  sourceImageAlt,
  isCompleted = false,
  onComplete,
}: {
  task: string;
  breakdown: HomeworkTaskBreakdown;
  sourceTitle?: string;
  /** 上传/拍照时的原始图片，用于对照作业要求 */
  sourceImage?: string;
  sourceImageAlt?: string;
  isCompleted?: boolean;
  onComplete?: () => void;
}) {
  const Icon = TRACK_ICON[breakdown.track];
  const accent = TRACK_ACCENT[breakdown.track];

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
            {task.replace(/【[^】]+】/g, "").trim() || task}
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
        <p className="text-[13px] text-[#4D5CFF] mt-3" style={{ fontWeight: 700 }}>
          {breakdown.approachTitle}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <div className="flex items-center gap-2 text-[12px] text-[#7B8291]">
          <ListOrdered size={14} />
          <span style={{ fontWeight: 600 }}>步骤拆解</span>
        </div>

        {breakdown.steps.map((step, i) => (
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
          </div>
        ))}

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

      {onComplete && (
        <div className="flex-shrink-0 px-6 py-4 border-t border-[#EAEDF2]/80 bg-[#F5F6FA]">
          <button
            type="button"
            onClick={onComplete}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-[14px] transition-colors ${
              isCompleted
                ? "bg-[#D1FAE5] text-[#047857] border border-[#6EE7B7] hover:bg-[#A7F3D0] hover:border-[#4ADE80]"
                : "bg-[#10B981] text-white hover:bg-[#059669] shadow-sm"
            }`}
            style={{ fontWeight: 600 }}
          >
            <CheckCircle2 size={18} />
            {isCompleted ? "取消完成" : "完成"}
          </button>
        </div>
      )}
    </div>
  );
}
