import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, X } from "lucide-react";
import { PenToolbar } from "../pen-context/PenToolbar";
import type { PenToolKind } from "../pen-context/types";
import { AiConversationModule } from "../ai-conversation/AiConversationModule";

const PDF_URL = "/social-science/社会比较与青年消费研究报告.pdf";

export function LinkedPdfNoteModal({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(3);
  const [tool, setTool] = useState<PenToolKind>("pencil");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{x:number;y:number}|null>(null);

  useEffect(() => { const canvas=canvasRef.current;if(canvas){canvas.width=1100;canvas.height=900;} }, []);
  const pos=(event:React.PointerEvent<HTMLCanvasElement>)=>{const canvas=event.currentTarget;const r=canvas.getBoundingClientRect();return{x:(event.clientX-r.left)*canvas.width/r.width,y:(event.clientY-r.top)*canvas.height/r.height};};
  const down=(event:React.PointerEvent<HTMLCanvasElement>)=>{const canvas=event.currentTarget;const p=pos(event);if(tool==="eraser"){canvas.getContext("2d")!.clearRect(p.x-28,p.y-28,56,56);return;}drawing.current=p;canvas.setPointerCapture(event.pointerId);};
  const move=(event:React.PointerEvent<HTMLCanvasElement>)=>{if(!drawing.current)return;const p=pos(event);const ctx=event.currentTarget.getContext("2d")!;ctx.strokeStyle="#E64A4A";ctx.lineWidth=5;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(drawing.current.x,drawing.current.y);ctx.lineTo(p.x,p.y);ctx.stroke();drawing.current=p;};
  const up=()=>{drawing.current=null;};
  const clear=()=>canvasRef.current?.getContext("2d")?.clearRect(0,0,1100,900);
  const ask=(question:string)=>page>=2&&page<=4?`已带上原报告第 ${page} 页和你的笔迹。关于“${question}”，这一页主要支持“社会比较如何连接平台刺激与冲动消费”的笔记。`:`已带上原报告第 ${page} 页。关于“${question}”，可以从概念、研究方法以及与挂靠笔记的关系继续分析。`;

  return <div className="fixed inset-0 z-[630] flex h-[100dvh] flex-col bg-[#F3F4F8]">
    <header className="relative flex h-[68px] shrink-0 items-center border-b border-[#E7E9EF] bg-white px-5"><button onClick={onClose} aria-label="关闭 PDF 笔记" className="grid h-9 w-9 place-items-center rounded-xl hover:bg-[#F4F5F8]"><X size={17}/></button><div className="ml-4"><b className="block text-[14px]">社会比较与青年消费研究报告</b><small className="text-[10px] text-[#8A909C]">挂靠笔记：社会比较如何影响冲动消费</small></div><div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2"><button aria-label="上一页 PDF" disabled={page===1} onClick={()=>setPage(p=>p-1)} className="grid h-8 w-8 place-items-center rounded-lg bg-[#F4F5F8] disabled:opacity-30"><ChevronLeft size={15}/></button><b className="min-w-[58px] text-center text-[11px]">{page} / 8</b><button aria-label="下一页 PDF" disabled={page===8} onClick={()=>setPage(p=>p+1)} className="grid h-8 w-8 place-items-center rounded-lg bg-[#F4F5F8] disabled:opacity-30"><ChevronRight size={15}/></button></div><div className="ml-auto flex items-center gap-3"><PenToolbar layout="inline" showMarker={false} tool={tool} onToolChange={setTool}/><button onClick={clear} className="rounded-xl bg-[#F4F5F8] px-3 py-2 text-[10px] text-[#626977]">清空笔迹</button></div></header>
    <main className="grid min-h-0 flex-1 grid-cols-[57%_43%]"><section className="flex min-h-0 flex-col border-r border-[#E1E4EB] bg-[#E9EBF1] p-4"><div className="mb-3 flex items-center"><span className="rounded-full bg-white px-3 py-1.5 text-[9px] font-semibold text-[#4D5CFF]">PDF 原文</span><span className="ml-3 text-[10px] text-[#737A89]">当前定位：第 {page} 页</span></div><div className="min-h-0 flex-1 overflow-hidden rounded-xl bg-white shadow-[0_5px_24px_rgba(27,31,48,.10)]"><object key={page} data={`${PDF_URL}#page=${page}&toolbar=0&navpanes=0&view=FitH`} type="application/pdf" className="h-full w-full"><div className="grid h-full place-items-center p-8 text-center"><FileText size={30} className="mx-auto text-[#4D5CFF]"/><p className="mt-3 text-[12px]">PDF 预览不可用</p><a href={PDF_URL} target="_blank" rel="noreferrer" className="mt-2 block text-[11px] text-[#4D5CFF]">打开原文件</a></div></object></div></section>
      <section className="flex min-h-0 flex-col bg-white p-5"><div><p className="text-[9px] font-bold tracking-[.12em] text-[#9CA3AF]">挂靠笔记</p><h2 className="mt-1 text-[20px] font-bold">社会比较如何影响冲动消费</h2><div className="mt-3 rounded-xl bg-[#F7F8FF] p-3 text-[10px] leading-5 text-[#626977]"><b className="text-[#4D5CFF]">引用范围</b><p className="mt-1">理论类型与作用路径：第 2-4 页</p><p>研究设计与变量测量：第 6-7 页</p></div></div><div className="mt-4 min-h-[220px] flex-1 overflow-hidden rounded-2xl border border-[#DDE1EB]"><div className="flex items-center border-b border-[#ECEEF3] bg-[#FAFBFD] px-4 py-3"><b className="text-[11px]">第 {page} 页批注与笔记</b><span className="ml-auto text-[9px] text-[#4D5CFF]">可直接圈写</span></div><canvas ref={canvasRef} className="block h-full min-h-[220px] w-full touch-none bg-[linear-gradient(#fff_43px,#E9ECF3_44px)] bg-[length:100%_44px]" style={{cursor:tool==="eraser"?"cell":"crosshair"}} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}/></div><AiConversationModule contextKey={`linked-note-${page}`} contextLabel={`研究报告第 ${page} 页 · 挂靠笔记`} initialAssistant="我会同时参考左侧原报告、当前页笔迹和这条挂靠笔记。可以连续追问，也可以直接用语音说明你想核对什么。" onAsk={ask} placeholder={`问第 ${page} 页或这条笔记…`} suggestions={["这页支持了什么观点？","解释圈选内容","检查笔记与原文是否一致"]} className="mt-4 h-[285px] shrink-0 rounded-2xl" compact/></section>
    </main>
  </div>;
}
