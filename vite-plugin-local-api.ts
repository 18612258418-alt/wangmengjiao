import type { Connect, Plugin } from "vite";
import { loadEnv } from "vite";

type ApiHandler = (req: Request) => Promise<Response>;

const API_LOADERS: Record<string, () => Promise<{ default: ApiHandler }>> = {
  "/api/import": () => import("./api/import"),
  "/api/doubao": () => import("./api/doubao"),
  "/api/deepseek": () => import("./api/deepseek"),
};

function applyEnv(mode: string, root: string) {
  // preview 使用 production mode，同时加载 development 与 production 下的 .env.local
  for (const m of [mode, "development", "production"]) {
    const env = loadEnv(m, root, "");
    for (const [key, value] of Object.entries(env)) {
      if (value) process.env[key] = value;
    }
  }
  if (!process.env.DOUBAO_API_KEY && process.env.VITE_DOUBAO_API_KEY) {
    process.env.DOUBAO_API_KEY = process.env.VITE_DOUBAO_API_KEY;
  }
  if (!process.env.DOUBAO_MODEL_ID && process.env.VITE_DOUBAO_MODEL_ID) {
    process.env.DOUBAO_MODEL_ID = process.env.VITE_DOUBAO_MODEL_ID;
  }
  if (!process.env.DEEPSEEK_API_KEY && process.env.VITE_DEEPSEEK_API_KEY) {
    process.env.DEEPSEEK_API_KEY = process.env.VITE_DEEPSEEK_API_KEY;
  }
  if (!process.env.DEEPSEEK_MODEL_ID && process.env.VITE_DEEPSEEK_MODEL_ID) {
    process.env.DEEPSEEK_MODEL_ID = process.env.VITE_DEEPSEEK_MODEL_ID;
  }
}

function readBody(req: Connect.IncomingMessage): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", chunk => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      const raw = Buffer.concat(chunks);
      resolve(raw.length ? raw.toString("utf8") : undefined);
    });
    req.on("error", reject);
  });
}

function toWebRequest(req: Connect.IncomingMessage, body?: string): Request {
  const host = req.headers.host ?? "127.0.0.1";
  const url = `http://${host}${req.url ?? "/"}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  const method = req.method ?? "GET";
  return new Request(url, {
    method,
    headers,
    body: method !== "GET" && method !== "HEAD" ? body : undefined,
  });
}

async function writeWebResponse(res: Connect.ServerResponse, webRes: Response) {
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    res.setHeader(key, value);
  });
  const buffer = Buffer.from(await webRes.arrayBuffer());
  res.end(buffer);
}

function mountLocalApi(
  middlewares: Connect.Server,
  mode: string,
  root: string,
) {
  middlewares.use(async (req, res, next) => {
    const pathname = req.url?.split("?")[0];
    if (!pathname?.startsWith("/api/")) return next();

    const loader = pathname ? API_LOADERS[pathname] : undefined;
    if (!loader) return next();

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.end();
      return;
    }

    try {
      applyEnv(mode, root);
      const mod = await loader();
      const body = await readBody(req);
      const webRes = await mod.default(toWebRequest(req, body));
      await writeWebResponse(res, webRes);
    } catch (err) {
      console.error("[local-api]", pathname, err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  });
}

/** 在 vite dev / preview 下挂载 api/*.ts，避免 /api/import 返回 404 */
export function localApiPlugin(): Plugin {
  return {
    name: "local-api",
    configureServer(server) {
      mountLocalApi(server.middlewares, server.config.mode, server.config.root);
    },
    configurePreviewServer(server) {
      mountLocalApi(server.middlewares, server.config.mode, server.config.root);
    },
  };
}
