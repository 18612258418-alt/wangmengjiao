import { useState } from "react";
import { BookOpen, ChevronDown, Compass, FlaskConical, Library, Plus, Search, Sparkles, SunMedium } from "lucide-react";
import { imgLoadingSpinner } from "../../data/initialData";
import type { SubjectData } from "../../types";

export type WorkspaceId = "today" | "inbox" | "knowledge" | "course" | "project" | "goals" | "history" | "sources";

const colors = ["#4D5CFF", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6"];

export function Sidebar({ activeWorkspace, activeSubject, onSelectWorkspace, onSelectSubject, isLoading, subjects, onOpenSearch, onUploadFile }: {
  activeWorkspace: WorkspaceId;
  activeSubject: string;
  onSelectWorkspace: (id: WorkspaceId) => void;
  onSelectSubject: (id: string) => void;
  isLoading: boolean;
  subjects: SubjectData[];
  onOpenSearch: () => void;
  onUploadFile: () => void;
  onCreateSubject?: () => void;
}) {
  const [learningOpen, setLearningOpen] = useState(true);
  const primary = [
    { id: "today" as const, label: "今日", icon: SunMedium, badge: "6" },
    { id: "knowledge" as const, label: "知识", icon: Library, badge: "38" },
  ];
  const navButton = (id: WorkspaceId, label: string, Icon: typeof SunMedium, trailing?: React.ReactNode, action?: () => void) => {
    const active = activeWorkspace === id;
    return <button onClick={action ?? (() => onSelectWorkspace(id))} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition ${active ? "bg-white text-[#4D5CFF] shadow-sm" : "text-[#41464F] hover:bg-white/70"}`}>
      <Icon size={18} strokeWidth={active ? 2.4 : 2} />
      <span className="font-semibold flex-1 text-left">{label}</span>{trailing}
    </button>;
  };
  return <aside className="w-[264px] flex-shrink-0 bg-[#EEF0F5] h-full flex flex-col border-r border-[#E3E6ED]">
    <div className="px-5 pt-5 pb-3 flex items-center justify-between">
      <button onClick={() => onSelectWorkspace("today")} className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#EC6392] via-[#CB6CDA] to-[#618AFF] text-white"><Sparkles size={17}/></span>
        <span className="text-[16px] font-bold text-[#020418]">AI记忆</span>
      </button>
      <div className="flex"><button onClick={onOpenSearch} className="p-2 text-[#6B7280] hover:text-[#4D5CFF]"><Search size={18}/></button><button onClick={onUploadFile} className="p-2 text-[#6B7280] hover:text-[#4D5CFF]"><Plus size={19}/></button></div>
    </div>
    {isLoading && <div className="mx-5 mb-2 flex items-center gap-2 text-[12px]"><img src={imgLoadingSpinner} width={16} className="animate-spin"/>AI 分析中...</div>}
    <nav className="flex-1 overflow-y-auto px-3 pb-5 space-y-1">
      {primary.map(x => <div key={x.id}>{navButton(x.id, x.label, x.icon, <span className="text-[11px] text-[#9CA3AF]">{x.badge}</span>)}</div>)}
      <div className="pt-4 pb-1 px-3 text-[10px] font-bold tracking-[.14em] text-[#9CA3AF]">正在进行</div>
      {navButton("course", "学习", BookOpen, <ChevronDown size={14} className={`transition-transform ${learningOpen ? "rotate-0" : "-rotate-90"}`}/>, () => {
        onSelectWorkspace("course");
        setLearningOpen(open => !open);
      })}
      {learningOpen && <div className="ml-4 pl-3 border-l border-[#D9DDE7] space-y-0.5">
        {subjects.slice(0, 5).map((s, i) => <button key={s.id} onClick={() => onSelectSubject(s.id)} className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] ${activeWorkspace === "course" && activeSubject === s.id ? "bg-[#E3E6FF] text-[#4D5CFF] font-semibold" : "text-[#626977] hover:bg-white/70"}`}><span className="h-2 w-2 rounded-full" style={{background:colors[i]}}/><span className="truncate">{s.short}</span><span className="ml-auto text-[10px] opacity-60">{s.count}</span></button>)}
      </div>}
      <div className="mt-3">{navButton("project", "研究", FlaskConical)}</div>
      <div className="mt-1">{navButton("goals", "计划", Compass)}</div>
    </nav>
  </aside>;
}
