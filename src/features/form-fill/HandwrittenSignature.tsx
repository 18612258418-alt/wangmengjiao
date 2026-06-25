import signatureImg from "../../assets/signature-yangning.png";

interface HandwrittenSignatureProps {
  name: string;
  className?: string;
}

/** 表单内联展示用手写签名（预设签名图） */
export function HandwrittenSignature({ name, className = "" }: HandwrittenSignatureProps) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <img
        src={signatureImg}
        alt={name.trim() ? `${name.trim()}的签名` : "手写签名"}
        className="h-14 w-auto max-w-[160px] object-contain select-none pointer-events-none"
        draggable={false}
      />
    </div>
  );
}

export function isLegacySignatureDataUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("data:image/svg") || url.includes("<svg") || url.includes("stroke-linecap");
}
