/** 笔记来源图标 — bundle 独立版，不依赖 initialData 图片资源 */

const SOURCE_COLORS: Record<string, string> = {
  browser: "#6366F1",
  zhihu: "#0066FF",
  evernote: "#00A82D",
  youdao: "#E03E3E",
};

export function sourceLabel(source: string) {
  const map: Record<string, string> = {
    browser: "浏览器",
    zhihu: "知乎",
    evernote: "印象笔记",
    youdao: "网易有道",
  };
  return map[source] ?? source;
}

export function SourceIcon({ source, size = 20 }: { source: string; size?: number }) {
  const label = sourceLabel(source);
  const bg = SOURCE_COLORS[source] ?? "#9CA3AF";
  const char = label[0] ?? "?";

  return (
    <span
      aria-label={label}
      title={label}
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        background: bg,
        color: "#fff",
        fontSize: Math.max(10, size * 0.55),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {char}
    </span>
  );
}
