import { useState, useRef, useEffect, useCallback } from "react";
import { X, Square, Loader2, BookmarkCheck, Minimize2, Maximize2, Pause, Play, Search, AudioLines, FileText, MoreHorizontal, Check } from "lucide-react";
import { DEMO_TRANSCRIPT } from "./demoTranscript";

interface Props {
  onClose: () => void;
  /** 转录完成后回调，传入转录文字，由 App 层保存到记忆 */
  onSave: (transcript: string, recording: { title: string; durationSeconds: number; audioUrl?: string }) => void;
  saveLocation?: string;
}

type Phase = "idle" | "recording" | "paused" | "transcribing" | "done" | "saved";

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

function recordingTitle() {
  const now = new Date();
  return `${now.getMonth() + 1}月${now.getDate()}日 课堂录音`;
}

function showDemoTranscript(
  setPhase: (p: Phase) => void,
  setTranscript: (t: string) => void,
  finalText = DEMO_TRANSCRIPT,
) {
  setPhase("transcribing");
  window.setTimeout(() => {
    setTranscript(finalText);
    setPhase("done");
  }, DEMO_SPINNER_MS);
}

export function VoiceModal({ onClose, onSave, saveLocation = "当前学科 / 笔记" }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [title, setTitle] = useState(recordingTitle);
  const [search, setSearch] = useState("");
  const [autoSaveMemory, setAutoSaveMemory] = useState(true);
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>();
  const bars = useWaveform(phase === "recording");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<{ stop: () => void } | null>(null);
  const liveTranscriptRef = useRef("");

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => () => {
    stopTimer();
    speechRecognitionRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const handleSave = useCallback(() => {
    if (!transcript) return;
    setPhase("saved");
    setSaveToastVisible(true);
    onSave(transcript, { title, durationSeconds: seconds, audioUrl });
  }, [transcript, title, seconds, audioUrl, onSave]);

  useEffect(() => {
    if (!saveToastVisible) return;
    const timer = window.setTimeout(() => setSaveToastVisible(false), 5000);
    return () => window.clearTimeout(timer);
  }, [saveToastVisible]);

  useEffect(() => {
    if (phase === "done" && autoSaveMemory && transcript) handleSave();
  }, [phase, autoSaveMemory, transcript, handleSave]);

  const finishTranscription = useCallback(() => {
    const finalText = USE_DEMO_TRANSCRIPT
      ? DEMO_TRANSCRIPT
      : liveTranscriptRef.current || "录音已完成，暂未识别到清晰文字。";
    showDemoTranscript(setPhase, setTranscript, finalText);
  }, []);

  const startRecording = useCallback(async () => {
    chunksRef.current = [];
    setLiveTranscript("");
    liveTranscriptRef.current = "";
    if (!USE_DEMO_TRANSCRIPT) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;
        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mr.start(100);

        const browserWindow = window as typeof window & {
          SpeechRecognition?: new () => {
            continuous: boolean;
            interimResults: boolean;
            lang: string;
            onresult: ((event: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
            start: () => void;
            stop: () => void;
          };
          webkitSpeechRecognition?: new () => {
            continuous: boolean;
            interimResults: boolean;
            lang: string;
            onresult: ((event: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
            start: () => void;
            stop: () => void;
          };
        };
        const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
        if (Recognition) {
          const recognition = new Recognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "zh-CN";
          recognition.onresult = event => {
            let text = "";
            for (let i = 0; i < event.results.length; i += 1) text += event.results[i][0].transcript;
            liveTranscriptRef.current = text.trim();
            setLiveTranscript(liveTranscriptRef.current);
          };
          recognition.start();
          speechRecognitionRef.current = recognition;
        }
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
    liveTranscriptRef.current = DEMO_TRANSCRIPT.slice(0, 18);
    setLiveTranscript(liveTranscriptRef.current);
    timerRef.current = setInterval(() => setSeconds(s => {
      const next = s + 1;
      const revealRatio = Math.min(1, 0.12 + next * 0.11);
      liveTranscriptRef.current = DEMO_TRANSCRIPT.slice(0, Math.ceil(DEMO_TRANSCRIPT.length * revealRatio));
      setLiveTranscript(liveTranscriptRef.current);
      return next;
    }), 1000);
  }, [finishTranscription]);

  const stopRecording = useCallback(() => {
    stopTimer();
    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;
    setMinimized(false);
    if (USE_DEMO_TRANSCRIPT) {
      finishTranscription();
      return;
    }

    const mr = mediaRecorderRef.current;
    if (!mr) return;
    mr.onstop = () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
      if (blob.size > 0) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioUrl(typeof reader.result === "string" ? reader.result : undefined);
          finishTranscription();
        };
        reader.readAsDataURL(blob);
      } else {
        finishTranscription();
      }
    };
    mr.stop();
  }, [finishTranscription]);

  const toggleRecord = () => {
    if (phase === "idle") startRecording();
    else if (phase === "recording") stopRecording();
  };

  const pauseRecording = () => {
    if (phase !== "recording") return;
    stopTimer();
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.pause();
    setPhase("paused");
  };

  const resumeRecording = () => {
    if (phase !== "paused") return;
    if (mediaRecorderRef.current?.state === "paused") mediaRecorderRef.current.resume();
    setPhase("recording");
    timerRef.current = setInterval(() => setSeconds(s => {
      const next = s + 1;
      if (USE_DEMO_TRANSCRIPT) {
        const revealRatio = Math.min(1, 0.12 + next * 0.11);
        liveTranscriptRef.current = DEMO_TRANSCRIPT.slice(0, Math.ceil(DEMO_TRANSCRIPT.length * revealRatio));
        setLiveTranscript(liveTranscriptRef.current);
      }
      return next;
    }), 1000);
  };

  const startNewRecording = async () => {
    setSeconds(0);
    setTranscript("");
    setLiveTranscript("");
    setAudioUrl(undefined);
    liveTranscriptRef.current = "";
    setTitle(recordingTitle());
    setMinimized(false);
    setSaveToastVisible(false);
    await startRecording();
  };

  const closeRecording = () => {
    stopTimer();
    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    onClose();
  };

  if (minimized && (phase === "recording" || phase === "paused")) {
    return (
      <div className="fixed left-1/2 top-4 z-[600] flex w-[min(520px,calc(100vw-32px))] -translate-x-1/2 items-center gap-3 rounded-2xl border border-[#E0E4EB] bg-white px-3 py-2.5 shadow-[0_12px_38px_rgba(25,31,47,0.18)]">
        <button type="button" onClick={() => setMinimized(false)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label="展开录音窗口">
          <span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full ${phase === "paused" ? "bg-[#F0F2F6]" : "bg-[#FFF0F1]"}`}>
            {phase === "paused" ? <Pause size={14} className="text-[#697180]"/> : <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#EF535D]"/>}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[#272C36]">{phase === "paused" ? "录音已暂停" : "正在录音"} <span className="font-mono text-[12px] text-[#737A88]">{fmt(seconds)}</span></span>
            <span className="block truncate text-[11px] text-[#9298A5]">{liveTranscript || "正在实时转写…"}</span>
          </span>
        </button>
        <button type="button" onClick={() => setMinimized(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#747B89] transition hover:bg-[#F1F2F5]" aria-label="展开录音窗口">
          <Maximize2 size={16}/>
        </button>
        <button type="button" onClick={phase === "paused" ? resumeRecording : pauseRecording} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F1F2F5] text-[#252932]" aria-label={phase === "paused" ? "继续录音" : "暂停录音"}>
          {phase === "paused" ? <Play size={14} fill="currentColor"/> : <Pause size={14} fill="currentColor"/>}
        </button>
        <button type="button" onClick={stopRecording} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F1F2F5] text-[#252932]" aria-label="停止录音">
          <Square size={13} fill="currentColor"/>
        </button>
        <button type="button" onClick={closeRecording} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#747B89] transition hover:bg-[#FFF0F1] hover:text-[#D64F59]" aria-label="关闭录音">
          <X size={17}/>
        </button>
      </div>
    );
  }

  const hasRecording = phase !== "idle";
  const panelText = phase === "done" || phase === "saved" ? transcript : liveTranscript;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-[#202532]/25 p-5 backdrop-blur-[2px]">
      <section className="relative flex h-[min(820px,90vh)] w-full max-w-[1180px] flex-col overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-[0_30px_100px_rgba(24,30,45,0.24)]">
        {saveToastVisible && <div role="status" className="absolute left-1/2 top-20 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#CDEBDD] bg-white px-5 py-3 text-[12px] font-semibold text-[#24815B] shadow-[0_12px_34px_rgba(34,91,68,.16)]"><Check size={16}/>已保存到 Memo · {saveLocation}</div>}
        <header className="flex h-16 shrink-0 items-center border-b border-[#E8EBF0] px-5">
          <button onClick={closeRecording} className="grid h-9 w-9 place-items-center rounded-full bg-[#F1F3F6] text-[#59606D] hover:bg-[#E8EBF0]" aria-label="关闭录音"><X size={17}/></button>
          <div className="ml-5 flex items-center gap-2"><AudioLines size={19} className="text-[#4D5CFF]"/><b className="text-[15px] text-[#252A35]">录音</b>{phase === "recording" && <span className="flex items-center gap-1.5 rounded-full bg-[#FFF0F1] px-2.5 py-1 text-[10px] font-semibold text-[#D94F59]"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"/>录制中</span>}{phase === "paused" && <span className="rounded-full bg-[#F1F2F5] px-2.5 py-1 text-[10px] font-semibold text-[#737A88]">已暂停</span>}</div>
          {(phase === "recording" || phase === "paused") && <button onClick={()=>setMinimized(true)} className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-[#F1F3F6] text-[#59606D] hover:bg-[#E8EBF0]" aria-label="最小化"><Minimize2 size={17}/></button>}
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[250px] shrink-0 flex-col border-r border-[#E8EBF0] bg-[#F7F8FA]">
            <div className="p-4"><b className="text-[14px] text-[#292E39]">所有录音</b><div className="mt-3 flex h-9 items-center rounded-xl bg-white px-3 ring-1 ring-[#E5E8EE]"><Search size={14} className="mr-2 text-[#9299A6]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索标题、转写" className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-[#ADB2BC]"/></div></div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              {hasRecording ? <button className="w-full rounded-2xl bg-[#EEF0FF] p-3 text-left transition-colors hover:bg-[#E8EBFF]"><div className="flex items-start gap-2.5"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-[#4D5CFF]"><AudioLines size={15}/></span><span className="min-w-0 flex-1"><b className="block truncate text-[11px] text-[#303642]">{title}</b><span className="mt-1 block text-[9px] text-[#858C9A]">今天 · {fmt(seconds)} · {phase === "saved" ? "已形成记忆" : phase === "done" ? "待保存" : phase === "paused" ? "已暂停" : "录制中"}</span></span><MoreHorizontal size={15} className="text-[#969CAA]"/></div></button> : <div className="flex h-full flex-col items-center justify-center px-5 text-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#B2B7C1] shadow-sm"><AudioLines size={22}/></span><b className="mt-4 text-[12px] text-[#606774]">还没有录音</b><p className="mt-1 text-[10px] leading-5 text-[#A0A6B2]">开始录制后，会在这里保留记录</p></div>}
            </div>
          </aside>

          <main className="relative flex min-w-0 flex-1 flex-col border-r border-[#E8EBF0] bg-[#FCFCFD]">
            <div className="flex items-center px-6 py-4"><input value={title} onChange={e=>setTitle(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#2B303B] outline-none" aria-label="录音标题"/></div>
            <div className="flex flex-1 flex-col items-center justify-center px-7 pb-24">
              <div className="flex h-28 w-full max-w-[510px] items-center justify-center gap-[4px] overflow-hidden rounded-3xl bg-[#F4F5F8] px-8">
                {bars.map((h,i)=><i key={i} className="w-[3px] rounded-full transition-all duration-75" style={{height:`${Math.round((phase === "idle" ? .18 : h) * 72)}px`,background:phase === "recording"?`rgba(77,92,255,${.5+h*.5})`:phase === "paused"?"#9DA4B2":"#C8CDD6"}}/>)}
              </div>
              <div className="mt-7 font-mono text-[38px] font-medium tracking-[-.03em] text-[#242933]">{fmt(seconds)}</div>
              <p className="mt-2 text-[11px] text-[#949BA8]">{phase === "idle" ? "点击下方按钮开始录音" : phase === "recording" ? "正在录制并实时转写" : phase === "paused" ? "录音已暂停，点击继续" : phase === "transcribing" ? "正在完成最后一段转写" : phase === "saved" ? "录音已保存为知识来源" : "录音完成，可检查转写并保存"}</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex h-24 items-center justify-center gap-3 border-t border-[#ECEEF2] bg-white/90 backdrop-blur">
              {phase === "idle" && <button onClick={startRecording} className="grid h-16 w-16 place-items-center rounded-full bg-[#FF4D57] text-white shadow-[0_8px_24px_rgba(255,77,87,.28)]" aria-label="开始录音"><span className="grid h-7 w-7 place-items-center rounded-full border-[2.5px] border-current" aria-hidden="true"><span className="h-2.5 w-2.5 rounded-full bg-current"/></span></button>}
              {phase === "recording" && <><button onClick={pauseRecording} className="grid h-12 w-12 place-items-center rounded-full bg-[#F0F2F5] text-[#343A46]" aria-label="暂停"><Pause size={18} fill="currentColor"/></button><button onClick={stopRecording} className="flex h-12 items-center gap-2 rounded-full bg-[#4D5CFF] px-5 text-[12px] font-semibold text-white"><Square size={13} fill="currentColor"/>完成录音</button></>}
              {phase === "paused" && <><button onClick={resumeRecording} className="grid h-12 w-12 place-items-center rounded-full bg-[#EEF0FF] text-[#4D5CFF]" aria-label="继续"><Play size={18} fill="currentColor"/></button><button onClick={stopRecording} className="flex h-12 items-center gap-2 rounded-full bg-[#4D5CFF] px-5 text-[12px] font-semibold text-white"><Square size={13} fill="currentColor"/>完成录音</button></>}
              {phase === "transcribing" && <div className="flex items-center gap-2 text-[12px] font-medium text-[#697180]"><Loader2 size={18} className="animate-spin text-[#4D5CFF]"/>正在生成完整文稿…</div>}
              {phase === "done" && !autoSaveMemory && <button onClick={handleSave} className="flex h-12 items-center gap-2 rounded-full bg-[#4D5CFF] px-6 text-[12px] font-semibold text-white"><BookmarkCheck size={16}/>保存到知识记忆</button>}
              {phase === "done" && autoSaveMemory && <div className="flex items-center gap-2 text-[12px] font-medium text-[#697180]"><Loader2 size={18} className="animate-spin text-[#4D5CFF]"/>正在自动保存到记忆…</div>}
              {phase === "saved" && <button type="button" onClick={startNewRecording} className="flex flex-col items-center gap-1.5 text-[10px] font-semibold text-[#596170]" aria-label="开始新录音"><span className="grid h-14 w-14 place-items-center rounded-full bg-[#FF4D57] text-white shadow-[0_8px_24px_rgba(255,77,87,.28)]"><span className="grid h-6 w-6 place-items-center rounded-full border-[2.2px] border-current" aria-hidden="true"><span className="h-2 w-2 rounded-full bg-current"/></span></span>开始新录音</button>}
            </div>
          </main>

          <aside className="flex w-[360px] shrink-0 flex-col bg-white">
            <div className="px-5 pb-2 pt-5"><b className="text-[13px] text-[#292E39]">{phase === "recording" || phase === "paused" ? "实时转写" : "录音文稿"}</b></div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {panelText ? <p className="whitespace-pre-wrap text-[12px] leading-7 text-[#4C5360]">{panelText}{phase === "recording" && <span className="ml-1 inline-block h-4 w-[2px] animate-pulse align-middle bg-[#4D5CFF]"/>}</p> : <div className="flex h-full flex-col items-center justify-center text-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#F4F5F8] text-[#B2B7C1]"><FileText size={21}/></span><b className="mt-4 text-[12px] text-[#626977]">等待转写内容</b><p className="mt-1 max-w-[210px] text-[10px] leading-5 text-[#A0A6B2]">开始录音后，识别出的文字会实时出现在这里</p></div>}
            </div>
            <div className="px-4 pb-4 pt-2">
              <div className="flex items-start justify-between gap-3 rounded-2xl bg-[#F7F8FB] px-3 py-3">
                <div className="min-w-0"><p className="text-[10px] font-semibold text-[#4E5562]">自动保存到记忆</p><p className="mt-1.5 text-[9px] leading-5 text-[#858D9B]">{autoSaveMemory ? "保存后会保留音频与转写，提取知识点并关联当前学科，后续可搜索、复习。" : "开启后，Memo 会自动保留音频与转写、提取知识点，并形成可搜索、可复习的知识记忆。"}</p></div>
                <button type="button" role="switch" aria-checked={autoSaveMemory} aria-label="自动保存到记忆" onClick={() => setAutoSaveMemory(value => !value)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${autoSaveMemory ? "bg-[#4D5CFF]" : "bg-[#CDD2DB]"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${autoSaveMemory ? "left-6" : "left-1"}`}/></button>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
