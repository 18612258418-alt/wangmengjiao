import { useState, useEffect } from "react";
import { BookOpen, FileText, ClipboardList, Plus } from "lucide-react";

const annotationItems = [
  { id: "courseware", label: "课件", icon: BookOpen },
  { id: "notes", label: "笔记", icon: FileText },
  { id: "exercises", label: "网课", icon: ClipboardList },
];

export function AnnotationMenu({
  onOpenAnnotation,
}: {
  onOpenAnnotation: (type: string) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 bg-[#4D5CFF] text-white px-3.5 py-2 rounded-xl hover:bg-[#3D4CEF] transition-colors duration-150 shadow-sm"
      >
        <Plus size={14} />
        <span className="text-[13px]" style={{ fontWeight: 600 }}>批注</span>
      </button>
      {open && (
        <div className="absolute right-0 top-10 mt-1 w-36 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-[#EAEDF2] overflow-hidden z-50">
          {annotationItems.map(item => (
            <button
              key={item.id}
              className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-[#020418] hover:bg-[#F5F6FA] transition-colors"
              onClick={() => {
                setOpen(false);
                onOpenAnnotation(item.id);
              }}
            >
              <item.icon size={15} className="text-[#7B8291]" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
