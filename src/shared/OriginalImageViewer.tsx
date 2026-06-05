import { useState } from "react";
import { createPortal } from "react-dom";
import { ImageIcon, X } from "lucide-react";

export function ViewOriginalImageButton({
  onClick,
  label = "查看原图",
  className = "",
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[13px] text-[#4D5CFF] hover:bg-[#EEF0FF] transition-colors flex-shrink-0 ${className}`}
      style={{ fontWeight: 700 }}
    >
      <ImageIcon size={15} />
      {label}
    </button>
  );
}

export function OriginalImageOverlay({
  open,
  onClose,
  src,
  alt = "原始图片",
}: {
  open: boolean;
  onClose: () => void;
  src: string;
  alt?: string;
}) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-8"
      style={{ background: "rgba(15,23,42,0.82)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="查看原始图片"
    >
      <div className="relative max-w-[92vw] max-h-[92vh]" onClick={e => e.stopPropagation()}>
        <img
          src={src}
          alt={alt}
          className="block max-w-[92vw] max-h-[92vh] object-contain rounded-[18px] bg-white"
          style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 w-9 h-9 rounded-full bg-white/95 text-[#0F172A] flex items-center justify-center shadow-md hover:bg-white"
          aria-label="关闭原图"
        >
          <X size={20} />
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** 查看原图按钮 + 全屏预览（与笔记详情一致） */
export function OriginalImageViewer({
  src,
  alt = "原始图片",
  label = "查看原图",
  className = "",
}: {
  src: string;
  alt?: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ViewOriginalImageButton onClick={() => setOpen(true)} label={label} className={className} />
      <OriginalImageOverlay open={open} onClose={() => setOpen(false)} src={src} alt={alt} />
    </>
  );
}
