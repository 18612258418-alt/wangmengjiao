import { useEffect, useRef, useState } from "react";
import { Headphones, Loader2, Mic, Network, NotebookPen, Pause, Play, Send, Sparkles, Square, Video, Volume2, VolumeX, X } from "lucide-react";

type ArtifactKind = "podcast" | "video" | "mindmap" | "notes";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  pending?: boolean;
  artifact?: ArtifactKind;
};

export interface AiConversationModuleProps {
  contextKey: string;
  contextLabel?: string;
  title?: string;
  initialAssistant?: string;
  externalAssistantMessage?: string;
  externalAssistantMessages?: Array<{ id: string; content: string }>;
  placeholder?: string;
  suggestions?: string[];
  actions?: Array<{ label: string; prompt?: string; kind?: ArtifactKind }>;
  onAsk?: (question: string) => string | void | Promise<string | void>;
  onClose?: () => void;
  className?: string;
  compact?: boolean;
}

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const ARTIFACT_META = {
  podcast:{label:"共读播客",detail:"8 分钟 · AI 双人讲解",action:"播放",activeAction:"暂停",icon:Headphones},
  video:{label:"概念讲解视频",detail:"3 分钟 · 原文与案例",action:"播放",activeAction:"暂停",icon:Video},
  mindmap:{label:"知识脑图",detail:"4 个分支 · 9 个节点",action:"展开",activeAction:"收起",icon:Network},
  notes:{label:"关联笔记",detail:"已关联 1 条 · 推荐 1 条",action:"查看",activeAction:"收起",icon:NotebookPen},
} satisfies Record<ArtifactKind,{label:string;detail:string;action:string;activeAction:string;icon:typeof Headphones}>;

