import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";

/** 学科名称：点击进入编辑，回车/失焦保存，Esc 取消。 */
export function EditableSubjectName({
  name,
  onRename,
}: {
  name: string;
  onRename: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(name); }, [name]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== name) onRename(next);
    else setDraft(name);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(name); setEditing(false); }
        }}
        maxLength={20}
        className="text-[22px] text-[#020418] bg-transparent border-b-2 border-[#4D5CFF] outline-none px-0.5 max-w-[260px]"
        style={{ fontWeight: 700 }}
      />
    );
  }

  return (
    <h1
      className="group inline-flex items-center gap-1.5 text-[22px] text-[#020418] cursor-text"
      style={{ fontWeight: 700 }}
      onClick={() => setEditing(true)}
      title="点击修改名称"
    >
      {name}
      <Pencil size={14} className="text-[#B0B5C0] opacity-0 group-hover:opacity-100 transition-opacity" />
    </h1>
  );
}
