import { useState, useRef, useEffect } from "react";
import { X, Camera, SwitchCamera, Loader2 } from "lucide-react";
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
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [camError, setCamError] = useState(false);
  const [cameraCount, setCameraCount] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

    const corrected = await correctPerspectiveDataUrl(raw);
    onSave(corrected);   // → App.tsx processImage → FlyThumbnail
    onClose();
  };

  // 降级：系统相机拍完直接自动保存
  const handleInputCapture = async (url: string) => {
    setPhase("saving");
    const corrected = await correctPerspectiveDataUrl(url);
    onSave(corrected);
    onClose();
  };

  if ((!isMediaSupported() || camError) && phase === "preview") {
    return <InputCaptureFallback onCapture={handleInputCapture} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-[600] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white">
          <X size={18} />
        </button>
        <p className="text-white text-[15px]" style={{ fontWeight: 600 }}>拍照</p>
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
        {phase === "saving" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={28} className="animate-spin text-white" />
              <span className="text-white/80 text-[13px]">正在保存…</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center px-8 py-8 flex-shrink-0">
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
