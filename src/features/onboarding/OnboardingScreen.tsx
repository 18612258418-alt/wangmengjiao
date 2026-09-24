import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Camera, Check, FileText, Mic, Paperclip, Search, Sparkles, Upload, X } from "lucide-react";

const HIDDEN_FILE_INPUT_STYLE: React.CSSProperties = { position:"absolute", width:1, height:1, padding:0, margin:-1, overflow:"hidden", clip:"rect(0, 0, 0, 0)", whiteSpace:"nowrap", border:0 };

interface Props {
  onEnter: () => void;
  mode?: "first" | "demo";
  onPdfSelected?: (file: File) => void;
  onOpenScreenshot?: () => void;
  onOpenCamera?: () => void;
  onOpenVoice?: () => void;
  onOpenFormFill?: () => void;
}

type Step = "welcome" | "source" | "processing" | "result" | "ask";
const PROCESSING_STEPS = ["保留内容来源", "识别知识与学科", "建立知识之间的关联", "写入你的知识记忆"];
const STEP_ORDER: Step[] = ["welcome", "source", "processing", "result", "ask"];

export function OnboardingScreen({ onEnter, mode = "first" }: Props) {
  const [step, setStep] = useState<Step>("welcome");
  const [leaving, setLeaving] = useState(false);
  const [sourceName, setSourceName] = useState("高等数学课堂笔记.pdf");
  const [processIndex, setProcessIndex] = useState(0);
  const [questionSent, setQuestionSent] = useState(false);
  const processingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const finish = () => { setLeaving(true); window.setTimeout(onEnter, 360); };
  const startProcessing = (name: string) => { setSourceName(name); setProcessIndex(0); setStep("processing"); };

  useEffect(() => {
    if (step !== "processing") return;
    processingTimer.current = window.setInterval(() => {
      setProcessIndex(index => {
        if (index >= PROCESSING_STEPS.length - 1) {
          if (processingTimer.current) window.clearInterval(processingTimer.current);
          window.setTimeout(() => setStep("result"), 550);
          return index;
        }
        return index + 1;
      });
    }, 650);
    return () => { if (processingTimer.current) window.clearInterval(processingTimer.current); };
  }, [step]);

  const currentStepIndex = Math.max(0, STEP_ORDER.indexOf(step));
  return (
    <div className={`fixed inset-0 z-[500] overflow-y-auto bg-[#F5F7FB] transition-all duration-300 ${leaving ? "scale-[1.015] opacity-0" : "scale-100 opacity-100"}`}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -left-24 -top-40 h-[520px] w-[520px] rounded-full bg-[#DDE2FF] opacity-75 blur-[100px]"/><div className="absolute -right-24 bottom-[-220px] h-[560px] w-[560px] rounded-full bg-[#E9DDFB] opacity-65 blur-[120px]"/></div>
      <header className="relative z-10 flex h-20 items-center justify-between px-8">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-[14px] bg-gradient-to-br from-[#EC6392] via-[#CB6CDA] to-[#618AFF] text-white shadow-sm"><Sparkles size={19}/></span><b className="text-[22px] text-[#171A24]">Memo</b></div>
        <button onClick={finish} className="rounded-full px-4 py-2 text-[13px] font-medium text-[#777E8C] transition hover:bg-white/70 hover:text-[#303642]">跳过</button>
      </header>
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-[1040px] flex-col px-8 pb-10">
        <div className="mb-7 flex items-center justify-center gap-2">{STEP_ORDER.map((item,index)=><span key={item} className={`h-1.5 rounded-full transition-all duration-300 ${index===currentStepIndex?"w-9 bg-[#4D5CFF]":index<currentStepIndex?"w-5 bg-[#A9B1FF]":"w-5 bg-[#DDE1E9]"}`}/>)}</div>
        <section className="mx-auto flex w-full max-w-[920px] flex-1 flex-col justify-center rounded-[32px] border border-white/90 bg-white/85 p-10 shadow-[0_24px_80px_rgba(44,52,78,0.10)] backdrop-blur-xl md:p-14">
          {step === "welcome" && <WelcomeStep onStart={()=>setStep("source")} onDemo={()=>startProcessing("示例：定积分换元法课堂笔记")}/>}
          {step === "source" && <SourceStep onBack={()=>setStep("welcome")} onSelect={startProcessing}/>}
          {step === "processing" && <ProcessingStep sourceName={sourceName} activeIndex={processIndex}/>}
          {step === "result" && <ResultStep onEnter={finish} onAsk={()=>setStep("ask")}/>}
          {step === "ask" && <AskStep sent={questionSent} onSend={()=>setQuestionSent(true)} onBack={()=>setStep("result")} onEnter={finish}/>}
        </section>
      </main>
      {mode === "demo" && <button onClick={finish} className="fixed right-5 top-5 z-20 grid h-9 w-9 place-items-center rounded-full bg-white text-[#676E7C] shadow-md" aria-label="关闭引导"><X size={17}/></button>}
    </div>
  );
}

function WelcomeStep({onStart,onDemo}:{onStart:()=>void;onDemo:()=>void}) {
  return <div className="mx-auto max-w-[720px] text-center">
    <span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-[#EEF0FF] text-[#4D5CFF]"><Sparkles size={30}/></span>
    <p className="mt-7 text-[13px] font-semibold tracking-[.12em] text-[#7B84E8]">欢迎使用 MEMO</p>
    <h1 className="mt-3 text-[38px] font-bold leading-[1.25] tracking-[-.03em] text-[#171A24]">把学过的内容<br/>变成属于你的知识记忆</h1>
    <p className="mx-auto mt-5 max-w-[630px] text-[15px] leading-8 text-[#717887]">Memo 不只是保存文件。它会理解你上传、圈选和记录的内容，形成可以持续积累、关联和调用的知识记忆。</p>
    <div className="mt-9 flex justify-center gap-3"><button onClick={onStart} className="flex items-center gap-2 rounded-2xl bg-[#4D5CFF] px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_10px_25px_rgba(77,92,255,.24)]">添加第一份内容 <ArrowRight size={17}/></button><button onClick={onDemo} className="rounded-2xl bg-[#F1F3F7] px-6 py-3.5 text-[14px] font-semibold text-[#505765]">先看看示例</button></div>
    <div className="mt-10 grid grid-cols-3 gap-3 text-left">{[["01","获取内容","文件、板书、录音与圈画"],["02","形成记忆","理解知识，而不是只存文件"],["03","持续生长","在学习和使用中补充更新"]].map(item=><div key={item[0]} className="rounded-2xl bg-[#F7F8FB] p-4"><span className="text-[10px] font-bold text-[#7B84E8]">{item[0]}</span><b className="mt-2 block text-[13px] text-[#303642]">{item[1]}</b><p className="mt-1 text-[11px] text-[#9299A6]">{item[2]}</p></div>)}</div>
  </div>;
}

function SourceStep({onBack,onSelect}:{onBack:()=>void;onSelect:(name:string)=>void}) {
  const cards = [
    {title:"拍板书／扫文档",desc:"拍照后自动识别内容和版式",icon:Camera,tone:"bg-[#FFF2E8] text-[#D77632]",name:"高等数学板书照片.jpg"},
    {title:"开始录音",desc:"边录边转写，收起后继续记录",icon:Mic,tone:"bg-[#EAF8F2] text-[#22865D]",name:"课堂录音 02:36"},
    {title:"体验示例资料",desc:"没有现成内容也可以先体验",icon:BookOpen,tone:"bg-white text-[#7B84E8]",name:"示例：定积分换元法课堂笔记"},
  ];
  return <div className="mx-auto w-full max-w-[760px]">
    <button onClick={onBack} className="mb-5 flex items-center gap-1 text-[12px] font-medium text-[#7B8291]"><ArrowLeft size={15}/>返回</button><p className="text-[12px] font-semibold tracking-[.1em] text-[#7B84E8]">建立第一条知识记忆</p><h1 className="mt-2 text-[30px] font-bold text-[#171A24]">先提供一份知识来源</h1><p className="mt-3 text-[14px] text-[#7A8190]">它可以是一份文件、一张板书或一段课堂录音。Memo 会保留来源，并从中形成知识记忆。</p>
    <div className="mt-8 grid grid-cols-2 gap-4">
      <label className="relative flex min-h-[150px] cursor-pointer flex-col rounded-3xl border border-[#E3E6ED] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#BBC2FF] hover:shadow-md"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EEF0FF] text-[#4D5CFF]"><Upload size={21}/></span><b className="mt-5 text-[15px] text-[#272C36]">上传文件</b><p className="mt-1 text-[11px] text-[#9298A5]">PDF、Word、课件或图片</p><input type="file" accept="application/pdf,.pdf,.doc,.docx,.ppt,.pptx,image/*" style={HIDDEN_FILE_INPUT_STYLE} onChange={event=>{const file=event.target.files?.[0];if(file)onSelect(file.name);event.target.value="";}}/></label>
      {cards.map(({title,desc,icon:Icon,tone,name},index)=><button key={title} onClick={()=>onSelect(name)} className={`flex min-h-[150px] flex-col rounded-3xl border border-[#E3E6ED] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#BBC2FF] hover:shadow-md ${index===2?"bg-[#F8F9FC]":"bg-white"}`}><span className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}><Icon size={21}/></span><b className="mt-5 text-[15px] text-[#272C36]">{title}</b><p className="mt-1 text-[11px] text-[#9298A5]">{desc}</p></button>)}
    </div>
  </div>;
}

function ProcessingStep({sourceName,activeIndex}:{sourceName:string;activeIndex:number}) {
  return <div className="mx-auto w-full max-w-[680px] text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-[#EEF0FF] text-[#4D5CFF]"><Sparkles size={29} className="animate-pulse"/></span><h1 className="mt-6 text-[28px] font-bold text-[#171A24]">Memo 正在形成知识记忆</h1><p className="mt-2 truncate text-[13px] text-[#8B92A0]">来源：{sourceName}</p><div className="mx-auto mt-9 max-w-[500px] space-y-3 text-left">{PROCESSING_STEPS.map((item,index)=>{const done=index<activeIndex;const active=index===activeIndex;return <div key={item} className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all ${active?"border-[#C8CEFF] bg-[#F3F4FF]":done?"border-[#E4E7EE] bg-white":"border-transparent bg-[#F7F8FA] opacity-45"}`}><span className={`grid h-7 w-7 place-items-center rounded-full ${done?"bg-[#E5F6EE] text-[#25825D]":active?"bg-[#4D5CFF] text-white":"bg-[#E7E9EE] text-[#9AA0AC]"}`}>{done?<Check size={14}/>:<span className={active?"h-2 w-2 animate-pulse rounded-full bg-white":"h-2 w-2 rounded-full bg-current"}/>}</span><span className="text-[13px] font-medium text-[#4D5360]">{item}</span></div>;})}</div><p className="mt-7 text-[11px] text-[#A0A6B2]">来源保持原样，知识记忆会随着后续学习继续更新</p></div>;
}

function ResultStep({onEnter,onAsk}:{onEnter:()=>void;onAsk:()=>void}) {
  return <div className="mx-auto w-full max-w-[780px]"><div className="flex items-start justify-between gap-5"><div><p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#26825D]"><Check size={15}/>第一条知识记忆已形成</p><h1 className="mt-2 text-[29px] font-bold text-[#171A24]">定积分换元法</h1><p className="mt-2 text-[12px] text-[#8C93A1]">高等数学 · 关联 3 个知识点 · 状态：待验证</p></div><span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#EEF0FF] text-[#4D5CFF]"><FileText size={25}/></span></div><div className="mt-7 rounded-3xl border border-[#E3E6ED] bg-white p-6"><p className="text-[11px] font-semibold text-[#8A91A0]">知识记忆</p><h2 className="mt-3 text-[18px] font-bold text-[#292E39]">换元后，积分变量、微分和上下限必须保持一致</h2><p className="mt-3 text-[13px] leading-7 text-[#676E7C]">令 u = g(x) 后，原来的 x 上下限也需要代入 u = g(x)，得到新的 u 区间，避免在同一道计算中混用两套变量。</p><div className="mt-5 grid grid-cols-3 gap-3">{["变量与微分同步替换","定积分上下限转换","易错：沿用原区间"].map((item,index)=><div key={item} className={`rounded-2xl px-4 py-3 text-[11px] font-medium ${index===2?"bg-[#FFF4EB] text-[#B7652C]":"bg-[#F3F4FF] text-[#5964C7]"}`}>{item}</div>)}</div></div><div className="mt-5 flex items-center rounded-2xl bg-[#F7F8FB] px-4 py-3 text-[11px] text-[#757C89]"><Paperclip size={14} className="mr-2"/>记忆来自原始内容；后续笔记、作答和复习会继续补充它</div><div className="mt-7 flex justify-end gap-3"><button onClick={onEnter} className="rounded-2xl bg-[#F0F2F6] px-5 py-3 text-[13px] font-semibold text-[#606774]">进入 Memo</button><button onClick={onAsk} className="flex items-center gap-2 rounded-2xl bg-[#4D5CFF] px-5 py-3 text-[13px] font-semibold text-white">看看如何调用记忆 <ArrowRight size={16}/></button></div></div>;
}

function AskStep({sent,onSend,onBack,onEnter}:{sent:boolean;onSend:()=>void;onBack:()=>void;onEnter:()=>void}) {
  return <div className="mx-auto w-full max-w-[760px]"><p className="text-[12px] font-semibold tracking-[.1em] text-[#7B84E8]">知识记忆会在需要时被调用</p><h1 className="mt-2 text-[30px] font-bold text-[#171A24]">记住，不只是存下</h1><p className="mt-3 text-[14px] text-[#7A8190]">搜索、复习和作业会调用同一条知识记忆，并用新的学习结果持续更新它。</p><button onClick={onSend} className="mt-7 flex h-14 w-full items-center rounded-2xl border border-[#DDE1E9] bg-white px-4 text-left shadow-sm transition hover:border-[#BBC2FF]"><Search size={18} className="mr-3 text-[#727A89]"/><span className="flex-1 text-[14px] text-[#343A46]">定积分换元最容易错在哪里？</span><span className="grid h-9 w-9 place-items-center rounded-full bg-[#4D5CFF] text-white"><ArrowRight size={17}/></span></button>{sent?<div className="mt-6 rounded-3xl border border-[#E3E6ED] bg-white p-6 shadow-sm"><p className="flex items-center gap-2 text-[12px] font-semibold text-[#4D5CFF]"><Sparkles size={16}/>Memo 调用了刚形成的知识记忆</p><h2 className="mt-4 text-[18px] font-bold text-[#292E39]">最常见的错误是换元后仍沿用原来的上下限</h2><p className="mt-3 text-[13px] leading-7 text-[#676E7C]">完成换元后，应按“换变量—换微分—换区间”的顺序检查，确保整个积分都使用同一套变量。</p><details className="mt-4 rounded-xl bg-[#F7F8FB] px-4 py-3"><summary className="cursor-pointer text-[11px] font-semibold text-[#717887]">记忆依据</summary><p className="mt-2 text-[11px] leading-6 text-[#8A91A0]">来自刚刚形成的“定积分换元法”知识记忆及其原始课堂笔记。</p></details></div>:<div className="mt-7 grid grid-cols-3 gap-3">{["查看关联知识","生成一次复习","回到原始来源"].map(item=><button key={item} onClick={onSend} className="rounded-2xl bg-[#F7F8FB] px-4 py-4 text-left text-[12px] font-medium text-[#676E7C]">{item}</button>)}</div>}<div className="mt-7 flex justify-between"><button onClick={onBack} className="flex items-center gap-1 text-[12px] font-medium text-[#7B8291]"><ArrowLeft size={15}/>返回知识记忆</button><button onClick={onEnter} className="flex items-center gap-2 rounded-2xl bg-[#4D5CFF] px-6 py-3 text-[13px] font-semibold text-white">进入 Memo <ArrowRight size={16}/></button></div></div>;
}
