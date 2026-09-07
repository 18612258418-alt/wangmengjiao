import { useState } from "react";
import { Plus, Search, Sparkles, SunMedium } from "lucide-react";
import { imgLoadingSpinner } from "../../data/initialData";
import type { SubjectData } from "../../types";

export type WorkspaceId = "today" | "activity" | "inbox" | "knowledge" | "course" | "project" | "goals" | "sources";

const colors = ["#4D5CFF", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6"];

export function Sidebar({ activeWorkspace, activeSubject, onSelectWorkspace, onSelectSubject, isLoading, subjects, onOpenSearch, onUploadFile, todayCount }: {
  activeWorkspace: WorkspaceId;
  activeSubject: string;
  onSelectWorkspace: (id: WorkspaceId) => void;
  onSelectSubject: (id: string) => void;
  isLoading: boolean;
  subjects: SubjectData[];
  onOpenSearch: () => void;
  onUploadFile: () => void;
  todayCount: number;
  onCreateSubject?: () => void;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileCorrected, setProfileCorrected] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const primary = [
    { id: "today" as const, label: "今日待办", icon: SunMedium, badge: String(todayCount) },
  ];
  const navButton = (id: WorkspaceId, label: string, Icon: typeof SunMedium, trailing?: React.ReactNode, action?: () => void) => {
    const active = activeWorkspace === id;
    return <button onClick={action ?? (() => onSelectWorkspace(id))} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition ${active ? "bg-white text-[#4D5CFF] shadow-sm" : "text-[#41464F] hover:bg-white/70"}`}>
      <Icon size={18} strokeWidth={active ? 2.4 : 2} />
      <span className="font-semibold flex-1 text-left">{label}</span>{trailing}
    </button>;
  };
  return <><aside className="w-[264px] flex-shrink-0 bg-[#EEF0F5] h-full flex flex-col border-r border-[#E3E6ED]">
    <div className="px-5 pt-5 pb-3 flex items-center justify-between">
      <button onClick={() => setProfileOpen(true)} className="flex items-center gap-2 text-left" aria-label="查看 Memo 对我的理解">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#EC6392] via-[#CB6CDA] to-[#618AFF] text-white"><Sparkles size={17}/></span>
        <span className="block text-[16px] font-bold text-[#020418]">Memo</span>
      </button>
      <div className="flex"><button aria-label="搜索记忆和资料" onClick={onOpenSearch} className="p-2 text-[#6B7280] hover:text-[#4D5CFF]"><Search size={18}/></button><button aria-label="添加资料" onClick={onUploadFile} className="p-2 text-[#6B7280] hover:text-[#4D5CFF]"><Plus size={19}/></button></div>
    </div>
    {isLoading && <div className="mx-5 mb-2 flex items-center gap-2 text-[12px]"><img src={imgLoadingSpinner} width={16} className="animate-spin"/>Memo 正在整理...</div>}
    <nav className="flex-1 overflow-y-auto px-3 pb-5 space-y-1">
      {primary.map(x => <div key={x.id}>{navButton(x.id, x.label, x.icon, <span className="text-[11px] text-[#9CA3AF]">{x.badge}</span>)}</div>)}
      <div className="mt-4 space-y-0.5">
        {subjects.slice(0, 5).map((s, i) => <button key={s.id} onClick={() => onSelectSubject(s.id)} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition ${activeWorkspace === "course" && activeSubject === s.id ? "bg-white text-[#4D5CFF] font-semibold shadow-sm" : "text-[#41464F] hover:bg-white/70"}`}><span className="h-2.5 w-2.5 rounded-full" style={{background:colors[i]}}/><span className="truncate font-semibold">{s.short}</span><span className="ml-auto text-[11px] text-[#9CA3AF]">{s.count}</span></button>)}
      </div>
    </nav>
  </aside>{profileOpen&&<div onClick={()=>setProfileOpen(false)} className="fixed inset-0 z-[210] bg-black/20"><aside onClick={e=>e.stopPropagation()} className="ml-auto h-full w-[460px] overflow-y-auto bg-white p-6 shadow-2xl">
    <button onClick={()=>setProfileOpen(false)} className="text-[11px] text-[#4D5CFF]">← 返回</button>
    <p className="mt-6 text-[10px] font-bold tracking-[.12em] text-[#8C93A3]">MEMO 对我的理解</p>
    <h2 className="mt-2 text-[22px] font-bold">晓雨，这是我目前对你的理解</h2>
    <p className="mt-2 text-[12px] leading-6 text-[#626977]">它会随着课程、作答、笔记和对话持续更新，你可以随时查看依据或纠正。</p>

    <section className="mt-6 rounded-2xl bg-gradient-to-br from-[#F0F2FF] to-[#F8F5FF] p-5">
      <small className="font-semibold text-[#6973C9]">当前目标</small>
      <b className="mt-2 block text-[15px]">准备 8 天后的高数结课考试</b>
      <p className="mt-2 text-[10px] leading-5 text-[#737B90]">本学期继续完成冲动消费研究初稿；长期积累研究与结构化表达能力。</p>
    </section>

    <h3 className="mt-6 text-[13px] font-bold">学习状态</h3>
    <div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#F7F8FB] p-4"><small className="text-[#8A909C]">高等数学</small><b className="mt-2 block text-[12px]">基础稳定，边界题待巩固</b><p className="mt-2 text-[9px] leading-4 text-[#9399A6]">最近两次错误集中在换元上下限</p></div><div className="rounded-2xl bg-[#F7F8FB] p-4"><small className="text-[#8A909C]">学术英语</small><b className="mt-2 block text-[12px]">听力连续练习 4 天</b><p className="mt-2 text-[9px] leading-4 text-[#9399A6]">论证转折识别正在变稳定</p></div></div>

    <h3 className="mt-6 text-[13px] font-bold">适合你的学习方式</h3>
    <div className="mt-3 space-y-2">{["数学：先做题，再根据错误获得讲解","英语：短音频跟读，再用闪卡巩固","复杂实验：课前观看操作视频并核对步骤"].map(item=><div key={item} className="rounded-xl bg-[#F7F8FB] px-4 py-3 text-[11px] text-[#555D6C]">{item}</div>)}</div>

    <h3 className="mt-6 text-[13px] font-bold">正在形成的能力</h3>
    <div className="mt-3 flex flex-wrap gap-2">{["研究问题拆解","证据比较","结构化表达","持续复盘"].map(item=><span key={item} className="rounded-full bg-[#EEF0FF] px-3 py-1.5 text-[9px] font-semibold text-[#4D5CFF]">{item}</span>)}</div>

    <section className="mt-6 rounded-2xl bg-[#FFF8E8] p-4"><small className="font-semibold text-[#B57A18]">需要留意</small><p className="mt-2 text-[11px] leading-5 text-[#705D38]">定积分换元后容易忘记同步修改上下限；六级听力复习仍容易被临时任务打断。</p></section>

    <div className="mt-6 flex gap-2"><button onClick={()=>setEvidenceOpen(open=>!open)} className="rounded-xl bg-[#F1F3FF] px-4 py-2.5 text-[11px] font-semibold text-[#4D5CFF]">{evidenceOpen?"收起记忆依据":"查看记忆依据"}</button><button onClick={()=>setProfileCorrected(true)} className="rounded-xl bg-[#F5F6F8] px-4 py-2.5 text-[11px] font-semibold text-[#656D7B]">{profileCorrected?"已收到纠正 ✓":"纠正 Memo"}</button></div>
    {evidenceOpen&&<div className="mt-3 rounded-2xl border border-[#E7EAF0] p-4"><b className="text-[11px]">这些理解来自</b>{["高数第 5、6 次作业的错题记录","近 7 天课程音频和闪卡使用情况","课表中的结课考试与实验安排","社会心理学阅读、笔记和论文调用记录"].map(item=><div key={item} className="mt-2 flex items-start text-[10px] leading-5 text-[#747B89]"><span className="mr-2 mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4D5CFF]"/>{item}</div>)}</div>}
  </aside></div>}</>;
}
