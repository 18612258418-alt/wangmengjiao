export type ParsedSection = { title: string; content: string };

/** Line-by-line parser: only lines that are entirely 【xxx】 become section headings. */
export function parseSections(raw: string): ParsedSection[] {
  const lines = raw.split("\n");
  const result: ParsedSection[] = [];
  let currentTitle = "";
  const buf: string[] = [];

  const flush = () => {
    if (!currentTitle) return;
    const content = buf.join("\n").trim();
    if (content) result.push({ title: currentTitle, content });
    buf.length = 0;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^【[^】]+】$/.test(trimmed)) {
      flush();
      currentTitle = trimmed.slice(1, -1);
    } else if (currentTitle) {
      buf.push(line);
    }
  }
  flush();
  return result;
}

/** Split-based parser for legacy skill raw sections with inline 【xxx】 markers. */
export function parseSkillSections(raw: string): ParsedSection[] {
  const parts = raw.split(/(【[^】]+】)/);
  const result: ParsedSection[] = [];
  let currentTitle = "";
  for (const part of parts) {
    if (part.startsWith("【") && part.endsWith("】")) {
      currentTitle = part.slice(1, -1);
    } else if (currentTitle && part.trim()) {
      result.push({ title: currentTitle, content: part.trim() });
      currentTitle = "";
    }
  }
  return result;
}

/** @deprecated Use parseSections — kept as alias for unified detail content. */
export const parseUnifiedSections = parseSections;
