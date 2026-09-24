import { useEffect, useState } from "react";
import { CircleHelp, FolderPlus, Plus, Search, Sparkles, SunMedium } from "lucide-react";
import { imgLoadingSpinner } from "../../data/initialData";
import type { SubjectData } from "../../types";

export type WorkspaceId = "today" | "activity" | "inbox" | "knowledge" | "course" | "project" | "goals" | "sources";

const colors = ["#4D5CFF", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6"];

const memoPrompts = [
  "找我做错过的积分题",
  "明天需要预习什么？",
  "整理最近的课程笔记",
  "我最近总在哪里出错？",
];

export function Sidebar({ activeWorkspace, activeSubject, onSelectWorkspace, onSelectSubject, isLoading, subjects, unreadSubjectIds, onOpenSearch, onOpenRecorder, onUploadFile, todayCount, onCreateSubject, onOpenGuide }: {
  activeWorkspace: WorkspaceId;
  activeSubject: string;
  onSelectWorkspace: (id: WorkspaceId) => void;
  onSelectSubject: (id: string) => void;
  isLoading: boolean;
  subjects: SubjectData[];
  unreadSubjectIds?: ReadonlySet<string>;
  onOpenSearch: () => void;
  onOpenRecorder: () => void;
  onUploadFile: () => void;
  todayCount: number;
  onCreateSubject?: () => void;
  onOpenGuide?: () => void;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileCorrected, setProfileCorrected] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [promptVisible, setPromptVisible] = useState(true);
  useEffect(() => {
    const interval = window.setInterval(() => {
      setPromptVisible(false);
      window.setTimeout(() => {
        setPromptIndex(index => (index + 1) % memoPrompts.length);
        setPromptVisible(true);
      }, 260);
    }, 3000);
    return () => window.clearInterval(interval);
  }, []);
  const primary = [
    { id: "today" as const, label: "今日待办", icon: SunMedium, badge: String(todayCount) },
  ];
  const navButton = (id: WorkspaceId, label: string, Icon: typeof SunMedium, trailing?: React.ReactNode, action?: () => void) => {
    const active = activeWorkspace === id;
    return <button onClick={action ?? (() => onSelectWorkspace(id))} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition ${active ? "bg-[#E2E5EB] text-[#363C48]" : "text-[#41464F] hover:bg-white/60"}`}>
      <Icon size={18} strokeWidth={active ? 2.4 : 2} />
      <span className="font-semibold flex-1 text-left">{label}</span>{trailing}
    </button>;
  };
  return <><aside className="w-[336px] flex-shrink-0 bg-[#EEF0F5] h-full flex flex-col border-r border-[#E3E6ED]">
    <div className="px-6 pt-6 pb-3">
      <button onClick={() => setProfileOpen(true)} className="flex h-10 items-center gap-2.5 text-left" aria-label="查看 Memo 对我的理解">
        <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-gradient-to-br from-[#EC6392] via-[#CB6CDA] to-[#618AFF] text-white"><Sparkles size={19}/></span>
        <span className="block text-[22px] font-bold leading-none text-[#020418]">Memo</span>
      </button>
      <div className="mt-3 flex h-11 items-center gap-2">
        <button onClick={onOpenSearch} className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-2xl bg-white px-3 text-left shadow-sm ring-1 ring-[#E5E8EF] transition hover:shadow-md focus:ring-[#BBC3FF]" aria-label="问 Memo">
          <Search size={17} className="shrink-0 text-[#7C8492]"/>
          <span className={`block truncate text-[12px] font-medium text-[#9AA0AA] transition-all duration-300 ${promptVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"}`}>{memoPrompts[promptIndex]}</span>
        </button>
        <button onClick={onUploadFile} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#555C69] shadow-sm ring-1 ring-[#E5E8EF] transition hover:bg-[#F8F9FB] hover:text-[#20242C] hover:shadow-md" aria-label="添加资料">
          <Plus size={20}/>
        </button>
        <button onClick={onOpenRecorder} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#747B89] shadow-sm ring-1 ring-[#E5E8EF] transition hover:bg-[#F8F9FB] hover:text-[#4D5CFF] hover:shadow-md" aria-label="打开录音">
          <span className="grid h-[19px] w-[19px] place-items-center rounded-full border-[1.8px] border-current" aria-hidden="true">
            <span className="h-[7px] w-[7px] rounded-full bg-current"/>
          </span>
        </button>
      </div>
    </div>
    {isLoading && <div className="mx-5 mb-2 flex items-center gap-2 text-[12px]"><img src={imgLoadingSpinner} width={16} className="animate-spin"/>Memo 正在整理...</div>}
    <nav className="flex-1 overflow-y-auto px-3 pb-5 space-y-1">
      {primary.map(x => <div key={x.id}>{navButton(x.id, x.label, x.icon, <span className="text-[11px] text-[#9CA3AF]">{x.badge}</span>)}</div>)}
      <div className="mt-4 space-y-0.5">
        {subjects.map((s, i) => <button key={s.id} onClick={() => onSelectSubject(s.id)} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition ${activeWorkspace === "course" && activeSubject === s.id ? "bg-white text-[#4D5CFF] font-semibold shadow-sm" : "text-[#41464F] hover:bg-white/70"}`}><span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center"><span className="h-2.5 w-2.5 rounded-full" style={{background:colors[i % colors.length]}}/></span><span className="min-w-0 truncate font-semibold">{s.short}</span>{unreadSubjectIds?.has(s.id) && <span className="shrink-0 rounded-full bg-[#22A06B] px-1.5 py-0.5 text-[8px] font-bold tracking-[.05em] text-white">NEW</span>}<span className="ml-auto text-[11px] text-[#9CA3AF]">{s.count}</span></button>)}
        {onCreateSubject && <button
          onClick={onCreateSubject}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#7B8291] transition hover:bg-white/70 hover:text-[#4D5CFF]"
        >
          <FolderPlus size={17} strokeWidth={2}/>
          <span>新建文件夹</span>
        </button>}
      </div>
    </nav>
    {onOpenGuide && <div className="shrink-0 border-t border-[#DFE3EA] px-3 py-3">
      <button onClick={onOpenGuide} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#676E7C] transition hover:bg-white/70 hover:text-[#4D5CFF]">
        <CircleHelp size={18}/>
        <span>使用说明</span>
      </button>
    </div>}
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
