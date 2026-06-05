import { logoZhihu, logoEvernote, logoYoudao, logoBrowser } from "../data/initialData";

export function SourceIcon({ source, size = 20 }: { source: string; size?: number }) {
  const logoMap: Record<string, string> = {
    zhihu: logoZhihu,
    evernote: logoEvernote,
    youdao: logoYoudao,
    browser: logoBrowser,
  };
  const src = logoMap[source];
  if (!src) return null;
  return (
    <img
      src={src}
      alt={source}
      width={size}
      height={size}
      style={{ borderRadius: 3, objectFit: "contain", flexShrink: 0 }}
    />
  );
}

export function sourceLabel(source: string) {
  const map: Record<string, string> = {
    browser: "浏览器",
    zhihu: "知乎",
    evernote: "印象笔记",
    youdao: "网易有道",
  };
  return map[source] ?? source;
}
