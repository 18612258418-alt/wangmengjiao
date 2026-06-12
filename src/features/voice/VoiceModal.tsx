import { useState, useRef, useEffect, useCallback } from "react";
import { X, Mic, Square, Loader2, BookmarkCheck } from "lucide-react";
import { DEMO_TRANSCRIPT } from "./demoTranscript";

interface Props {
  onClose: () => void;
  /** 转录完成后回调，传入转录文字，由 App 层保存到记忆 */
  onSave: (transcript: string) => void;
}

type Phase = "idle" | "recording" | "transcribing" | "done" | "saved";

/** 演示版固定走示例文稿，不等待 ASR 上传 */
const USE_DEMO_TRANSCRIPT =
  import.meta.env.VITE_VOICE_DEMO !== "false";

const DEMO_SPINNER_MS = 180;

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

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function showDemoTranscript(
  setPhase: (p: Phase) => void,
  setTranscript: (t: string) => void,
) {
  setPhase("transcribing");
  window.setTimeout(() => {
    setTranscript(DEMO_TRANSCRIPT);
    setPhase("done");
  }, DEMO_SPINNER_MS);
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

  useEffect(() => () => {
    stopTimer();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const handleSave = useCallback(() => {
    if (!transcript) return;
    setPhase("saved");
    onSave(transcript);
  }, [transcript, onSave]);

  const finishTranscription = useCallback(() => {
    showDemoTranscript(setPhase, setTranscript);
  }, []);

  const startRecording = useCallback(async () => {
    chunksRef.current = [];
    if (!USE_DEMO_TRANSCRIPT) {
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
        return;
      } catch {
        finishTranscription();
        return;
      }
    }

    // 演示模式：不采集麦克风，模拟录音 1.5s 后直接出示例文稿
    setPhase("recording");
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  }, [finishTranscription]);

  const stopRecording = useCallback(() => {
    stopTimer();
    if (USE_DEMO_TRANSCRIPT) {
      finishTranscription();
      return;
    }

    const mr = mediaRecorderRef.current;
    if (!mr) return;
    mr.onstop = () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      finishTranscription();
    };
    mr.stop();
  }, [finishTranscription]);

  const toggleRecord = () => {
    if (phase === "idle") startRecording();
    else if (phase === "recording") stopRecording();
  };

  return (
    <div className="fixed inset-0 z-[600] bg-[#0A0A10] flex flex-col">
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

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
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

        {phase === "recording" && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-white font-mono text-[20px]">{fmt(seconds)}</span>
          </div>
        )}

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

        {phase === "transcribing" && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={36} className="animate-spin text-[#6366F1]" />
            <span className="text-white/60 text-[14px]">正在生成文稿…</span>
          </div>
        )}

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

        {phase === "idle" && (
          <p className="text-white/30 text-[12px] text-center">
            演示模式：展示示例课堂文稿<br />点击录音后停止即可查看
          </p>
        )}
        {phase === "recording" && (
          <p className="text-white/30 text-[12px]">再次点击停止录音</p>
        )}
      </div>
    </div>
  );
}