function ArtifactCard({kind,title,active,onToggle}:{kind:ArtifactKind;title:string;active:boolean;onToggle:()=>void}){
  const meta=ARTIFACT_META[kind];
  const Icon=meta.icon;
  return <div className="mt-2 overflow-hidden rounded-xl border border-[#E3E7F0] bg-white text-[#343A49] shadow-sm">
    <div className="flex items-center gap-2.5 p-2.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#EEF0FF] text-[#4D5CFF]"><Icon size={15}/></span><div className="min-w-0 flex-1"><b className="block truncate text-[10px]">{title} · {meta.label}</b><span className="block truncate text-[8px] text-[#8A919F]">{meta.detail}</span></div><button onClick={onToggle} className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-[#4D5CFF] px-2.5 text-[8px] font-semibold text-white">{(kind==="podcast"||kind==="video")&&(active?<Pause size={9}/>:<Play size={9} fill="currentColor"/>)}{active?meta.activeAction:meta.action}</button></div>
    {active&&<div className="border-t border-[#ECEEF3] bg-[#F8F9FC] px-3 py-2 text-[8px] leading-4 text-[#697184]">{kind==="mindmap"?"核心概念 → 作用机制 → 原文案例 → 个人理解":kind==="notes"?"已关联：比较是形成自我判断的参照机制\n推荐关联：冲动消费中的群体影响":"正在基于当前阅读位置播放，可继续在下方追问。"}</div>}
  </div>;
}

export function AiConversationModule({
  contextKey,
  contextLabel,
  title = "Memo 学习助手",
  initialAssistant = "我已带上当前页面和相关记忆。你可以直接提问，也可以用语音继续聊。",
  externalAssistantMessage,
  externalAssistantMessages = [],
  placeholder = "输入问题，或按住语音说…",
  suggestions = [],
  actions = [],
  onAsk,
  onClose,
  className = "",
  compact = false,
}: AiConversationModuleProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceReply, setVoiceReply] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastExternal = useRef("");
  const seenExternal = useRef(new Set<string>());
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setMessages([{ id: makeId(), role: "assistant", content: initialAssistant }]);
    setInput("");
    lastExternal.current = "";
    seenExternal.current.clear();
    window.speechSynthesis?.cancel();
    setSpeakingId(null);
  }, [contextKey, initialAssistant]);

  useEffect(() => {
    const content = externalAssistantMessage?.trim();
    if (!content || content === lastExternal.current) return;
    lastExternal.current = content;
    const message = { id: makeId(), role: "assistant" as const, content };
    setMessages(current => [...current.filter(item => !item.pending), message]);
    if (voiceReply && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(content.replace(/【[^】]+】/g, ""));
      utterance.lang = "zh-CN";
      utterance.rate = 1;
      utterance.onstart = () => setSpeakingId(message.id);
      utterance.onend = () => setSpeakingId(null);
      window.speechSynthesis.speak(utterance);
    }
  }, [externalAssistantMessage, voiceReply]);

  useEffect(() => {
    const fresh = externalAssistantMessages.filter(item => item.content.trim() && !seenExternal.current.has(item.id));
    if (!fresh.length) return;
    fresh.forEach(item => seenExternal.current.add(item.id));
    setMessages(current => [...current.filter(item => !item.pending), ...fresh.map(item => ({ id: `external-${item.id}`, role: "assistant" as const, content: item.content }))]);
  }, [externalAssistantMessages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => () => {
    recognitionRef.current?.stop?.();
    window.speechSynthesis?.cancel();
  }, []);

  const speak = (message: Message) => {
    if (!("speechSynthesis" in window)) return;
    if (speakingId === message.id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.content.replace(/【[^】]+】/g, ""));
    utterance.lang = "zh-CN";
    utterance.rate = 1;
    utterance.onstart = () => setSpeakingId(message.id);
    utterance.onend = () => setSpeakingId(null);
    window.speechSynthesis.speak(utterance);
  };

  const send = async (raw = input, artifact?: ArtifactKind) => {
    const question = raw.trim();
    if (!question) return;
    const pendingId = makeId();
    setMessages(current => [...current, { id: makeId(), role: "user", content: question }, { id: pendingId, role: "assistant", content: "正在结合当前内容思考…", pending: true }]);
    setInput("");
    try {
      const response = await onAsk?.(question);
      const content = response?.trim() || "我已经收到。你可以继续追问具体依据、步骤或不确定的地方。";
      const answer = { id: makeId(), role: "assistant" as const, content, artifact };
      setMessages(current => [...current.filter(item => item.id !== pendingId), answer]);
      if (voiceReply && "speechSynthesis" in window) speak(answer);
    } catch {
      setMessages(current => [...current.filter(item => item.id !== pendingId), { id: makeId(), role: "assistant", content: "刚才没有连接成功。当前上下文仍然保留，可以稍后继续问。" }]);
    }
  };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setMessages(current => [...current, { id: makeId(), role: "assistant", content: "当前浏览器暂不支持语音转文字，可以继续使用键盘输入。" }]);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((result: any) => result[0]?.transcript || "").join("");
      setInput(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <section className={`flex min-h-0 flex-col overflow-hidden border border-[#E5E8F0] bg-white ${className}`}>
      <header className="flex shrink-0 items-center gap-2 border-b border-[#ECEEF3] px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#EEF0FF] text-[#4D5CFF]"><Sparkles size={15}/></span>
        <div className="min-w-0 flex-1"><b className="block text-[12px] text-[#202534]">{title}</b>{contextLabel&&<span className="block truncate text-[9px] text-[#8A909C]">正在参考：{contextLabel}</span>}</div>
        <button onClick={() => setVoiceReply(value => !value)} title="语音播报" className={`grid h-8 w-8 place-items-center rounded-xl ${voiceReply ? "bg-[#EEF0FF] text-[#4D5CFF]" : "bg-[#F5F6F8] text-[#8A909C]"}`}>{voiceReply ? <Volume2 size={14}/> : <VolumeX size={14}/>}</button>
        {onClose&&<button onClick={onClose} aria-label="关闭 AI 对话" className="grid h-8 w-8 place-items-center rounded-xl bg-[#F5F6F8] text-[#8A909C]"><X size={14}/></button>}
      </header>

      <div ref={listRef} className={`min-h-0 flex-1 overflow-y-auto px-4 py-3 ${compact ? "space-y-2" : "space-y-3"}`}>
        {messages.map((message,index) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`group relative max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[11px] leading-5 ${message.role === "user" ? "rounded-br-md bg-[#4D5CFF] text-white" : "rounded-bl-md bg-[#F2F4F8] text-[#4F5666]"}`}>
              {message.pending&&<Loader2 size={12} className="mr-1 inline animate-spin"/>}{message.content}
              {message.role === "assistant"&&!message.pending&&<button onClick={() => speak(message)} aria-label="朗读这条回复" className="ml-2 inline-flex align-middle text-[#8992AD] hover:text-[#4D5CFF]">{speakingId === message.id ? <Square size={10}/> : <Volume2 size={11}/>}</button>}
              {message.artifact&&<ArtifactCard kind={message.artifact} title={contextLabel?.split(" · ").at(-1)||"当前内容"} active={activeArtifactId===message.id} onToggle={()=>setActiveArtifactId(current=>current===message.id?null:message.id)}/>} 
              {index===0&&messages.length===1&&suggestions.length>0&&<div className="mt-2 flex flex-wrap gap-1.5 border-t border-[#E3E6ED] pt-2">{suggestions.map(item=><button key={item} onClick={() => void send(item)} className="rounded-full bg-white px-2.5 py-1 text-[9px] font-semibold leading-4 text-[#4D5CFF] shadow-sm">{item}</button>)}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-[#ECEEF3] bg-white p-3">
        {actions.length>0&&<div className="mb-2 grid grid-cols-4 gap-1.5">{actions.map(item=><button key={item.label} onClick={() => void send(item.prompt||item.label,item.kind)} className="truncate rounded-xl bg-[#F1F3FF] px-2 py-2 text-[9px] font-semibold text-[#4D5CFF] transition hover:bg-[#E8EBFF]">{item.label}</button>)}</div>}
        <div className="flex items-end gap-2 rounded-2xl bg-[#F3F4F7] p-1.5 pl-3">
          <textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if(event.key === "Enter"&&!event.shiftKey){event.preventDefault();void send();} }} rows={1} placeholder={listening ? "正在听…" : placeholder} className="max-h-24 min-h-[34px] min-w-0 flex-1 resize-none bg-transparent py-2 text-[11px] leading-5 outline-none"/>
          <button onClick={toggleListening} aria-label={listening ? "停止语音输入" : "语音输入"} className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${listening ? "bg-[#FDEBEC] text-[#D74855]" : "bg-white text-[#4D5CFF]"}`}>{listening ? <Square size={13}/> : <Mic size={14}/>}</button>
          <button onClick={() => void send()} disabled={!input.trim()} aria-label="发送消息" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#4D5CFF] text-white disabled:opacity-35"><Send size={14}/></button>
        </div>
      </div>
    </section>
  );
}
