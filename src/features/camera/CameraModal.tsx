import { useState, useRef, useEffect } from "react";
import { X, Camera, SwitchCamera, Loader2, Image, ScanLine } from "lucide-react";
import { correctPerspectiveDataUrl } from "./perspectiveCorrect";

interface Props {
  onClose: () => void;
  onSave: (imageDataUrl: string) => void;
}

type Phase = "preview" | "saving";

function isMediaSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    (location.protocol === "https:" ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1")
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── 非安全上下文降级：调起系统相机 ─────────────────────────────────────────
function InputCaptureFallback({
  onCapture,
  onClose,
}: {
  onCapture: (url: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async e => {
          const file = e.target.files?.[0];
          if (!file) { onClose(); return; }
          onCapture(await fileToDataUrl(file));
          e.target.value = "";
        }}
      />
      <div className="fixed inset-0 z-[600] bg-black flex flex-col items-center justify-center gap-6">
        <Camera size={52} className="text-white/50" />
        <p className="text-white/70 text-[16px] font-medium">点击打开相机</p>
        <button
          onClick={() => ref.current?.click()}
          className="px-8 py-3 rounded-full bg-white text-black text-[15px] font-semibold active:scale-95 transition-transform"
        >
          打开相机
        </button>
        <button onClick={onClose} className="text-white/40 text-[13px] mt-2 underline">取消</button>
      </div>
    </>
  );
}

export function CameraModal({ onClose, onSave }: Props) {
  const [phase, setPhase] = useState<Phase>("preview");
  const [captureMode, setCaptureMode] = useState<"board" | "scan">("board");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [camError, setCamError] = useState(false);
  const [cameraCount, setCameraCount] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(devices => {
      const count = devices.filter(d => d.kind === "videoinput").length;
      setCameraCount(count);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isMediaSupported() || phase !== "preview") return;
    let active = true;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          try { await video.play(); } catch { /* autoplay policy */ }
        }
      } catch (err) {
        console.error("[Camera]", err);
        if (active) setCamError(true);
      }
    }
    void start();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [facingMode, phase]);

  // 快门：拍照 → 停流 → 透视矫正 → 自动保存 → 关闭
  const handleShutter = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || phase === "saving") return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);
    const raw = canvas.toDataURL("image/jpeg", 0.92);

    // 停流，进入保存态（按钮 spinner）
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setPhase("saving");

    const result = captureMode === "scan" ? await correctPerspectiveDataUrl(raw) : raw;
    onSave(result);   // → App.tsx processImage → FlyThumbnail
    onClose();
  };

  // 降级：系统相机拍完直接自动保存
  const handleInputCapture = async (url: string) => {
    setPhase("saving");
    const corrected = await correctPerspectiveDataUrl(url);
    onSave(corrected);
    onClose();
  };

  const handleChosenImage = async (file: File | undefined, applyCorrection: boolean) => {
    if (!file) return;
    setPhase("saving");
    const raw = await fileToDataUrl(file);
    const result = applyCorrection ? await correctPerspectiveDataUrl(raw) : raw;
    onSave(result);
    onClose();
  };

  if ((!isMediaSupported() || camError) && phase === "preview") {
    return <InputCaptureFallback onCapture={handleInputCapture} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-[600] bg-black flex flex-col">
      <input ref={albumInputRef} type="file" accept="image/*" className="hidden" onChange={event => { void handleChosenImage(event.target.files?.[0], false); event.currentTarget.value = ""; }}/>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white">
          <X size={18} />
        </button>
        <p className="text-white text-[15px]" style={{ fontWeight: 600 }}>{captureMode === "scan" ? "扫描文档" : "拍板书"}</p>
        {cameraCount >= 2 ? (
          <button
            onClick={() => setFacingMode(m => (m === "environment" ? "user" : "environment"))}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <SwitchCamera size={18} />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#000" }}
        />
        {captureMode === "scan" && phase === "preview" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 px-[8vw] py-[7vh]">
            <div className="relative aspect-[1/1.35] h-full max-h-[72vh] max-w-[76vw] rounded-[18px] border border-white/35 bg-white/[.03] shadow-[0_0_0_999px_rgba(0,0,0,.18)]">
              <span className="absolute -left-0.5 -top-0.5 h-12 w-12 rounded-tl-[18px] border-l-[3px] border-t-[3px] border-white"/>
              <span className="absolute -right-0.5 -top-0.5 h-12 w-12 rounded-tr-[18px] border-r-[3px] border-t-[3px] border-white"/>
              <span className="absolute -bottom-0.5 -left-0.5 h-12 w-12 rounded-bl-[18px] border-b-[3px] border-l-[3px] border-white"/>
              <span className="absolute -bottom-0.5 -right-0.5 h-12 w-12 rounded-br-[18px] border-b-[3px] border-r-[3px] border-white"/>
              <div className="absolute inset-x-8 top-1/2 h-px animate-pulse bg-[#79C8FF] shadow-[0_0_10px_#79C8FF]"/>
              <p className="absolute inset-x-0 -bottom-11 text-center text-[13px] font-medium text-white/85">将文档完整放入扫描框内</p>
            </div>
          </div>
        )}
        {phase === "saving" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={28} className="animate-spin text-white" />
              <span className="text-white/80 text-[13px]">正在保存…</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center gap-5 px-8 py-6 flex-shrink-0">
        <div className="flex items-center rounded-full bg-white/10 p-1.5 text-white backdrop-blur-sm">
          <button type="button" onClick={() => setCaptureMode("board")} className={`flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition ${captureMode === "board" ? "bg-white text-black" : "text-white hover:bg-white/10"}`}>
            <Camera size={16}/><span>拍板书</span>
          </button>
          <button type="button" onClick={() => albumInputRef.current?.click()} className="flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-semibold text-white transition hover:bg-white/10">
            <Image size={16}/><span>相册</span>
          </button>
          <button type="button" onClick={() => setCaptureMode("scan")} className={`flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition ${captureMode === "scan" ? "bg-white text-black" : "text-white hover:bg-white/10"}`}>
            <ScanLine size={16}/><span>扫文档</span>
          </button>
        </div>
        <button
          onClick={handleShutter}
          disabled={phase === "saving"}
          className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-50"
        >
          {phase === "saving"
            ? <Loader2 size={28} className="animate-spin text-[#4D5CFF]" />
            : <Camera size={32} className="text-[#020418]" />}
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
