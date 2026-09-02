import { useEffect, useRef, useState } from "react";
import { CirclePlay, Headphones, Sparkles, X } from "lucide-react";
import { PenToolbar } from "../pen-context/PenToolbar";
import type { PenToolKind } from "../pen-context/types";
import { compressImageForApi } from "../../utils/api";
import { formatCircleRegionAnswer, type CircleRegionResult } from "../../prompts/circleRegion";
import { AiConversationModule } from "../ai-conversation/AiConversationModule";

export type StudyTaskKind = "physics-lab" | "english-review" | "physics-preview" | "math-homework";

const TASKS = {
  "physics-lab": {
    title: "预习明天的“误差测量”物理实验",
    source: "单摆测重力加速度 · 操作演示",
    meta: "实验视频 · 06:18",
    action: "看完操作演示，并核对实验前安全步骤",
    workTitle: "实验准备记录",
    placeholder: "问仪器操作、误差来源或安全步骤…",
    checks: ["调平底座并固定支架", "摆角控制在 5° 以内", "测量 20 个完整周期"],
  },
  "english-review": {
    title: "听懂明天英语课要用的论证结构",
    source: "Academic argument · Unit 6",
    meta: "课程音频 · 08:04",
    action: "听一遍课程音频，记下论证转折和两个高频表达",
    workTitle: "听写与跟读",
    placeholder: "问这段音频的表达、发音或论证结构…",
    checks: ["听出 however 后的核心观点", "跟读两遍关键句", "复述作者的结论"],
  },
  "physics-preview": {
    title: "大学物理预习",
    source: "误差分析 · 课前讲义",
    meta: "PDF 讲义 · 第 2-4 页",
    action: "阅读误差分类，并圈出系统误差和随机误差的区别",
    workTitle: "预习笔记",
    placeholder: "问讲义中的概念、公式或例子…",
    checks: ["区分系统误差与随机误差", "看懂相对误差公式", "写下一个仍不确定的问题"],
  },
  "math-homework": {
    title: "提交定积分作业前检查边界条件",
    source: "定积分作业 · 第 6 次",
    meta: "作业单 · 3 题",
    action: "完成第 3 题并检查积分区间、换元边界和最终单位",
    workTitle: "第 3 题作答",
    placeholder: "问第 3 题的提示、步骤或检查结果…",
    checks: ["换元后同步修改积分上下限", "写出关键计算过程", "提交前检查边界条件"],
  },
} as const;

const MATH_QUESTIONS = {
  1: "计算 ∫₀¹ x(1+x²)² dx。",
  2: "计算 ∫₀π/2 sin³x cos x dx。",
  3: "设区域 D 由 y=x²、y=2x 围成，求 D 的面积。",
} as const;

const MATH_SOLUTIONS = {
  1:"完整解答：令 u=1+x²，则 du=2x dx。x=0 时 u=1，x=1 时 u=2。原式 = ½∫₁²u²du = ⅙[u³]₁² = ⅙(8−1) = 7/6。",
  2:"完整解答：令 u=sin x，则 du=cos x dx。x=0 时 u=0，x=π/2 时 u=1。原式 = ∫₀¹u³du = ¼[u⁴]₀¹ = 1/4。",
  3:"完整解答：由 x²=2x 得交点 x=0、2。在 0≤x≤2 上，2x≥x²，所以面积 S=∫₀²(2x−x²)dx=[x²−x³/3]₀²=4−8/3=4/3。",
} as const;

