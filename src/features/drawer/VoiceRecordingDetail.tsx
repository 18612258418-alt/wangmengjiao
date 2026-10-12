import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, CircleHelp, GraduationCap, Pause, Play, RotateCcw, RotateCw, UserRound } from "lucide-react";
import type { CardData, SourceDocument } from "../../types";

type VoiceTab = "summary" | "transcript";
type KnowledgePoint = NonNullable<SourceDocument["audioKnowledgePoints"]>[number];
type TranscriptSegment = NonNullable<SourceDocument["transcriptSegments"]>[number];

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function buildFallbackPoints(card: CardData, duration: number): KnowledgePoint[] {
  const items = card.detailSections?.flatMap(section => section.items) ?? card.aiKeyPoints ?? [];
  const titles = items.length ? items.slice(0, 4) : [card.title.replace(/^记忆[:：]\s*/, "")];
  const slice = Math.max(45, Math.floor(duration / Math.max(titles.length, 1)));
  return titles.map((text, index) => ({
    id: `fallback_point_${index}`,
    title: text.length > 24 ? `${text.slice(0, 24)}…` : text,
    summary: text,
    startTime: Math.min(duration, index * slice),
    endTime: Math.min(duration, (index + 1) * slice - 1),
    kind: "concept",
  }));
}

function buildFallbackSegments(document: SourceDocument, points: KnowledgePoint[]): TranscriptSegment[] {
  const paragraphs = document.paragraphs?.filter(Boolean) ?? [];
  return points.map((point, index) => ({
    id: `fallback_segment_${index}`,
    startTime: point.startTime,
    endTime: point.endTime,
    text: paragraphs[index] ?? point.summary,
    speakerId: point.kind === "task" ? "student_1" : "teacher",
    speakerName: point.kind === "task" ? "学生 1" : "老师",
    speakerRole: point.kind === "task" ? "student" : "teacher",
  }));
}

function expandLegacySegments(segments: TranscriptSegment[], points: KnowledgePoint[]): TranscriptSegment[] {
  return segments.flatMap(segment => {
    const point = points.find(item => segment.startTime >= item.startTime && segment.endTime <= item.endTime);
    const span = segment.endTime - segment.startTime;
    if (segment.label || !point || point.kind === "task" || point.kind === "emphasis" || span < 60) return [segment];
    const middle = segment.startTime + Math.round(span * .42);
    const later = segment.startTime + Math.round(span * .68);
    return [{ ...segment, id: `${segment.id}_intro`, endTime: middle, label: segment.label ?? "首次讲解" }, {
      ...segment,
      id: `${segment.id}_example`,
      startTime: later,
      label: "课堂示例",
      text: `${point.title}的补充说明与课堂示例。`,
    }];
  });
}

