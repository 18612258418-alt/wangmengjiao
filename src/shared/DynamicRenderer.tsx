import { MathContent } from "./MathContent";

export function DynamicRenderer({
  text,
  onLinkClick,
}: {
  text: string;
  onLinkClick?: (word: string) => void;
}) {
  return (
    <MathContent
      text={text}
      onLinkClick={onLinkClick}
      style={{ fontSize: 13, color: "#41464F", lineHeight: 1.75 }}
    />
  );
}

export function ModuleBadge({
  label, textColor, bgColor, barColor,
}: { label: string; textColor: string; bgColor: string; barColor: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
      <div style={{ width: 4, height: 18, borderRadius: 3, background: barColor, flexShrink: 0 }} />
      <span style={{ fontSize: 14, fontWeight: 700, color: textColor, background: bgColor, padding: "2px 10px", borderRadius: 8, letterSpacing: "0.02em" }}>
        {label}
      </span>
    </div>
  );
}
