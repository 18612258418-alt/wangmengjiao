import type { CSSProperties } from "react";
import katex from "katex";
import { renderTextWithLinks } from "../components/ConceptPage";
import { parseMathSegments, parseMathSegmentsExplicit } from "../utils/parseMathSegments";

function renderKatexHtml(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      trust: true,
      output: "html",
    });
  } catch {
    return latex.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

function KatexInline({ math }: { math: string }) {
  return (
    <span
      className="katex-inline-math align-baseline mx-0.5"
      dangerouslySetInnerHTML={{ __html: renderKatexHtml(math, false) }}
    />
  );
}

function KatexDisplay({ math }: { math: string }) {
  return (
    <div
      className="katex-display-block my-3 py-3.5 px-4 rounded-lg border border-[#e8eaed] bg-[#f8f9fa] overflow-x-auto"
      role="math"
      aria-label="公式"
    >
      <div
        className="katex-display-inner min-w-0 flex justify-center"
        dangerouslySetInnerHTML={{ __html: renderKatexHtml(math, true) }}
      />
    </div>
  );
}

export function MathContent({
  text,
  onLinkClick,
  className,
  style,
  mathMode = "auto",
}: {
  text: string;
  onLinkClick?: (word: string) => void;
  className?: string;
  style?: CSSProperties;
  /** auto：智能识别整行公式；explicit：仅渲染 $…$ 定界符（试卷题干等自然语言场景） */
  mathMode?: "auto" | "explicit";
}) {
  const segments = mathMode === "explicit" ? parseMathSegmentsExplicit(text) : parseMathSegments(text);

  return (
    <span className={className} style={{ ...style, whiteSpace: "pre-wrap" }}>
      {segments.map((seg, i) => {
        if (seg.type === "display") {
          return <KatexDisplay key={i} math={seg.content} />;
        }
        if (seg.type === "inline") {
          return <KatexInline key={i} math={seg.content} />;
        }
        if (seg.content === "\n") {
          return <br key={i} />;
        }
        return (
          <span key={i}>
            {onLinkClick ? renderTextWithLinks(seg.content, onLinkClick) : seg.content}
          </span>
        );
      })}
    </span>
  );
}

/** 块级排版：段落文字与展示公式自然分段（用于详情页长文） */
export function MathParagraph({
  text,
  onLinkClick,
  className,
}: {
  text: string;
  onLinkClick?: (word: string) => void;
  className?: string;
}) {
  const blocks = text.split(/\n{2,}/).filter(s => s.trim().length > 0);
  if (blocks.length <= 1) {
    return (
      <div className={className}>
        <MathContent text={text} onLinkClick={onLinkClick} />
      </div>
    );
  }
  return (
    <div className={`flex flex-col gap-3 ${className ?? ""}`}>
      {blocks.map((block, i) => (
        <div key={i} className="text-[13px] text-[#334155] leading-[1.85]">
          <MathContent text={block.trim()} onLinkClick={onLinkClick} />
        </div>
      ))}
    </div>
  );
}
