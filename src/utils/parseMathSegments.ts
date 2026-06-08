export type MathSegment =
  | { type: "text"; content: string }
  | { type: "inline"; content: string }
  | { type: "display"; content: string };

const EXPLICIT_MATH_RE =
  /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$|\\\[([\s\S]+?)\\\]|\\\((.+?)\\\)/g;

const MATH_INDICATOR =
  /[=<>\\^_{}]|[∫∑√±×÷]|\\[a-zA-Z]+|[αβγδεθλμπσωΔΩ²³⁻¹]|\d+\s*\/\s*\d+/;

const FORMULA_LINE_RE =
  /^[\s0-9a-zA-Z+\-*/=<>≤≥≠∞∂∇∈∉∪∩±^_{}()[\].,;:\\|∫∑√→←⇒⇔αβγδεθλμπσωΔΩ²³⁻¹·×÷\s]+$/;

const UNICODE_TO_LATEX: Record<string, string> = {
  "²": "^{2}",
  "³": "^{3}",
  "⁻¹": "^{-1}",
  "×": "\\times ",
  "·": "\\cdot ",
  "÷": "\\div ",
  "≤": "\\leq ",
  "≥": "\\geq ",
  "≠": "\\neq ",
  "∞": "\\infty ",
  "∫": "\\int ",
  "∑": "\\sum ",
  "√": "\\sqrt",
  "→": "\\to ",
  "←": "\\leftarrow ",
  "⇒": "\\Rightarrow ",
  "⇔": "\\Leftrightarrow ",
  "∂": "\\partial ",
  "∇": "\\nabla ",
  "α": "\\alpha ",
  "β": "\\beta ",
  "γ": "\\gamma ",
  "δ": "\\delta ",
  "ε": "\\varepsilon ",
  "θ": "\\theta ",
  "λ": "\\lambda ",
  "μ": "\\mu ",
  "π": "\\pi ",
  "σ": "\\sigma ",
  "ω": "\\omega ",
  "Δ": "\\Delta ",
  "Ω": "\\Omega ",
};

/** 将无 $ 包裹的公式行转为更易被 KaTeX 解析的 LaTeX */
export function normalizeLooseLatex(raw: string): string {
  let s = raw.trim();
  for (const [ch, latex] of Object.entries(UNICODE_TO_LATEX)) {
    s = s.split(ch).join(latex);
  }
  s = s.replace(/(\d+)\s*\/\s*([A-Za-z0-9()]+)/g, (_, a, b) => `\\frac{${a}}{${b}}`);
  return s;
}

/** 自然语言句子（含填空下划线）不应被当成独立公式行 */
function looksLikeProse(line: string): boolean {
  const t = line.trim();
  if (t.split(/\s+/).length >= 5) return true;
  if (/_{2,}/.test(t) && /[a-zA-Z]{3,}/.test(t)) return true;
  if (/[.,;:!?]/.test(t) && /\b(the|is|are|was|were|a|an|to|of|in|for)\b/i.test(t)) return true;
  return false;
}

function isFormulaOnlyLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 2 || t.length > 200) return false;
  if (looksLikeProse(t)) return false;
  if (!FORMULA_LINE_RE.test(t)) return false;
  return MATH_INDICATOR.test(t);
}

/** 为行内未包裹的等式补上 $…$ */
export function wrapLooseEquations(text: string): string {
  if (/\$/.test(text)) return text;
  return text.replace(
    /([（(]?[A-Za-z][A-Za-z0-9_]*\s*=\s*[^，。；\n]{2,80}[）)]?)/g,
    match => {
      if (!MATH_INDICATOR.test(match)) return match;
      const inner = match.trim();
      if (inner.startsWith("$")) return match;
      return `$${inner}$`;
    },
  );
}

function pushTextWithLines(chunk: string, out: MathSegment[]) {
  if (!chunk) return;
  const parts = chunk.split("\n");
  parts.forEach((line, idx) => {
    if (idx > 0) out.push({ type: "text", content: "\n" });
    const trimmed = line.trim();
    if (!trimmed) {
      if (line) out.push({ type: "text", content: line });
      return;
    }
    if (isFormulaOnlyLine(trimmed)) {
      out.push({ type: "display", content: normalizeLooseLatex(trimmed) });
      return;
    }
    const wrapped = wrapLooseEquations(line);
    if (wrapped !== line) {
      parseExplicitMath(wrapped, out);
    } else {
      out.push({ type: "text", content: line });
    }
  });
}

function parseExplicitMath(input: string, out: MathSegment[]) {
  let last = 0;
  EXPLICIT_MATH_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = EXPLICIT_MATH_RE.exec(input)) !== null) {
    if (m.index > last) {
      out.push({ type: "text", content: input.slice(last, m.index) });
    }
    const latex = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? "").trim();
    const display = m[1] !== undefined || m[3] !== undefined;
    if (latex) {
      out.push({ type: display ? "display" : "inline", content: latex });
    }
    last = m.index + m[0].length;
  }
  if (last < input.length) {
    out.push({ type: "text", content: input.slice(last) });
  }
}

/** 仅解析显式 $…$ / $$…$$ 定界符，不做「整行猜公式」（适合试卷题干、选项等自然语言文本） */
export function parseMathSegmentsExplicit(input: string): MathSegment[] {
  const text = input ?? "";
  if (!text.trim()) return [{ type: "text", content: text }];

  const out: MathSegment[] = [];
  let last = 0;
  EXPLICIT_MATH_RE.lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = EXPLICIT_MATH_RE.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ type: "text", content: text.slice(last, m.index) });
    }
    const latex = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? "").trim();
    const display = m[1] !== undefined || m[3] !== undefined;
    if (latex) {
      out.push({ type: display ? "display" : "inline", content: latex });
    }
    last = m.index + m[0].length;
  }

  if (last < text.length) {
    out.push({ type: "text", content: text.slice(last) });
  }

  return out.length > 0 ? out : [{ type: "text", content: text }];
}

/** 将文本拆成普通文字 / 行内公式 / 独立展示公式（维基百科式分块） */
export function parseMathSegments(input: string): MathSegment[] {
  const text = input ?? "";
  if (!text.trim()) return [{ type: "text", content: text }];

  const out: MathSegment[] = [];
  let last = 0;
  EXPLICIT_MATH_RE.lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = EXPLICIT_MATH_RE.exec(text)) !== null) {
    if (m.index > last) {
      pushTextWithLines(text.slice(last, m.index), out);
    }
    const latex = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? "").trim();
    const display = m[1] !== undefined || m[3] !== undefined;
    if (latex) {
      out.push({ type: display ? "display" : "inline", content: latex });
    }
    last = m.index + m[0].length;
  }

  if (last < text.length) {
    pushTextWithLines(text.slice(last), out);
  }

  return out.length > 0 ? out : [{ type: "text", content: text }];
}
