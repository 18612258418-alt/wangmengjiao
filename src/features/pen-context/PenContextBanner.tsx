import { Sparkles } from "lucide-react";
import { usePenContext } from "./usePenContext";

export function PenContextBanner({
  visible,
  hint,
  className = "",
  style,
}: {
  visible?: boolean;
  hint?: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ctx = usePenContext();
  const show = visible ?? ctx.showToolbar;
  const text = hint ?? ctx.hint;

  if (!show || !text) return null;

  return (
    <div
      className={`pointer-events-none z-10 ${className}`}
      style={style}
    >
      <div className="bg-[rgba(10,12,30,0.72)] backdrop-blur-sm text-white text-[13px] px-4 py-2.5 rounded-2xl max-w-[560px] text-center leading-6 shadow-xl flex items-center gap-2 justify-center">
        <Sparkles size={14} className="text-[#8B9AFF] flex-shrink-0" />
        <span>{text}</span>
      </div>
    </div>
  );
}
