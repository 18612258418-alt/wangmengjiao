import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar, X } from "lucide-react";
import type { CardData, SubjectData } from "../../types";
import { ExamWeekSchedule } from "./ExamWeekSchedule";

export function ExamReviewPlanModal({
  open,
  subject,
  items,
  onClose,
  onSelectCard,
}: {
  open: boolean;
  subject: SubjectData;
  items: Array<{ card: CardData; date: string }>;
  onClose: () => void;
  onSelectCard?: (card: CardData, feedDate: string) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[230] flex items-center justify-center bg-black/40 p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exam-review-plan-title"
    >
      <div
        className="w-full max-w-[920px] max-h-[90vh] rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[#EAEDF2] flex items-start justify-between gap-4 flex-shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF4E6] flex items-center justify-center flex-shrink-0">
              <Calendar size={22} className="text-[#E67E22]" />
            </div>
            <div className="min-w-0">
              <p id="exam-review-plan-title" className="text-[18px] text-[#020418]" style={{ fontWeight: 800 }}>
                备考复习计划
              </p>
              <p className="text-[12px] text-[#7B8291] mt-1">
                {subject.short} · 未来 7 天按艾宾浩斯曲线安排的复习时间表
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F0F2F5] hover:bg-[#E5E7EB] flex items-center justify-center text-[#020418] flex-shrink-0"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {items.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Calendar size={40} className="mx-auto text-[#E5E7EB] mb-3" />
              <p className="text-[14px] text-[#7B8291]">当前学科暂无备考题目</p>
              <p className="text-[12px] text-[#B0B5C0] mt-1 max-w-sm mx-auto">
                上传试卷或习题后，完成配套练习即可在此查看复习排期
              </p>
            </div>
          ) : (
            <ExamWeekSchedule
              variant="modal"
              items={items}
              onSelect={(card, feedDate) => {
                onSelectCard?.(card, feedDate);
                onClose();
              }}
            />
          )}
        </div>

        {items.length > 0 && (
          <div className="px-6 py-3 border-t border-[#EAEDF2] bg-[#FAFBFF] flex-shrink-0">
            <p className="text-[11px] text-[#9CA3AF] text-center">
              点击某一天中的题目可跳转至备考详情并继续练习
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
