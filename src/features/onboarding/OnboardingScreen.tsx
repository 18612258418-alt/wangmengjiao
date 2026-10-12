import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, BookOpen, Brain, Camera, Check, FileText,
  GitFork, Headphones, Library, Mic, Network, RotateCcw, Search,
  Sparkles, Upload, X,
} from "lucide-react";

const HIDDEN_FILE_INPUT_STYLE: React.CSSProperties = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
  overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0,
};

interface Props {
  onEnter: () => void;
  mode?: "first" | "demo";
  onPdfSelected?: (file: File) => void;
  onOpenScreenshot?: () => void;
  onOpenCamera?: () => void;
  onOpenVoice?: () => void;
  onOpenFormFill?: () => void;
}

type Step = "definition" | "agents" | "memory" | "start";
const STEP_ORDER: Step[] = ["definition", "agents", "memory", "start"];
const STEP_LABELS = ["认识 Memo", "理解协作", "持续使用", "开始建立"];

export function OnboardingScreen({ onEnter, mode = "first", onPdfSelected, onOpenCamera, onOpenVoice }: Props) {
  const [step, setStep] = useState<Step>("definition");
  const [leaving, setLeaving] = useState(false);
  const currentIndex = STEP_ORDER.indexOf(step);
  const finish = (next?: () => void) => {
    setLeaving(true);
    window.setTimeout(() => { onEnter(); next?.(); }, 320);
  };

  return <div className={`fixed inset-0 z-[500] overflow-y-auto bg-[#F4F6FA] transition-all duration-300 ${leaving ? "scale-[1.01] opacity-0" : "opacity-100"}`}>
    <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -left-28 -top-48 h-[560px] w-[560px] rounded-full bg-[#DAE3FF] opacity-70 blur-[110px]"/><div className="absolute -right-28 bottom-[-250px] h-[620px] w-[620px] rounded-full bg-[#EADDF8] opacity-60 blur-[130px]"/></div>
    <header className="relative z-10 flex h-[76px] items-center justify-between px-8">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-[14px] bg-gradient-to-br from-[#EC6392] via-[#CB6CDA] to-[#618AFF] text-white shadow-sm"><Sparkles size={19}/></span><b className="text-[22px] text-[#171A24]">Memo</b></div>
      <button onClick={() => finish()} className="rounded-full px-4 py-2 text-[13px] font-medium text-[#777E8C] transition hover:bg-white/75 hover:text-[#303642]">跳过</button>
    </header>
    <main className="relative z-10 mx-auto flex min-h-[calc(100vh-76px)] w-full max-w-[1120px] flex-col px-8 pb-8">
      <nav className="mx-auto mb-5 flex items-center gap-2 rounded-full bg-white/65 p-1.5 shadow-sm ring-1 ring-white/90" aria-label="使用说明进度">
        {STEP_ORDER.map((item,index)=><button key={item} onClick={()=>setStep(item)} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${index===currentIndex?"bg-white text-[#4D5CFF] shadow-sm":index<currentIndex?"text-[#6973C9]":"text-[#A2A8B3]"}`}><span className={`mr-1.5 inline-grid h-4 w-4 place-items-center rounded-full text-[8px] ${index<currentIndex?"bg-[#E5F6EE] text-[#22865D]":index===currentIndex?"bg-[#EEF0FF] text-[#4D5CFF]":"bg-[#ECEEF2] text-[#9AA0AA]"}`}>{index<currentIndex?<Check size={9}/>:index+1}</span>{STEP_LABELS[index]}</button>)}
      </nav>
      <section className="mx-auto flex w-full max-w-[980px] flex-1 flex-col justify-center overflow-hidden rounded-[32px] border border-white/90 bg-white/88 shadow-[0_24px_80px_rgba(44,52,78,0.10)] backdrop-blur-xl">
        {step === "definition" && <DefinitionStep onNext={() => setStep("agents")}/>}
        {step === "agents" && <AgentsStep onBack={() => setStep("definition")} onNext={() => setStep("memory")}/>}
        {step === "memory" && <MemoryStep onBack={() => setStep("agents")} onNext={() => setStep("start")}/>}
        {step === "start" && <StartStep onBack={() => setStep("memory")} onEnter={() => finish()} onUpload={file => finish(() => onPdfSelected?.(file))} onCamera={() => finish(onOpenCamera)} onVoice={() => finish(onOpenVoice)}/>}
      </section>
    </main>
    {mode==="demo"&&<button onClick={()=>finish()} className="fixed right-5 top-5 z-20 grid h-9 w-9 place-items-center rounded-full bg-white text-[#676E7C] shadow-md" aria-label="关闭引导"><X size={17}/></button>}
  </div>;
}

function DefinitionStep({onNext}:{onNext:()=>void}) {
  const sources = [
    {label:"课堂录音",icon:Mic,tone:"bg-[#E8F7F1] text-[#278764]"}, {label:"板书图片",icon:Camera,tone:"bg-[#FFF0E7] text-[#D77838]"},
    {label:"学习资料",icon:FileText,tone:"bg-[#EEF0FF] text-[#5866E8]"}, {label:"日常记录",icon:BookOpen,tone:"bg-[#F4EBFB] text-[#9661C6]"},
  ];
  return <div className="flex min-h-[610px] flex-col">
    <div className="relative flex min-h-[335px] items-center justify-center overflow-hidden border-b border-[#ECEEF3] bg-gradient-to-b from-[#F9FAFF] to-[#F1F5FB] px-10 py-9">
      <div className="absolute left-[9%] top-[17%] h-36 w-36 rounded-full bg-[#DDE5FF] opacity-70 blur-3xl"/><div className="absolute bottom-[10%] right-[11%] h-40 w-40 rounded-full bg-[#EADDF8] opacity-65 blur-3xl"/>
      <div className="relative grid w-full max-w-[720px] grid-cols-[1fr_190px_1fr] items-center gap-8">
        <div className="grid grid-cols-2 gap-3">{sources.map(({label,icon:Icon,tone},index)=><div key={label} className={`rounded-2xl border border-white bg-white/90 p-3 shadow-[0_7px_24px_rgba(44,52,78,.07)] ${index%2?"translate-y-5":""}`}><span className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}><Icon size={17}/></span><b className="mt-3 block text-[11px] text-[#424854]">{label}</b></div>)}</div>
        <div className="flex flex-col items-center"><span className="text-[10px] font-semibold tracking-[.16em] text-[#9AA1AE]">持续汇入</span><ArrowRight size={24} className="my-4 text-[#AAB1C0]"/><div className="grid h-[150px] w-[150px] place-items-center rounded-[42px] bg-white shadow-[0_18px_50px_rgba(77,92,255,.18)] ring-1 ring-[#E2E6FF]"><div className="text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-gradient-to-br from-[#EC6392] via-[#CB6CDA] to-[#618AFF] text-white"><Sparkles size={25}/></span><b className="mt-3 block text-[17px] text-[#242936]">Memo</b></div></div></div>
        <div className="space-y-3">{[["理解知识内容",Brain,"bg-[#EEF0FF] text-[#5866E8]"],["建立记忆关联",Network,"bg-[#F4EBFB] text-[#9661C6]"],["在需要时调用",Search,"bg-[#E8F7F1] text-[#278764]"]].map(([item,Icon,tone])=><div key={item as string} className="flex items-center gap-3 rounded-2xl bg-white/90 px-4 py-3 shadow-[0_7px_24px_rgba(44,52,78,.06)]"><span className={`grid h-7 w-7 place-items-center rounded-full ${tone}`}><Icon size={14}/></span><span className="text-[11px] font-semibold text-[#525966]">{item as string}</span></div>)}</div>
      </div>
    </div>
    <div className="flex flex-1 items-end justify-between gap-8 px-12 py-9"><div className="max-w-[650px]"><p className="text-[11px] font-bold tracking-[.14em] text-[#7B84E8]">MEMO 是你的个人知识记忆</p><h1 className="mt-2 text-[31px] font-bold tracking-[-.02em] text-[#171A24]">让你接触过的知识，成为可以继续使用的记忆</h1><p className="mt-3 text-[14px] leading-7 text-[#747B89]">Memo 会保存并理解你的学习资料、课堂录音和日常记录，把零散内容整理成可搜索、可关联、可复习的个人知识记忆。</p></div><button onClick={onNext} className="flex shrink-0 items-center gap-2 rounded-2xl bg-[#4D5CFF] px-5 py-3.5 text-[13px] font-semibold text-white shadow-[0_10px_25px_rgba(77,92,255,.22)]">看看如何工作 <ArrowRight size={16}/></button></div>
  </div>;
}

const AGENTS = [
  {name:"高数 Agent",result:"定位换元边界易错点",icon:BookOpen,color:"#3478F6",bg:"#EAF2FF"}, {name:"物理 Agent",result:"关联机械振动知识",icon:Network,color:"#8357E8",bg:"#F1EBFF"},
  {name:"英语 Agent",result:"整理课堂表达与术语",icon:Headphones,color:"#F07B24",bg:"#FFF1E8"}, {name:"日程 Agent",result:"识别作业与复习时间",icon:Check,color:"#E93C70",bg:"#FFEAF1"},
];

function AgentsStep({onBack,onNext}:{onBack:()=>void;onNext:()=>void}) {
  const [phase,setPhase]=useState(0); const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{timer.current=window.setTimeout(()=>setPhase(value=>value<5?value+1:value),phase===0?450:650);return()=>{if(timer.current)window.clearTimeout(timer.current);};},[phase]);
  return <div className="flex min-h-[610px] flex-col px-10 py-8">
    <div className="flex items-start justify-between gap-5"><div><p className="text-[11px] font-bold tracking-[.14em] text-[#7B84E8]">MULTI-AGENT 协作</p><h1 className="mt-2 text-[28px] font-bold text-[#171A24]">一个任务，由多个学科 Agent 同时完成</h1><p className="mt-2 text-[13px] text-[#7A8190]">Memo 判断你的目标，分配给相关学科，最后把结果合成与你有关的答案。</p></div><span className="rounded-full bg-[#F0F2F6] px-3 py-2 text-[10px] font-semibold text-[#697180]">{phase>=5?"4 / 4 已合并":`${Math.max(0,phase-1)} / 4 处理中`}</span></div>
    <div className="mt-6 flex flex-1 flex-col rounded-[26px] border border-[#E4E7ED] bg-[#F7F8FA] p-5">
      <div className={`mx-auto flex w-full max-w-[580px] items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm transition ${phase>=1?"ring-2 ring-[#DDE1FF]":"opacity-65"}`}><span className="grid h-10 w-10 place-items-center rounded-full bg-[#171A24] text-white">{phase>=1?<Check size={18}/>:<Sparkles size={18}/>}</span><div className="min-w-0 flex-1"><p className="text-[9px] font-bold tracking-[.12em] text-[#9AA1AE]">MEMO 主 AGENT</p><b className="mt-1 block truncate text-[13px] text-[#303642]">整理我最近的学习资料，并告诉我接下来先做什么</b></div><GitFork size={19} className={phase>=2?"text-[#4D5CFF]":"text-[#B7BDC8]"}/></div>
      <FlowDivider active={phase>=2} label="并行分发" green={false}/>
      <div className="grid grid-cols-4 gap-3">{AGENTS.map(({name,result,icon:Icon,color,bg},index)=>{const active=phase>=2+Math.min(index,2);return <div key={name} className={`rounded-2xl border bg-white p-3.5 transition-all duration-500 ${active?"translate-y-0 border-white opacity-100 shadow-[0_8px_24px_rgba(34,40,65,.08)]":"translate-y-2 border-transparent opacity-40"}`}><span className="grid h-9 w-9 place-items-center rounded-full" style={{background:bg,color}}>{active?<Check size={16}/>:<Icon size={16}/>}</span><b className="mt-3 block text-[11px] text-[#343A46]">{name}</b><p className="mt-1 min-h-8 text-[9px] leading-4 text-[#8A919E]">{active?result:"等待主任务分发"}</p></div>;})}</div>
      <FlowDivider active={phase>=5} label="结果回流" green/>
      <div className={`mx-auto flex w-full max-w-[560px] items-center gap-3 rounded-2xl border px-5 py-3.5 transition-all ${phase>=5?"border-[#C9EADB] bg-white opacity-100 shadow-sm":"border-transparent bg-[#ECEEF2] opacity-45"}`}><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#E8F7F1] text-[#278764]"><Library size={16}/></span><div><b className="text-[12px] text-[#303642]">合并为一份学习建议</b><p className="mt-1 text-[9px] text-[#87909D]">保留每个结论的学科与原始资料依据</p></div></div>
    </div>
    <div className="mt-6 flex items-center justify-between"><button onClick={onBack} className="flex items-center gap-1 text-[12px] font-medium text-[#7B8291]"><ArrowLeft size={15}/>上一页</button><div className="flex gap-2"><button onClick={()=>setPhase(0)} className="flex items-center gap-1.5 rounded-xl bg-[#F0F2F6] px-4 py-2.5 text-[11px] font-semibold text-[#626977]"><RotateCcw size={13}/>重新播放</button><button onClick={onNext} className="flex items-center gap-2 rounded-xl bg-[#4D5CFF] px-5 py-2.5 text-[12px] font-semibold text-white">记忆如何被使用 <ArrowRight size={15}/></button></div></div>
  </div>;
}

function FlowDivider({active,label,green}:{active:boolean;label:string;green:boolean}) {
  const color=green?"#AFE0CC":"#BFC6FF"; return <div className="my-4 flex items-center justify-center gap-2"><span className="h-px w-[36%] transition" style={{background:active?color:"#DDE1E8"}}/><span className={`rounded-full px-3 py-1 text-[9px] font-semibold transition ${active?(green?"bg-[#E8F7F1] text-[#278764]":"bg-[#EEF0FF] text-[#4D5CFF]"):"bg-[#ECEEF2] text-[#9AA0AA]"}`}>{label}</span><span className="h-px w-[36%] transition" style={{background:active?color:"#DDE1E8"}}/></div>;
}

function MemoryStep({onBack,onNext}:{onBack:()=>void;onNext:()=>void}) {
  const uses=[
    {title:"搜索时回答问题",desc:"调用与你有关的内容，不只是通用答案",icon:Search,tone:"bg-[#EEF0FF] text-[#5261E3]"}, {title:"复习时生成重点",desc:"结合学过的内容和薄弱点安排复习",icon:Brain,tone:"bg-[#F2EBFB] text-[#925EC3]"},
    {title:"发现作业与待办",desc:"从课堂记录中识别下一步行动",icon:Check,tone:"bg-[#E8F7F1] text-[#278764]"}, {title:"回到原文与原音",desc:"每个结论都保留来源，可以随时核对",icon:Headphones,tone:"bg-[#FFF1E8] text-[#D97835]"},
  ];
  const UseCard=({item}:{item:typeof uses[number]})=>{const Icon=item.icon;return <div className="rounded-2xl border border-[#E7E9EF] bg-white p-4"><span className={`grid h-9 w-9 place-items-center rounded-xl ${item.tone}`}><Icon size={16}/></span><b className="mt-3 block text-[12px] text-[#353B47]">{item.title}</b><p className="mt-1 text-[9px] leading-4 text-[#8C93A0]">{item.desc}</p></div>;};
  return <div className="flex min-h-[610px] flex-col px-11 py-9"><div className="text-center"><p className="text-[11px] font-bold tracking-[.14em] text-[#7B84E8]">保存不是终点</p><h1 className="mt-2 text-[29px] font-bold text-[#171A24]">同一条记忆，会在需要时继续帮助你</h1><p className="mx-auto mt-3 max-w-[650px] text-[13px] leading-7 text-[#7A8190]">搜索、复习、作业和新的资料都会调用并更新同一套个人知识记忆。</p></div>
    <div className="mx-auto mt-8 grid w-full max-w-[780px] grid-cols-[1fr_180px_1fr] items-center gap-7"><div className="space-y-3">{uses.slice(0,2).map(item=><UseCard key={item.title} item={item}/>)}</div><div className="grid h-[180px] place-items-center rounded-[44px] bg-gradient-to-b from-[#F0F2FF] to-[#FAF7FF] shadow-[0_16px_45px_rgba(77,92,255,.13)] ring-1 ring-[#E0E4FF]"><div className="text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-white text-[#4D5CFF] shadow-sm"><Library size={25}/></span><b className="mt-3 block text-[14px] text-[#303642]">个人知识记忆</b><p className="mt-1 text-[9px] text-[#9299A6]">持续积累 · 相互关联</p></div></div><div className="space-y-3">{uses.slice(2).map(item=><UseCard key={item.title} item={item}/>)}</div></div>
    <div className="mt-auto flex items-center justify-between pt-7"><button onClick={onBack} className="flex items-center gap-1 text-[12px] font-medium text-[#7B8291]"><ArrowLeft size={15}/>上一页</button><button onClick={onNext} className="flex items-center gap-2 rounded-2xl bg-[#4D5CFF] px-5 py-3 text-[12px] font-semibold text-white">添加我的第一份记忆 <ArrowRight size={15}/></button></div></div>;
}

function StartStep({onBack,onEnter,onUpload,onCamera,onVoice}:{onBack:()=>void;onEnter:()=>void;onUpload:(file:File)=>void;onCamera:()=>void;onVoice:()=>void}) {
  const actions=[{title:"录一段课堂内容",desc:"边录边转写，完成后自动整理",icon:Mic,tone:"bg-[#E8F7F1] text-[#278764]",action:onVoice},{title:"添加图片或扫描件",desc:"拍板书、从相册选择或扫描文档",icon:Camera,tone:"bg-[#FFF1E8] text-[#D97835]",action:onCamera}];
  return <div className="flex min-h-[610px] flex-col px-12 py-10"><div className="text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-[#EEF0FF] text-[#4D5CFF]"><Sparkles size={25}/></span><h1 className="mt-5 text-[30px] font-bold text-[#171A24]">从一份你正在学习的内容开始</h1><p className="mt-3 text-[13px] text-[#7A8190]">原始资料会被保留，Memo 会把它整理成可以继续搜索、关联和复习的知识记忆。</p></div>
    <div className="mx-auto mt-9 grid w-full max-w-[760px] grid-cols-3 gap-4"><label className="relative flex min-h-[190px] cursor-pointer flex-col rounded-3xl border border-[#E1E5EC] bg-white p-5 transition hover:-translate-y-1 hover:border-[#BBC2FF] hover:shadow-lg"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EEF0FF] text-[#4D5CFF]"><Upload size={20}/></span><b className="mt-6 text-[14px] text-[#303642]">上传学习资料</b><p className="mt-2 text-[10px] leading-5 text-[#8E95A2]">PDF、课件、Word 或图片</p><span className="mt-auto flex items-center gap-1 text-[10px] font-semibold text-[#4D5CFF]">选择文件 <ArrowRight size={12}/></span><input type="file" accept="application/pdf,.pdf,.doc,.docx,.ppt,.pptx,image/*" style={HIDDEN_FILE_INPUT_STYLE} onChange={event=>{const file=event.target.files?.[0];if(file)onUpload(file);event.target.value="";}}/></label>{actions.map(({title,desc,icon:Icon,tone,action})=><button key={title} onClick={action} className="flex min-h-[190px] flex-col rounded-3xl border border-[#E1E5EC] bg-white p-5 text-left transition hover:-translate-y-1 hover:border-[#BBC2FF] hover:shadow-lg"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}><Icon size={20}/></span><b className="mt-6 text-[14px] text-[#303642]">{title}</b><p className="mt-2 text-[10px] leading-5 text-[#8E95A2]">{desc}</p><span className="mt-auto flex items-center gap-1 text-[10px] font-semibold text-[#4D5CFF]">立即开始 <ArrowRight size={12}/></span></button>)}</div>
    <div className="mt-auto flex items-center justify-between pt-8"><button onClick={onBack} className="flex items-center gap-1 text-[12px] font-medium text-[#7B8291]"><ArrowLeft size={15}/>上一页</button><button onClick={onEnter} className="rounded-xl px-4 py-2.5 text-[11px] font-semibold text-[#7A8190] hover:bg-[#F1F3F7]">先进入 Memo</button></div></div>;
}
