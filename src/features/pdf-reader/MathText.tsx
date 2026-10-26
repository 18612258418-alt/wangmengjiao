import type { ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

function renderTex(tex: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(tex.trim(), {
      displayMode,
      throwOnError: true,
      strict: false,
      output: "html",
    });
  } catch {
    return null;
  }
}

/** 把 **加粗** 转成 <strong>，其余原样输出 */
function renderPlain(text: string, keyBase: string): ReactNode[] {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1
      ? <strong key={`${keyBase}-b${i}`} style={{ fontWeight: 700 }}>{p}</strong>
      : p,
  );
}

interface Props {
  text: string;
  className?: string;
}

/**
 * 渲染含 LaTeX 公式的文本。
 * 支持 $...$、$$...$$、\(...\)、\[...\] 四种定界符；公式渲染失败时回退为原文。
 */
export function MathText({ text, className }: Props) {
  const re = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(...renderPlain(text.slice(last, m.index), `t${i}`));
    }
    const isDisplay = m[1] !== undefined || m[2] !== undefined;
    const tex = m[1] ?? m[2] ?? m[3] ?? m[4] ?? "";
    const html = renderTex(tex, isDisplay);
    if (html === null) {
      nodes.push(m[0]);
    } else if (isDisplay) {
      nodes.push(
        <span
          key={`m${i}`}
          className="block my-1 overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />,
      );
    } else {
      nodes.push(<span key={`m${i}`} dangerouslySetInnerHTML={{ __html: html }} />);
    }
    last = m.index + m[0].length;
    i += 1;
  }
  if (last < text.length) {
    nodes.push(...renderPlain(text.slice(last), "tail"));
  }

  return <span className={className}>{nodes}</span>;
}
