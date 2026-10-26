import { useState } from "react";
import { CalendarDays, Download, FileText, FolderOpen, Link2, Monitor, StickyNote, X } from "lucide-react";

const sources = [
  { id: "desktop", title: "Mac 桌面", desc: "查找桌面文件，整理学习内容", icon: Monitor, tone: "text-[#3F4650] bg-[#F4F5F7]" },
  { id: "downloads", title: "Mac 下载", desc: "自动发现下载目录中的新资料", icon: Download, tone: "text-[#7E85D9] bg-[#F1F1FF]" },
  { id: "documents", title: "Mac 文稿", desc: "读取文稿，理解其中的内容", icon: FileText, tone: "text-[#2BA6E7] bg-[#ECF8FF]" },
  { id: "local", title: "Mac 本地文件", desc: "选择授权文件夹，持续整理内容", icon: FolderOpen, tone: "text-[#B57A2A] bg-[#FFF6E7]" },
  { id: "notes", title: "课程笔记", desc: "同步课堂笔记，加入个人知识库", icon: StickyNote, tone: "text-[#D8A31D] bg-[#FFF9DC]" },
  { id: "calendar", title: "课程日历", desc: "结合课程与截止时间安排学习", icon: CalendarDays, tone: "text-[#E56B75] bg-[#FFF0F2]" },
];

export function ConnectionModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [connected, setConnected] = useState<Set<string>>(() => new Set(["local"]));
  if (!isOpen) return null;

  const toggle = (id: string) => setConnected(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/25 p-8 backdrop-blur-[2px]" onClick={onClose}>
      <section className="relative flex max-h-[880px] w-full max-w-[930px] flex-col overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(155deg,#EAF5FF_0%,#F2F4FF_50%,#FFF3E8_100%)] shadow-[0_28px_90px_rgba(39,48,72,.24)]" onClick={event => event.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute right-6 top-6 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/70 text-[#697180]" aria-label="关闭连接面板"><X size={18}/></button>
        <div className="overflow-y-auto px-10 pb-9 pt-11">
          <div className="text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/85 text-[#5967F2] ring-1 ring-white"><Link2 size={21}/></span>
            <h2 className="mt-5 text-[28px] font-semibold tracking-[-.02em] text-[#262A31]">连接你的知识来源</h2>
            <p className="mt-2 text-[13px] text-[#697180]">MEMO 会持续整理你授权的资料，构建只属于你的个人知识库。</p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {sources.map(({ id, title, desc, icon: Icon, tone }) => {
              const active = connected.has(id);
              return <article key={id} className="flex min-h-[150px] flex-col rounded-[24px] border border-white/80 bg-white/65 p-5 backdrop-blur-xl">
                <div className="flex items-start gap-4">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-[15px] ${tone}`}><Icon size={22}/></span>
                  <div className="min-w-0"><h3 className="text-[16px] font-semibold text-[#30343B]">{title}</h3><p className="mt-1 text-[11px] leading-5 text-[#7D8490]">{desc}</p></div>
                </div>
                <button type="button" onClick={() => toggle(id)} className={`mt-auto h-9 self-center rounded-full px-8 text-[11px] font-medium transition ${active ? "bg-[#EAF7EF] text-[#279363]" : "bg-[#ECEEF3] text-[#4D5CFF]"}`}>{active ? "已连接" : "连接"}</button>
              </article>;
            })}
          </div>
          <p className="mt-7 text-center text-[10px] leading-5 text-[#828996]">你的资料仅用于构建个人知识库，可随时断开连接。</p>
        </div>
      </section>
    </div>
  );
}