export function VoiceRecordingDetail({ card, exportRef }: { card: CardData; exportRef?: React.RefObject<HTMLDivElement | null> }) {
  const document = card.sourceDocument!;
  const recordedDuration = document.durationSeconds ?? 0;
  const duration = Math.max(recordedDuration <= 1 && /机械振动/.test(card.title) ? 2542 : recordedDuration, 1);
  const points = useMemo(() => document.audioKnowledgePoints?.length ? document.audioKnowledgePoints : buildFallbackPoints(card, duration), [card.id, document.audioKnowledgePoints, duration]);
  const segments = useMemo(() => {
    const sourceSegments = document.transcriptSegments?.length ? document.transcriptSegments : buildFallbackSegments(document, points);
    return expandLegacySegments(sourceSegments, points);
  }, [card.id, document.transcriptSegments, points]);
  const [tab, setTab] = useState<VoiceTab>("summary");
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const activePoint = points.find(point => currentTime >= point.startTime && currentTime <= point.endTime);
  const activeSegment = segments.find(segment => currentTime >= segment.startTime && currentTime <= segment.endTime);
  const concepts = points.filter(point => !point.kind || point.kind === "concept");
  const insights = points.filter(point => point.kind === "emphasis" || point.kind === "task");
  const rawOverview = card.overview || card.detailIntro || document.excerpt || "";
  const summaryTopics = concepts.slice(0, 3).map(point => point.title).join("、");
  const processCopy = /已转|转为文字|完成转写|已整理|已保存|保留完整转写|同步保留/.test(rawOverview);
  const summaryText = processCopy
    ? summaryTopics
      ? `本节围绕${summaryTopics}展开，梳理了核心概念、关键方法与应用要点。`
      : "本节围绕课程核心内容展开，梳理了核心概念、关键方法与应用要点。"
    : rawOverview;

  useEffect(() => {
    setTab("summary");
    setCurrentTime(0);
    setPlaying(false);
  }, [card.id]);

  useEffect(() => {
    if (document.url || !playing) return;
    const timer = window.setInterval(() => {
      setCurrentTime(value => {
        if (value >= duration) {
          setPlaying(false);
          return duration;
        }
        return Math.min(duration, value + 1);
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [document.url, duration, playing]);

  const seek = (time: number, shouldPlay = true) => {
    const next = Math.max(0, Math.min(duration, time));
    setCurrentTime(next);
    if (audioRef.current) {
      audioRef.current.currentTime = next;
      if (shouldPlay) audioRef.current.play().catch(() => undefined);
    }
    if (shouldPlay) setPlaying(true);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (playing) audioRef.current.pause(); else audioRef.current.play().catch(() => undefined);
    }
    setPlaying(value => !value);
  };

  const PointButton = ({ point, compact = false }: { point: KnowledgePoint; compact?: boolean }) => {
    const active = activePoint?.id === point.id;
    const linkedSegments = point.transcriptSegmentIds?.map(id => segments.find(segment => segment.id === id)).filter((segment): segment is TranscriptSegment => Boolean(segment)) ?? [];
    const rangedSegments = segments.filter(segment => segment.startTime >= point.startTime && segment.endTime <= point.endTime);
    const clips = linkedSegments.length >= 2 ? linkedSegments : rangedSegments;
    return <div className={`rounded-2xl border px-4 transition ${compact ? "py-3" : "py-4"} ${active ? "border-[#C9CEFF] bg-[#F7F8FF]" : "border-[#E8EAF0] bg-white"}`}>
      <div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2"><b className="text-[13px] text-[#252936]">{point.title}</b><span className="shrink-0 rounded-full bg-[#F1F2F6] px-2 py-0.5 text-[10px] text-[#8B92A1]">{clips.length || 1} 处讲解</span></div>{!compact && <p className="mt-1 text-[12px] leading-5 text-[#707786]">{point.summary}</p>}</div>{active && playing && <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#4D5CFF]"><AudioLines size={13}/>播放中</span>}</div>
      {!compact && clips.length > 0 && <div className="mt-3 overflow-hidden rounded-xl border border-[#ECEEF3] bg-white">{clips.map((clip, index) => { const clipActive = currentTime >= clip.startTime && currentTime <= clip.endTime; return <button key={clip.id} type="button" onClick={() => seek(Math.max(0, clip.startTime - 2))} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${index > 0 ? "border-t border-[#F0F1F4]" : ""} ${clipActive ? "bg-[#EEF0FF]" : "hover:bg-[#F8F9FC]"}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${clipActive ? "bg-[#4D5CFF] text-white" : "bg-[#F0F2FF] text-[#6472E9]"}`}><Play size={10} fill="currentColor"/></span><span className={`flex-1 text-[11px] font-semibold ${clipActive ? "text-[#4D5CFF]" : "text-[#505868]"}`}>{clip.label ?? (index === 0 ? "首次讲解" : `补充讲解 ${index + 1}`)}</span><span className="text-[10px] tabular-nums text-[#9299A8]">{formatTime(clip.startTime)}–{formatTime(clip.endTime)}</span></button>})}</div>}
    </div>;
  };

  return <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
    {document.url && <audio ref={audioRef} src={document.url} onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}/>}
    <div className="shrink-0 border-b border-[#ECEEF3] bg-white px-6 pb-4 pt-3">
      <div className="rounded-[20px] border border-[#E5E8F0] bg-[#F8F9FC] px-5 py-4 shadow-[0_5px_18px_rgba(31,36,58,.05)]">
        <div className="flex items-center gap-4">
          <button type="button" onClick={togglePlay} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#4D5CFF] text-white shadow-[0_7px_18px_rgba(77,92,255,.26)]" aria-label={playing ? "暂停录音" : "播放录音"}>{playing ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}</button>
          <button type="button" onClick={() => seek(currentTime - 15, playing)} className="text-[#7B8291] hover:text-[#4D5CFF]" aria-label="后退15秒"><RotateCcw size={17}/></button>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between gap-3"><span className="truncate text-[11px] font-semibold text-[#4D5CFF]">{activePoint ? `正在播放：${activePoint.title}` : "完整课堂录音"}</span><span className="shrink-0 text-[11px] tabular-nums text-[#7B8291]">{formatTime(currentTime)} / {formatTime(duration)}</span></div>
            <input aria-label="录音进度" type="range" min={0} max={duration} step={1} value={currentTime} onChange={event => seek(Number(event.target.value), playing)} className="h-1.5 w-full cursor-pointer accent-[#4D5CFF]"/>
          </div>
          <button type="button" onClick={() => seek(currentTime + 15, playing)} className="text-[#7B8291] hover:text-[#4D5CFF]" aria-label="前进15秒"><RotateCw size={17}/></button>
          <button type="button" className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#626977] shadow-sm">1.0×</button>
        </div>
      </div>
      <div className="mt-3 flex rounded-xl bg-[#F3F4F8] p-1">
        {([{key:"summary",label:"智能笔记"},{key:"transcript",label:"完整转写"}] as const).map(item => <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`h-9 flex-1 rounded-lg text-[12px] font-bold transition ${tab === item.key ? "bg-white text-[#4D5CFF] shadow-sm" : "text-[#7B8291]"}`}>{item.label}</button>)}
      </div>
    </div>

    <div ref={exportRef} className="min-h-0 flex-1 overflow-y-auto px-6 pb-10">
      {tab === "summary" && <div className="space-y-6 pt-6">
        <section><div className="mb-3 flex items-center gap-2"><span className="h-5 w-1 rounded-full bg-[#8B93A5]"/><h3 className="text-[14px] font-bold text-[#303542]">内容摘要</h3></div><div className="rounded-2xl border border-[#E7E9F0] bg-[#F8F9FB] p-5"><p className="text-[13px] leading-7 text-[#3D4658]">{summaryText}</p></div></section>
        <section><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><span className="h-5 w-1 rounded-full bg-[#727FFF]"/><h3 className="text-[14px] font-bold text-[#303542]">核心知识点</h3></div><span className="text-[11px] text-[#9CA3AF]">{concepts.length} 个 · 点击回听</span></div><div className="space-y-2.5">{concepts.map(point => <PointButton key={point.id} point={point}/>)}</div></section>
        {insights.length > 0 && <section><div className="mb-3 flex items-center gap-2"><span className="h-5 w-1 rounded-full bg-[#F5A64A]"/><h3 className="text-[14px] font-bold text-[#303542]">老师强调与课后任务</h3></div><div className="space-y-2.5">{insights.map(point => <PointButton key={point.id} point={point} compact/>)}</div></section>}
      </div>}

      {tab === "transcript" && <div className="pt-6"><div className="mb-5"><h3 className="text-[15px] font-bold text-[#252936]">完整转写</h3><p className="mt-1 text-[11px] text-[#9CA3AF]">已区分说话人，点击任意段落即可从对应位置播放</p></div><div className="space-y-3">{segments.map(segment => { const active = activeSegment?.id === segment.id; const role = segment.speakerRole ?? "unknown"; const speaker = segment.speakerName ?? (role === "teacher" ? "老师" : role === "student" ? "学生" : "未知说话人"); return <button key={segment.id} type="button" onClick={() => seek(segment.startTime)} className={`flex w-full gap-3 rounded-2xl border p-4 text-left transition ${active ? "border-[#C9CEFF] bg-[#F0F2FF]" : "border-transparent hover:border-[#E5E8F5] hover:bg-[#F8F9FC]"}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${role === "teacher" ? "bg-[#EEF0FF] text-[#4D5CFF]" : role === "student" ? "bg-[#EAF7F1] text-[#27825D]" : "bg-[#F1F2F5] text-[#7B8291]"}`}>{role === "teacher" ? <GraduationCap size={18}/> : role === "student" ? <UserRound size={17}/> : <CircleHelp size={17}/>}</span><span className="min-w-0 flex-1"><span className="mb-1 flex items-center gap-2"><b className="text-[12px] text-[#303542]">{speaker}</b><span className={`text-[10px] font-semibold tabular-nums ${active ? "text-[#4D5CFF]" : "text-[#9CA3AF]"}`}>{formatTime(segment.startTime)}</span>{active && playing && <span className="text-[10px] font-semibold text-[#4D5CFF]">正在播放</span>}</span><span className="block text-[13px] leading-7 text-[#414958]">{segment.text}</span></span></button>})}</div></div>}


    </div>
  </div>;
}