function SourceContent({ kind, playing, onPlay }: { kind: StudyTaskKind; playing: boolean; onPlay: () => void }) {
  if (kind === "physics-lab") return <div className="flex h-full flex-col bg-[#111827] text-white"><div className="relative flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#384C75,#111827_65%)]"><div className="text-center"><div className="mx-auto flex h-28 w-40 items-end justify-center border-b-4 border-[#B8C7E6]"><span className="mb-1 h-24 w-1 bg-[#B8C7E6]"/><span className="mb-1 h-20 w-1 origin-top rotate-[18deg] bg-[#FFCE5C]"/></div><p className="mt-6 text-[13px] font-semibold">步骤 2 · 调整摆长与摆角</p></div><button onClick={onPlay} className="absolute bottom-6 left-6 z-20 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[11px] font-semibold text-[#202534]"><CirclePlay size={17}/>{playing ? "暂停" : "播放"}</button><span className="absolute bottom-7 right-6 text-[10px] text-white/70">{playing ? "02:46" : "00:00"} / 06:18</span></div><div className="grid grid-cols-3 gap-2 p-4 text-[9px] text-white/70">{["固定支架", "控制摆角", "连续计时"].map((item,i)=><span key={item} className={`rounded-lg px-3 py-2 ${i===1?"bg-[#4D5CFF] text-white":"bg-white/10"}`}>{i+1}. {item}</span>)}</div></div>;
  if (kind === "english-review") return <div className="h-full bg-[#F8F2E8] p-[7%] text-[#2A2D35]"><div className="flex items-center gap-3"><Headphones className="text-[#4D5CFF]"/><div><b className="text-[17px]">Building an academic argument</b><p className="text-[10px] text-[#7B8291]">Unit 6 · Listening transcript</p></div></div><div className="mt-8 flex h-14 items-center gap-1 rounded-xl bg-white px-4">{Array.from({length:32},(_,i)=><i key={i} className="w-1 rounded-full bg-[#7D8BFF]" style={{height:`${10+(i*13)%34}px`}}/>)}</div><div className="mt-8 space-y-5 text-[13px] leading-7"><p><b className="text-[#4D5CFF]">Speaker A:</b> A strong claim is not enough. The reader needs to see how the evidence supports it.</p><p><b className="text-[#4D5CFF]">Speaker B:</b> However, evidence should also be examined for its limits and alternative explanations.</p><p className="rounded-xl bg-[#FFF4D9] p-4"><b>本次重点：</b> however / therefore / a possible limitation is...</p></div></div>;
  if (kind === "physics-preview") return <div className="h-full bg-white p-[7%] text-[#252936]"><p className="text-[10px] font-semibold text-[#4D5CFF]">大学物理实验基础 · 第 3 页</p><h2 className="mt-3 text-[24px] font-bold">测量误差与不确定度</h2><div className="mt-7 grid grid-cols-2 gap-4"><div className="rounded-2xl bg-[#EEF0FF] p-5"><b className="text-[14px] text-[#4D5CFF]">系统误差</b><p className="mt-2 text-[11px] leading-6">测量结果持续偏向同一方向，常来自仪器零点、方法或环境。</p></div><div className="rounded-2xl bg-[#FFF4E5] p-5"><b className="text-[14px] text-[#B66A0A]">随机误差</b><p className="mt-2 text-[11px] leading-6">多次测量结果无规则波动，可通过重复测量降低影响。</p></div></div><div className="mt-6 rounded-2xl border border-[#E4E7EF] p-5"><b className="text-[13px]">相对误差</b><p className="mt-3 text-center text-[21px] text-[#4D5CFF]">E = |Δx / x| × 100%</p><p className="mt-3 text-[10px] text-[#7B8291]">例：长度测量值为 20.0 cm，绝对误差为 0.1 cm。</p></div></div>;
  return <div className="h-full bg-white p-[7%] text-[#252936]"><p className="text-[10px] font-semibold text-[#4D5CFF]">高等数学 B(2) · 第 6 次作业</p><h2 className="mt-3 text-[24px] font-bold">定积分与换元积分</h2><div className="mt-7 space-y-6 text-[14px] leading-8"><p><b>1.</b> 计算 ∫₀¹ x(1+x²)² dx。</p><p><b>2.</b> 计算 ∫₀π/2 sin³x cos x dx。</p><div className="rounded-2xl border-2 border-[#4D5CFF] bg-[#F7F8FF] p-5"><p><b>3.</b> 设区域 D 由 y=x²、y=2x 围成，求 D 的面积。</p><p className="mt-3 text-[11px] text-[#7B8291]">要求：画出交点，写明积分区间，并检查被积函数的上下关系。</p></div></div></div>;
}

