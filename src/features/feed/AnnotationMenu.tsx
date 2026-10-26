import { useRef } from "react";
import { Sparkles } from "lucide-react";

export function AnnotationMenu({
  onOpenDemo,
}: {
  onOpenAnnotation?: (type: string) => void;
  onOpenPdfReader?: (file: File) => void;
  onOpenCamera?: () => void;
  onOpenScreenshot?: () => void;
  onOpenVoice?: () => void;
  onOpenDemo?: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* 场景 Demo 入口 */}
      {onOpenDemo && (
        <button
          onClick={onOpenDemo}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[#4D5CFF] bg-[#EEF0FF] hover:bg-[#DDE1FF] transition-colors text-[13px]"
          style={{ fontWeight: 600 }}
        >
          <Sparkles size={14} />
          场景 Demo
        </button>
      )}

      {/* 保留隐藏的文件输入，外部若需要 PDF 精读仍可通过 ref 触发 */}
      <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" />
    </div>
  );
}
