import { useState, useRef, useEffect } from "react";
import {
  X, Check, Undo2, Redo2, Pencil, Highlighter, Eraser, MoreVertical,
} from "lucide-react";
import { COLORS, TYPE_BG, imgNotesBg } from "../../data/initialData";

type PenType = "pencil" | "marker" | "eraser";

export function AnnotationModal({
  type,
  onClose,
  onSave,
}: {
  type: string;
  onClose: () => void;
  onSave: (imageDataUrl: string, hasAnnotations: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImgRef = useRef<HTMLImageElement>(null);
  const [drawColor, setDrawColor] = useState("#EF4444");
  const [isDrawing, setIsDrawing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [penType, setPenType] = useState<PenType>("pencil");
  const [showPenPanel, setShowPenPanel] = useState(false);

  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef(false);
  const snapshots = useRef<string[]>([]);
  const snapIdx = useRef(-1);

  const getLineWidth = (pt: PenType) =>
    pt === "marker" ? 9 : pt === "eraser" ? 26 : 2.5;

  const saveSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    snapshots.current = snapshots.current.slice(0, snapIdx.current + 1);
    snapshots.current.push(canvas.toDataURL());
    snapIdx.current = snapshots.current.length - 1;
  };

  const restoreSnapshot = (dataUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); };
    img.src = dataUrl;
  };

  const undo = () => {
    if (snapIdx.current < 0) return;
    if (snapIdx.current === 0) {
      const canvas = canvasRef.current;
      if (canvas) canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
      snapIdx.current = -1;
      return;
    }
    snapIdx.current--;
    restoreSnapshot(snapshots.current[snapIdx.current]);
  };

  const redo = () => {
    if (snapIdx.current >= snapshots.current.length - 1) return;
    snapIdx.current++;
    restoreSnapshot(snapshots.current[snapIdx.current]);
  };

  const captureComposite = (): string => {
    const canvas = canvasRef.current!;
    const MAX_W = 900;
    const scale = Math.min(1, MAX_W / (canvas.width || 900));
    const offW = Math.round((canvas.width || 900) * scale);
    const offH = Math.round((canvas.height || 600) * scale);
    const off = document.createElement("canvas");
    off.width = offW;
    off.height = offH;
    const ctx = off.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, offW, offH);
    const img = bgImgRef.current;
    if (img && img.naturalWidth > 0) {
      const iA = img.naturalWidth / img.naturalHeight;
      const cA = offW / offH;
      let dw, dh, dx, dy;
      if (iA > cA) { dw = offW; dh = offW / iA; dx = 0; dy = (offH - dh) / 2; }
      else { dh = offH; dw = offH * iA; dy = 0; dx = (offW - dw) / 2; }
      ctx.drawImage(img, dx, dy, dw, dh);
    }
    ctx.drawImage(canvas, 0, 0, offW, offH);
    return off.toDataURL("image/jpeg", 0.72);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w;
    canvas.height = h;
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    hasMoved.current = false;
    lastPos.current = getPos(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos.current) return;
    hasMoved.current = true;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    if (penType === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = penType === "marker"
        ? `${drawColor}66`
        : drawColor;
    }
    ctx.lineWidth = getLineWidth(penType);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const handlePointerUp = () => {
    if (isDrawing) {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) ctx.globalCompositeOperation = "source-over";
      if (hasMoved.current) {
        saveSnapshot();
        if (!showPenPanel) setShowPenPanel(true);
      }
    }
    setIsDrawing(false);
    lastPos.current = null;
    hasMoved.current = false;
  };

  const toolBtn = (active: boolean) =>
    `w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
      active ? "bg-[#EEF0FF] text-[#4D5CFF]" : "hover:bg-[#F5F6FA] text-[#191919]"
    }`;

  const panelCls = "bg-white rounded-2xl border border-[rgba(0,0,0,0.1)] shadow-[0px_5px_12px_rgba(0,0,0,0.1)] h-14 flex items-center px-2 gap-0.5";

  const bgSrc = TYPE_BG[type] ?? imgNotesBg;

  const guidanceText: Record<string, string> = {
    courseware: "您正在上课中，这是您的课件，您不用费心手写笔记，只需使用手写笔圈选标注您关注的知识点， AI 将自动帮您留存记录重点内容",
    notes: "您正在整理课堂笔记，只需圈选标注您关注的知识点或公式， AI 将自动帮您提炼并留存重点内容",
    exercises: "您正在观看网课，只需使用手写笔圈选标注屏幕上您关注的知识点或公式， AI 将自动帮您提炼并留存核心内容",
    webpage: "您正在浏览参考资料，圈选标注您关注的内容， AI 将自动帮您摘录并整理知识点",
  };

  return (
    <div className="fixed inset-0 z-[600]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${bgSrc})`,
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#fff",
        }}
      />
      <img
        ref={bgImgRef}
        src={bgSrc}
        alt=""
        crossOrigin="anonymous"
        style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1 }}
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: "crosshair", touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      <div className="absolute top-4 left-0 right-0 flex items-start justify-between px-5 z-10 pointer-events-none">
        <div className={`${panelCls} pointer-events-auto`}>
          <button onClick={onClose} className={toolBtn(false)} title="关闭">
            <X size={18} />
          </button>
        </div>

        <div
          className={`${panelCls} pointer-events-auto px-3 gap-1 transition-all duration-300`}
          style={{
            opacity: showPenPanel ? 1 : 0,
            transform: showPenPanel ? "translateY(0)" : "translateY(-10px)",
            pointerEvents: showPenPanel ? "auto" : "none",
          }}
        >
          <button onClick={undo} className={toolBtn(false)} title="撤销">
            <Undo2 size={17} />
          </button>
          <button onClick={redo} className={toolBtn(false)} title="重做">
            <Redo2 size={17} />
          </button>

          <div className="w-px h-6 bg-[#E9E9E9] mx-1 flex-shrink-0" />

          <button onClick={() => setPenType("pencil")} className={toolBtn(penType === "pencil")} title="铅笔">
            <Pencil size={17} />
          </button>
          <button onClick={() => setPenType("marker")} className={toolBtn(penType === "marker")} title="荧光笔">
            <Highlighter size={17} />
          </button>
          <button onClick={() => setPenType("eraser")} className={toolBtn(penType === "eraser")} title="橡皮擦">
            <Eraser size={17} />
          </button>

          <div className="w-px h-6 bg-[#E9E9E9] mx-1 flex-shrink-0" />

          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowColorPicker(v => !v)}
              className="w-7 h-7 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 flex-shrink-0"
              style={{ background: drawColor }}
              title="颜色"
            />
            {showColorPicker && (
              <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl p-3 flex gap-2.5 z-20">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => { setDrawColor(c); setShowColorPicker(false); }}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                    style={{ background: c }}
                  >
                    {drawColor === c && <Check size={12} className="text-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`${panelCls} pointer-events-auto px-3 gap-1`}>
          <button
            onClick={() => onSave(captureComposite(), showPenPanel)}
            className="px-4 py-1.5 text-[14px] bg-[#1a2b6b] text-white rounded-lg hover:bg-[#142057] transition-all duration-300 cursor-pointer"
            style={{ fontWeight: 600 }}
            title={showPenPanel ? "完成您在图片上的标注并开始 AI 深度分析" : "无需画笔标注，直接对全图进行 AI 深度分析"}
          >
            {showPenPanel ? "完成批注并分析" : "直接分析全图"}
          </button>
          <div className="w-px h-5 bg-[#E9E9E9] mx-0.5 flex-shrink-0" />
          <button className={toolBtn(false)} title="更多">
            <MoreVertical size={17} />
          </button>
        </div>
      </div>

      <div
        className="absolute left-1/2 z-10 pointer-events-none transition-all duration-500"
        style={{
          top: "84px",
          opacity: showPenPanel ? 0 : 1,
          transform: showPenPanel ? "translate(-50%, -6px)" : "translate(-50%, 0)",
        }}
      >
        <div className="bg-[rgba(10,12,30,0.72)] backdrop-blur-sm text-white text-[13px] px-5 py-3 rounded-2xl max-w-[560px] text-center leading-6 shadow-xl">
          {guidanceText[type] ?? guidanceText.notes}
        </div>
      </div>
    </div>
  );
}
