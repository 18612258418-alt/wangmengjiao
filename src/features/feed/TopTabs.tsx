import { useState, useEffect } from "react";
import { BookOpen, FileText, ClipboardList, Plus, Sparkles, Calendar } from "lucide-react";

export type TopTabId = "notes" | "homework" | "exam";

const TABS: Array<{ id: TopTabId; label: string }> = [
  { id: "notes", label: "笔记" },
  { id: "homework", label: "作业" },
  { id: "exam", label: "备考" },
];

const annotationItems = [
  { id: "courseware", label: "课件", icon: BookOpen },
  { id: "notes", label: "笔记", icon: FileText },
  { id: "exercises", label: "网课", icon: ClipboardList },
];

export function TopTabs({
  activeTab,
  onChangeTab,
  onOpenAnnotation,
  onOpenGenerate,
  onOpenReviewPlan,
}: {
  activeTab: TopTabId;
  onChangeTab: (id: TopTabId) => void;
  onOpenAnnotation: (type: string) => void;
  onOpenGenerate: () => void;
  /** 打开备考复习计划（艾宾浩斯周视图） */
  onOpenReviewPlan?: () => void;
}) {
  const [showAnnotationDropdown, setShowAnnotationDropdown] = useState(false);

  useEffect(() => {
    if (!showAnnotationDropdown) return;
    const close = () => setShowAnnotationDropdown(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showAnnotationDropdown]);

  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-3 flex-shrink-0">
      {/* Left: Tab pills */}
      <div
        className="inline-flex items-center bg-white rounded-2xl border border-[#EAEDF2] p-1"
        style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
      >
        {TABS.map(tab => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className="px-5 py-1.5 rounded-xl text-[13px] transition-all duration-150"
              style={{
                background: active ? "#4D5CFF" : "transparent",
                color: active ? "#fff" : "#41464F",
                fontWeight: active ? 600 : 500,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Right: Generate + Annotation */}
      <div className="flex items-center gap-2">
        {onOpenReviewPlan && (
          <button
            type="button"
            onClick={onOpenReviewPlan}
            className="flex items-center gap-1.5 bg-white text-[#E67E22] px-3.5 py-2 rounded-xl border border-[#FDE68A] hover:bg-[#FFFBEB] transition-colors"
            style={{ fontWeight: 600 }}
            title="复习计划"
          >
            <Calendar size={14} />
            <span className="text-[13px]">复习计划</span>
          </button>
        )}
        <button
          onClick={onOpenGenerate}
          className="flex items-center gap-1.5 bg-white text-[#4D5CFF] px-3.5 py-2 rounded-xl border border-[#D6DBFF] hover:bg-[#EEF0FF] transition-colors"
          style={{ fontWeight: 600 }}
          title="AI 学习助手"
        >
          <Sparkles size={14} />
          <span className="text-[13px]">AI 学习助手</span>
        </button>

        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setShowAnnotationDropdown(v => !v)}
            className="flex items-center gap-1.5 bg-[#4D5CFF] text-white px-3.5 py-2 rounded-xl hover:bg-[#3D4CEF] transition-colors duration-150 shadow-sm"
          >
            <Plus size={14} />
            <span className="text-[13px]" style={{ fontWeight: 600 }}>批注</span>
          </button>
          {showAnnotationDropdown && (
            <div className="absolute right-0 top-10 mt-1 w-36 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-[#EAEDF2] overflow-hidden z-50">
              {annotationItems.map(item => (
                <button
                  key={item.id}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-[#020418] hover:bg-[#F5F6FA] transition-colors"
                  onClick={() => {
                    setShowAnnotationDropdown(false);
                    onOpenAnnotation(item.id);
                  }}
                >
                  <item.icon size={15} className="text-[#7B8291]" />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
