// Edge 运行时专为流式设计：首字节即时下发、不缓冲整段响应，网关允许 ~25s 流式时长。
// 关闭思考模式后出题约 12s，远低于该上限，可避免 nodejs 下的 FUNCTION_INVOCATION_TIMEOUT(504)。
export const config = {
  runtime: "edge",
};

declare const process: {
  env: Record<string, string | undefined>;
};

const SYSTEM_PROMPT =
  "你是一位专业的中国大学学习助手。用亲切自然的语气输出中文内容。严格遵守用户提示中给出的格式要求；不要使用任何 markdown 符号（不要用 #、*、-、**、>、~ 等），直接换行分段即可。";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  const defaultModel = process.env.DEEPSEEK_MODEL_ID || "deepseek-v4-pro";

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "DEEPSEEK_API_KEY not configured on server" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let prompt: string;
  let stream: boolean;
  let modelId: string;
  let maxTokens: number;
  let thinking: boolean;
  try {
    const body = await req.json() as { prompt: string; stream?: boolean; model?: string; maxTokens?: number; thinking?: boolean };
    prompt = body.prompt;
    stream = body.stream ?? true;
    modelId = body.model || defaultModel;
    maxTokens = typeof body.maxTokens === "number" && body.maxTokens > 0 ? Math.min(body.maxTokens, 16384) : 8192;
    // DeepSeek V4 模型的思考模式默认开启，会先生成大段 reasoning_content 再出正文，
    // 既慢又容易在 60s 函数上限内被截断。本应用全是结构化/文本生成，默认关闭思考。
    thinking = body.thinking === true;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const upstream = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      stream,
      max_tokens: maxTokens,
      thinking: { type: thinking ? "enabled" : "disabled" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: `DeepSeek ${upstream.status}: ${errText}` }),
      { status: upstream.status, headers: { "Content-Type": "application/json" } }
    );
  }

  if (stream) {
    // Proxy the SSE stream transparently
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  }

  const data = await upstream.json();
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
