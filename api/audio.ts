/**
 * 音频 ASR 端点 — 使用火山引擎「智能语音技术」短语音识别
 *
 * 所需环境变量：
 *   VOLC_ASR_APP_ID   — 火山控制台 → 智能语音技术 → 应用管理 → AppID
 *   VOLC_ASR_TOKEN    — 同上 → 访问令牌 (Access Token)
 *
 * 请求体 (JSON):
 *   { audioBase64: string; format: "mp3"|"m4a"|"wav"|...; fileName?: string }
 *
 * 响应体 (JSON):
 *   { transcript: string } | { error: string }
 *
 * 文件大小限制:
 *   Vercel 免费版请求体上限 4.5 MB (base64 编码后约 3.3 MB 原始音频)。
 *   在 64 kbps 语音录音下约 7 分钟；128 kbps 下约 3.5 分钟。
 *   超长课堂录音请分段上传，或在录音 App 中导出低码率版本（≤64 kbps）。
 */

// Node.js serverless runtime — 不加 edge 以便获得稍长的超时窗口
export const config = { maxDuration: 60 };

declare const process: { env: Record<string, string | undefined> };

interface AudioRequestBody {
  audioBase64?: string;
  format?: string;
  fileName?: string;
  /** 轻量探测：不接收音频，仅检查 ASR 是否可用 */
  probe?: boolean;
}

const DEMO_TRANSCRIPT = `好的，今天我们继续讲第十二章机械振动与机械波。

上节课我们介绍了简谐振动的基本方程 x(t) = A·cos(ωt + φ₀)，今天重点讲旋转矢量法和多振动的叠加。

旋转矢量法的核心思想是用一个匀速旋转的矢量来表示简谐振动，矢量的长度等于振幅，矢量在 x 轴上的投影就是位移。

当 N 个同频等幅振动叠加时，相邻振动的相位差为 δ，合振幅公式为 R = A·sin(Nδ/2) / sin(δ/2)。

下课前布置一道题：两列振幅相同、频率相同但相位相差 π/3 的振动叠加，求合振幅和初相位。`;

function demoResponse(): Response {
  return new Response(
    JSON.stringify({ transcript: DEMO_TRANSCRIPT, demo: true }),
    { headers: { "Content-Type": "application/json" } },
  );
}

interface VolcAsrResult {
  reqid?: string;
  code?: number;
  message?: string;
  result?: Array<{ text: string; confidence?: number }>;
  utterances?: Array<{ text: string; start_time?: number; end_time?: number }>;
}

/** 从文件名推导音频格式 */
function detectFormat(fileName?: string, defaultFmt = "mp3"): string {
  if (!fileName) return defaultFmt;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const supported: Record<string, string> = {
    mp3: "mp3", m4a: "m4a", mp4: "mp4", wav: "wav",
    ogg: "ogg", flac: "flac", opus: "opus", aac: "aac",
    webm: "webm", amr: "amr", wma: "wma",
  };
  return supported[ext] ?? defaultFmt;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const appId = process.env.VOLC_ASR_APP_ID;
  const token = process.env.VOLC_ASR_TOKEN;

  let body: AudioRequestBody;
  try {
    body = await req.json() as AudioRequestBody;
  } catch {
    return new Response(
      JSON.stringify({ error: "请求体格式错误，应为 JSON。" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (body.probe) {
    if (!appId || !token) return demoResponse();
    return new Response(
      JSON.stringify({ available: true }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  if (!appId || !token) {
    return demoResponse();
  }

  if (!body.audioBase64) {
    return new Response(
      JSON.stringify({ error: "缺少 audioBase64 字段。" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const format = body.format || detectFormat(body.fileName);
  const reqId = `aim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  let asrRes: Response;
  try {
    asrRes = await fetch("https://openspeech.bytedance.com/api/v1/asr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer appid=${appId};token=${token};cluster=volcengine_streaming_common`,
      },
      body: JSON.stringify({
        user: { uid: "ai_memory" },
        audio: { format, data: body.audioBase64, bits: 16, channel: 1 },
        request: { reqid: reqId, nbest: 1, sequence: -1, appid: appId },
        app: { appid: appId, token, cluster: "volcengine_streaming_common" },
      }),
    });
  } catch (fetchErr) {
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    return new Response(
      JSON.stringify({ error: `调用火山 ASR 失败：${msg}` }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!asrRes.ok) {
    const errText = await asrRes.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: `火山 ASR 接口返回 ${asrRes.status}：${errText.slice(0, 300)}` }),
      { status: asrRes.status, headers: { "Content-Type": "application/json" } },
    );
  }

  let data: VolcAsrResult;
  try {
    data = await asrRes.json() as VolcAsrResult;
  } catch {
    return new Response(
      JSON.stringify({ error: "火山 ASR 返回内容解析失败，请稍后重试。" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // code 1000 = Success
  if (data.code !== undefined && data.code !== 1000) {
    return new Response(
      JSON.stringify({
        error: `语音识别错误 (code ${data.code})：${data.message ?? "未知错误"}。请检查 AppID / Token 是否正确，以及音频格式是否受支持。`,
      }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }

  // 提取转录文本：优先 result，其次 utterances
  const transcript =
    data.result?.map(r => r.text).join(" ").trim() ||
    data.utterances?.map(u => u.text).join(" ").trim() ||
    "";

  if (!transcript) {
    return new Response(
      JSON.stringify({
        error: "未识别到有效语音内容，请确认音频文件有声音且格式正确（支持 mp3/m4a/wav/ogg/flac）。",
      }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ transcript }), {
    headers: { "Content-Type": "application/json" },
  });
}
