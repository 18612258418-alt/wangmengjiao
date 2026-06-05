// ─── LLM JSON 容错解析工具 ────────────────────────────────────────────────
// 大模型常在 JSON 字符串里直接写 LaTeX（如 $\sin$、$\theta$、\frac、\nabla），
// 反斜杠在 JSON 中是转义符，这些会让 JSON.parse 报 "Bad escaped character" 而整体失败。
// 这里集中提供：抽取 JSON 子串 + 修复非法转义 + 容错解析。

/** 从可能含前后缀/markdown 的文本里抽取最外层 {...} JSON 子串。 */
export function extractJsonObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match?.[0] ?? null;
}

/**
 * 修复大模型在 JSON 字符串里直接写 LaTeX 导致的非法转义。
 * 关键权衡：LaTeX 命令常是 \ + 字母（\theta \frac \beta \tau \nabla …），若按 JSON 规范把
 * \t \n \b \f \r \u 当合法转义，会把 \theta 误伤成制表符等。因此这里只保留 LaTeX 里真正会出现
 * 的合法转义 \" \\ \/，其余 \X 一律当作字面反斜杠补成 \\，既能 JSON.parse 又完整保留 LaTeX。
 * 代价：有意写的 \n 换行会变成字面 "\n"（极少且仅影响显示），换取解析必成功。
 * 用 alternation 先吞掉合法转义对（含已正确转义的 \\），避免二次破坏。
 */
export function repairJsonEscapes(json: string): string {
  return json.replace(/\\(["\\/])|\\/g, (m, valid) => (valid ? m : "\\\\"));
}

/** 先直接解析，失败则修复 LaTeX 反斜杠等非法转义后再解析。 */
export function parseJsonLoose<T>(rawJson: string): T {
  try {
    return JSON.parse(rawJson) as T;
  } catch {
    return JSON.parse(repairJsonEscapes(rawJson)) as T;
  }
}