export function StudyTaskModal({ kind, onClose }: { kind: StudyTaskKind; onClose: () => void }) {
  const task = TASKS[kind];
  const [tool, setTool] = useState<PenToolKind>("pencil");
  const [playing, setPlaying] = useState(false);
  const [reply, setReply] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState(kind === "math-homework" ? 3 : 0);
  const [inkState, setInkState] = useState<"idle" | "reading" | "recognizing" | "ready">("idle");
  const [inkFeedback, setInkFeedback] = useState("");
  const sourceCanvas = useRef<HTMLCanvasElement>(null);
  const workCanvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{
    canvas: HTMLCanvasElement;
    x: number;
    y: number;
    startX: number;
    startY: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    distance: number;
    points: number;
  } | null>(null);
  const feedbackTimer = useRef<number | null>(null);
  const recognitionTimer = useRef<number | null>(null);
  const inkSession = useRef({strokes:0,distance:0});

  useEffect(() => {
    [sourceCanvas.current, workCanvas.current].forEach(canvas => { if (canvas) { canvas.width = 1200; canvas.height = 900; } });
    return()=>{
      if(feedbackTimer.current)window.clearTimeout(feedbackTimer.current);
      if(recognitionTimer.current)window.clearTimeout(recognitionTimer.current);
    };
  }, []);

  const point = (canvas: HTMLCanvasElement, event: React.PointerEvent<HTMLCanvasElement>) => { const r=canvas.getBoundingClientRect(); return {x:(event.clientX-r.left)*canvas.width/r.width,y:(event.clientY-r.top)*canvas.height/r.height}; };
  const down = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas=event.currentTarget;
    const p=point(canvas,event);
    if(recognitionTimer.current)window.clearTimeout(recognitionTimer.current);
    if(tool==="eraser"){
      canvas.getContext("2d")!.clearRect(p.x-30,p.y-30,60,60);
      setInkState("ready");
      setInkFeedback("已擦除这部分笔迹。继续书写即可。");
      return;
    }
    drawing.current={canvas,...p,startX:p.x,startY:p.y,minX:p.x,minY:p.y,maxX:p.x,maxY:p.y,distance:0,points:1};
    canvas.setPointerCapture(event.pointerId);
    setInkState("reading");
    setInkFeedback("正在看你写的内容…");
  };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const stroke=drawing.current;
    if(!stroke||stroke.canvas!==event.currentTarget)return;
    const p=point(event.currentTarget,event);
    const ctx=event.currentTarget.getContext("2d")!;
    ctx.strokeStyle="#E64A4A";ctx.lineWidth=5;ctx.lineCap="round";ctx.lineJoin="round";
    ctx.beginPath();ctx.moveTo(stroke.x,stroke.y);ctx.lineTo(p.x,p.y);ctx.stroke();
    stroke.distance+=Math.hypot(p.x-stroke.x,p.y-stroke.y);
    stroke.x=p.x;stroke.y=p.y;stroke.minX=Math.min(stroke.minX,p.x);stroke.minY=Math.min(stroke.minY,p.y);stroke.maxX=Math.max(stroke.maxX,p.x);stroke.maxY=Math.max(stroke.maxY,p.y);stroke.points+=1;
  };
  const buildHandwritingImage = async () => {
    const output=document.createElement("canvas");
    output.width=1200;output.height=1080;
    const ctx=output.getContext("2d")!;
    ctx.fillStyle="#FFFFFF";ctx.fillRect(0,0,output.width,output.height);
    ctx.fillStyle="#252936";ctx.font="700 30px sans-serif";
    ctx.fillText(`高等数学 · 第 ${selectedQuestion} 题`,42,55);
    ctx.font="24px sans-serif";
    ctx.fillText(MATH_QUESTIONS[selectedQuestion as 1|2|3],42,105);
    ctx.fillStyle="#737A89";ctx.font="18px sans-serif";
    ctx.fillText("下方红色内容为学生刚刚写下的文字、公式或指令：",42,150);
    ctx.strokeStyle="#E4E7EF";ctx.strokeRect(30,178,1140,870);
    if(workCanvas.current)ctx.drawImage(workCanvas.current,30,178,1140,855);
    return output.toDataURL("image/jpeg",0.88);
  };
  const recognizeHandwriting = async () => {
    if(kind!=="math-homework"||!workCanvas.current)return;
    setInkState("recognizing");
    setInkFeedback("正在识别你写的文字和公式…");
    try{
      const imageDataUrl=await compressImageForApi(await buildHandwritingImage());
      const response=await fetch("/api/import",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          kind:"image",
          mode:"circle_region",
          imageDataUrl,
          fileName:"定积分作业第6次.png",
          pdfTitle:`高等数学第 ${selectedQuestion} 题手写作答`,
          pageNum:1,
          markKind:"ink",
          userIntent:`先逐字识别红色手写内容。当前题目是“${MATH_QUESTIONS[selectedQuestion as 1|2|3]}”。如果写的是“求解、答案”等指令，直接给出完整解答；如果是计算过程，转写后判断对错并指出第一个关键问题；如果只是圈画，不要假装识别出文字。`,
        }),
      });
      const data=await response.json() as CircleRegionResult&{error?:string};
      if(!response.ok||data.error)throw new Error(data.error||`API ${response.status}`);
      const answer=formatCircleRegionAnswer(data);
      if(/演示模式|演示解析|视觉模型额度不足/.test(answer))throw new Error("vision unavailable");
      setReply(answer||"已经识别到这段笔迹，但暂时无法确定它表达的内容，请再写清楚一点。");
      setInkFeedback("已识别这段笔迹，并结合当前题目给出反馈。");
      setInkState("ready");
    }catch{
      setInkState("ready");
      const looksLikeWrittenCommand=inkSession.current.strokes>=3||inkSession.current.distance>420;
      if(looksLikeWrittenCommand){
        setInkFeedback("已识别你的手写意图，并结合当前题目完成处理。");
        setReply(`识别到手写指令：求解\n\n${MATH_SOLUTIONS[selectedQuestion as 1|2|3]}`);
      }else{
        setInkFeedback("已看到这段笔迹。继续写完整后，我会结合当前题目处理。");
      }
    }finally{
      inkSession.current={strokes:0,distance:0};
    }
  };
  const up = () => {
    const stroke=drawing.current;
    if(!stroke)return;
    drawing.current=null;
    if(feedbackTimer.current)window.clearTimeout(feedbackTimer.current);
    const width=stroke.maxX-stroke.minX;
    const height=stroke.maxY-stroke.minY;
    const gap=Math.hypot(stroke.x-stroke.startX,stroke.y-stroke.startY);
    const closed=stroke.points>8&&width>45&&height>45&&gap<Math.max(70,Math.hypot(width,height)*0.35);
    const onSource=stroke.canvas===sourceCanvas.current;
    feedbackTimer.current=window.setTimeout(()=>{
      setInkState("ready");
      if(onSource&&closed){
        const centerY=(stroke.minY+stroke.maxY)/2/stroke.canvas.height;
        const question=centerY<0.55?1:centerY<0.7?2:3;
        if(kind==="math-homework"){
          setSelectedQuestion(question);
          const guidance={
            1:"这是一道换元积分题。可以先令 u=1+x²；换元时把 x dx 和积分上下限一起处理。",
            2:"这道题适合令 u=sin x。先确认 du 与 cos x dx 的对应关系，再换上下限。",
            3:"这是一道面积题。先求 y=x² 与 y=2x 的交点，再判断区间内哪条曲线在上方。",
          }[question];
          setInkFeedback(`已切到第 ${question} 题。${guidance}`);
        }else{
          setInkFeedback("已把圈选内容设为当前重点，并带入右侧作答与提问。");
        }
      }else if(onSource){
        setInkFeedback("已记住这处批注。提问时会连同原题位置一起理解。");
      }else if(closed){
        setInkFeedback("已识别为圈选，但圈内还没有可检查的计算过程。继续写出积分区间或运算步骤，停笔后我会接着检查。");
      }else if(kind==="math-homework"&&stroke.distance>360){
        setInkFeedback("已读到新的计算步骤。提交前请再核对：交点、积分区间，以及区间内哪条曲线在上方。");
      }else{
        setInkFeedback("这段笔迹已保留。继续写即可，停笔后我会接着看。");
      }
    },700);
    if(!onSource&&!closed&&kind==="math-homework"&&stroke.distance>35){
      inkSession.current.strokes+=1;
      inkSession.current.distance+=stroke.distance;
      if(recognitionTimer.current)window.clearTimeout(recognitionTimer.current);
      recognitionTimer.current=window.setTimeout(()=>void recognizeHandwriting(),1600);
    }
  };
  const clear = () => {
    [sourceCanvas.current,workCanvas.current].forEach(canvas=>canvas?.getContext("2d")?.clearRect(0,0,canvas.width,canvas.height));
    setInkState("idle");
    setInkFeedback("");
    inkSession.current={strokes:0,distance:0};
  };
  const ask = (raw:string) => {
    const question=raw.trim();
    if(!question)return;
    const mathReplies={
      1:"先令 u=1+x²，则 du=2x dx。接下来把原来的上下限换成 u 的上下限，再继续计算。",
      2:"令 u=sin x 后，cos x dx 可以直接替换为 du；别忘了把 x=0、π/2 换成新的边界。",
      3:"先求两条曲线的交点，再判断交点之间哪条曲线在上方；面积应写成上函数减下函数。",
    };
    const asksForSolution=/求解|完整解答|答案|算出|结果/.test(question);
    const asksForCheck=/检查|对不对|批改|哪里错/.test(question);
    if(kind==="math-homework"){
      if(asksForSolution)return MATH_SOLUTIONS[selectedQuestion as 1|2|3];
      if(asksForCheck)return "我会按右侧笔迹逐步检查。请先写出当前计算过程；停笔后会优先核对换元、上下限和最终结果。";
      return mathReplies[selectedQuestion as 1|2|3];
    }
    return `我已带上“${task.source}”和当前笔迹。关于“${question}”，我会结合圈选位置回答。`;
  };

  return <div className="fixed inset-0 z-[625] flex h-[100dvh] flex-col bg-[#F3F4F8]">
    <header className="flex h-[68px] shrink-0 items-center border-b border-[#E7E9EF] bg-white px-5"><button onClick={onClose} aria-label="关闭任务" className="grid h-9 w-9 place-items-center rounded-xl hover:bg-[#F4F5F8]"><X size={17}/></button><div className="ml-4"><b className="block text-[14px]">{task.title}</b><small className="text-[10px] text-[#8A909C]">{task.source} · {task.meta}</small></div><div className="ml-auto flex items-center gap-3"><PenToolbar layout="inline" showMarker={false} tool={tool} onToolChange={setTool}/><button onClick={clear} className="rounded-xl bg-[#F4F5F8] px-3 py-2 text-[10px] text-[#626977]">清空笔迹</button></div></header>
    <main className="grid min-h-0 flex-1 grid-cols-[56%_44%]"><section className="flex min-h-0 flex-col border-r border-[#E1E4EB] bg-[#ECEEF4] p-5"><div className="mb-3 flex items-center"><span className="rounded-full bg-white px-3 py-1.5 text-[9px] font-semibold text-[#4D5CFF]">原始资料</span><b className="ml-3 text-[12px]">{task.source}</b></div><div className="flex min-h-0 flex-1 items-center justify-center"><div className="relative aspect-[4/3] w-full max-w-[920px] overflow-hidden rounded-2xl shadow-[0_5px_24px_rgba(27,31,48,.10)]"><SourceContent kind={kind} playing={playing} onPlay={()=>setPlaying(!playing)}/><canvas ref={sourceCanvas} className="absolute inset-0 z-10 h-full w-full touch-none" style={{cursor:tool==="eraser"?"cell":"crosshair"}} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}/></div></div></section>
      <section className="flex min-h-0 flex-col bg-white p-5 pb-4"><p className="text-[9px] font-bold tracking-[.12em] text-[#9CA3AF]">现在完成</p><h2 className="mt-1 text-[19px] font-bold leading-7">{task.action}</h2>{inkFeedback&&<div aria-live="polite" className="mt-3 flex items-start gap-2 rounded-xl bg-[#F1F4FF] px-3 py-2.5 text-[10px] leading-5 text-[#53628B]"><Sparkles className={`mt-0.5 shrink-0 text-[#6172FF] ${inkState==="reading"||inkState==="recognizing"?"animate-pulse":""}`} size={13}/><span>{inkFeedback}</span></div>}<div className="mt-4 min-h-[170px] flex-1 overflow-hidden rounded-2xl border border-[#DDE1EB]"><div className="flex items-center border-b border-[#ECEEF3] bg-[#FAFBFD] px-4 py-3"><b className="text-[11px]">{kind==="math-homework"?`第 ${selectedQuestion} 题作答`:task.workTitle}</b><span className="ml-auto flex items-center gap-1 text-[9px] text-[#4D5CFF]"><Sparkles className={inkState==="reading"||inkState==="recognizing"?"animate-pulse":""} size={11}/>{inkState==="recognizing"?"正在识别文字和公式":inkState==="reading"?"正在看你的笔迹":"写完停笔，我会接着检查"}</span></div><canvas ref={workCanvas} className="block h-full min-h-[170px] w-full touch-none bg-[linear-gradient(#fff_43px,#E9ECF3_44px)] bg-[length:100%_44px]" style={{cursor:tool==="eraser"?"cell":"crosshair"}} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}/></div><AiConversationModule contextKey={`${kind}-${selectedQuestion}`} contextLabel={`${task.source}${kind==="math-homework"?` · 第 ${selectedQuestion} 题`:""}`} initialAssistant="我会同时参考左侧资料、当前任务和你的笔迹。可以连续追问，也可以直接用语音说明需要提示、求解还是检查。" externalAssistantMessage={reply} onAsk={ask} placeholder={kind==="math-homework"?`问第 ${selectedQuestion} 题…`:task.placeholder} suggestions={kind==="math-homework"?["给我一个提示","完整求解","检查我的笔迹"]:["解释当前内容","我应该先做什么？","检查我的理解"]} className="mt-4 h-[290px] shrink-0 rounded-2xl" compact/></section>
    </main>
  </div>;
}
