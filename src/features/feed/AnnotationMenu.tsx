import { useState, useEffect, useRef } from "react";
import { BookOpen, FileText, ClipboardList, Plus, ScanSearch } from "lucide-react";

const annotationItems = [
  { id: "courseware", label: "课件", icon: BookOpen },
  { id: "notes", label: "笔记", icon: FileText },
  { id: "exercises", label: "网课", icon: ClipboardList },
];

export function AnnotationMenu({
  onOpenAnnotation,
  onOpenPdfReader,
}: {
  onOpenAnnotation: (type: string) => void;
  onOpenPdfReader: (file: File) => void;
}) {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const handlePdfReaderClick = () => {
    setOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onOpenPdfReader(file);
    e.target.value = "";
  };

  return (
    <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 bg-[#4D5CFF] text-white px-3.5 py-2 rounded-xl hover:bg-[#3D4CEF] transition-colors duration-150 shadow-sm"
      >
        <Plus size={14} />
        <span className="text-[13px]" style={{ fontWeight: 600 }}>批注</span>
      </button>

      {/* Hidden file input for PDF */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {open && (
        <div className="absolute right-0 top-10 mt-1 w-40 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-[#EAEDF2] overflow-hidden z-50">
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

          {/* Divider */}
          <div className="mx-3 h-px bg-[#EAEDF2]" />

          {/* PDF Reader entry */}
          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-[14px] hover:bg-[#EEF0FF] transition-colors"
            style={{ color: "#4D5CFF" }}
            onClick={handlePdfReaderClick}
          >
            <ScanSearch size={15} />
            <span style={{ fontWeight: 600 }}>PDF 精读</span>
          </button>
        </div>
      )}
    </div>
  );
}
