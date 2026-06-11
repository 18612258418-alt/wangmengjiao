import { useState, useRef, useEffect, useCallback } from "react";
import { X, Mic, Square, Loader2, BookmarkCheck } from "lucide-react";

interface Props {
  onClose: () => void;
  /** 转录完成后回调，传入转录文字，由 App 层保存到记忆 */
  onSave: (transcript: string) => void;
}

type Phase = "idle" | "recording" | "transcribing" | "done" | "saved";

// Demo 降级文本（API 未配置时使用）
const DEMO_TRANSCRIPT = `好的，今天我们继续讲第十二章机械振动与机械波。

上节课我们介绍了简谐振动的基本方程 x(t) = A·cos(ωt + φ₀)，今天重点讲旋转矢量法和多振动的叠加。

旋转矢量法的核心思想是用一个匀速旋转的矢量来表示简谐振动，矢量的长度等于振幅，矢量在 x 轴上的投影就是位移。

当 N 个同频等幅振动叠加时，相邻振动的相位差为 δ，合振幅公式为 R = A·sin(Nδ/2) / sin(δ/2)。

下课前布置一道题：两列振幅相同、频率相同但相位相差 π/3 的振动叠加，求合振幅和初相位。`;

// 随机波形柱高度（录音时动态更新）
function useWaveform(active: boolean) {
  const [bars, setBars] = useState(() => Array.from({ length: 28 }, () => 0.15));

  useEffect(() => {
    if (!active) {
      setBars(Array.from({ length: 28 }, () => 0.15));
      return;
    }
    const id = setInterval(() => {
      setBars(prev => prev.map((v, i) => {
        const target = Math.random() * 0.7 + 0.15;
        return v + (target - v) * (0.25 + Math.sin(i) * 0.1);
      }));
    }, 80);
    return () => clearInterval(id);
  }, [active]);

  return bars;
}

// 格式化秒数 → mm:ss
function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function VoiceModal({ onClose, onSave }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const bars = useWaveform(phase === "recording");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  // 清理
  useEffect(() => () => {
    stopTimer();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const handleSave = useCallback(() => {
    if (!transcript) return;
    setPhase("saved");
    onSave(transcript); // → App.tsx 触发 FlyThumbnail，保持录音页面不关闭
  }, [transcript, onSave]);

  const startRecording = useCallback(async () => {
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100);
      setPhase("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      // 麦克风权限被拒 → 直接用 demo
      setPhase("transcribing");
      setTimeout(() => { setTranscript(DEMO_TRANSCRIPT); setPhase("done"); }, 1200);
    }
  }, []);

  const stopRecording = useCallback(() => {
    stopTimer();
    const mr = mediaRecorderRef.current;
    if (!mr) return;

    mr.onstop = async () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      setPhase("transcribing");

      const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
      const ext = mr.mimeType?.includes("ogg") ? "ogg"
        : mr.mimeType?.includes("mp4") ? "mp4" : "webm";

      try {
        const base64 = await blobToBase64(blob);
        const res = await fetch("/api/audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioBase64: base64, format: ext, fileName: `recording.${ext}` }),
        });
        if (res.ok) {
          const data = await res.json() as { transcript?: string; error?: string };
          setTranscript(data.transcript || DEMO_TRANSCRIPT);
        } else {
          setTranscript(DEMO_TRANSCRIPT);
        }
      } catch {
        setTranscript(DEMO_TRANSCRIPT);
      }
      setPhase("done");
    };

    mr.stop();
  }, []);

  const toggleRecord = () => {
    if (phase === "idle") startRecording();
    else if (phase === "recording") stopRecording();
  };

  return (
    <div className="fixed inset-0 z-[600] bg-[#0A0A10] flex flex-col">
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white"
        >
          <X size={18} />
        </button>
        <p className="text-white/70 text-[14px]" style={{ fontWeight: 600 }}>
          {phase === "idle" && "点击开始录音"}
          {phase === "recording" && "录音中"}
          {phase === "transcribing" && "正在识别…"}
          {phase === "done" && "识别完成，确认保存"}
          {phase === "saved" && "已保存到记忆"}
        </p>
        <div className="w-10" />
      </div>

      {/* 主体 */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">

        {/* 波形 */}
        <div className="flex items-center gap-[3px] h-16">
          {bars.map((h, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-75"
              style={{
                width: 3,
                height: `${Math.round(h * 64)}px`,
                background: phase === "recording"
                  ? `rgba(99,102,241,${0.5 + h * 0.5})`
                  : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>

        {/* 计时器 */}
        {(phase === "recording") && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-white font-mono text-[20px]">{fmt(seconds)}</span>
          </div>
        )}

        {/* 大按钮 */}
        {(phase === "idle" || phase === "recording") && (
          <button
            onClick={toggleRecord}
            className="w-24 h-24 rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
            style={{
              background: phase === "recording"
                ? "rgba(239,68,68,0.9)"
                : "rgba(99,102,241,0.9)",
              boxShadow: phase === "recording"
                ? "0 0 0 12px rgba(239,68,68,0.15), 0 0 0 24px rgba(239,68,68,0.07)"
                : "0 0 0 12px rgba(99,102,241,0.12)",
            }}
          >
            {phase === "recording"
              ? <Square size={28} className="text-white" />
              : <Mic size={30} className="text-white" />}
          </button>
        )}

        {/* 识别中 */}
        {phase === "transcribing" && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={36} className="animate-spin text-[#6366F1]" />
            <span className="text-white/60 text-[14px]">正在将语音转为文字…</span>
          </div>
        )}

        {/* 识别结果 + 手动保存 */}
        {(phase === "done" || phase === "saved") && transcript && (
          <div className="w-full max-w-md flex flex-col gap-4">
            <div
              className="rounded-2xl px-4 py-4 max-h-52 overflow-y-auto"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <p className="text-white/85 text-[13px] leading-7 whitespace-pre-wrap">{transcript}</p>
            </div>

            {phase === "done" && (
              <button
                onClick={handleSave}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-[14px] font-semibold active:scale-95 transition-transform"
                style={{ background: "rgba(99,102,241,0.9)", color: "#fff" }}
              >
                <BookmarkCheck size={16} />
                保存到记忆
              </button>
            )}

            {phase === "saved" && (
              <div className="flex items-center justify-center gap-2 text-[13px]" style={{ color: "rgba(99,102,241,0.9)" }}>
                <BookmarkCheck size={14} />
                <span style={{ fontWeight: 600 }}>已保存，可在记忆中查看</span>
              </div>
            )}
          </div>
        )}

        {/* 底部提示 */}
        {phase === "idle" && (
          <p className="text-white/30 text-[12px] text-center">
            支持普通话、英语混合识别<br />最长 7 分钟
          </p>
        )}
        {phase === "recording" && (
          <p className="text-white/30 text-[12px]">再次点击停止录音</p>
        )}
      </div>
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
