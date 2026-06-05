import type { InteractiveSpec } from "../../types";

export const SANDPACK_INDEX_TSX = `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<App />);
`;

export const SANDPACK_STYLES = `* { box-sizing: border-box; }
html, body, #root { margin: 0; padding: 0; min-height: 100%; }
body {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f8fafc;
  color: #0f172a;
}
body { overflow-y: auto; }
button, input { font: inherit; }
`;

export const SANDPACK_DEPENDENCIES = {
  "@react-three/drei": "latest",
  "@react-three/fiber": "latest",
  "framer-motion": "latest",
  "katex": "latest",
  "matter-js": "latest",
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "react-katex": "latest",
  "recharts": "latest",
  "three": "latest",
};

function sanitizeSandpackCode(raw: string): string {
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:tsx|jsx|ts|js|react|javascript|typescript)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  } else {
    text = text.replace(/^```[a-zA-Z]*\s*\n?/, "");
    text = text.replace(/\n?```[\s]*$/, "");
  }
  return text
    .replace(/^\s*(以下是代码[:：]?|代码如下[:：]?|App\.tsx[:：]?)\s*\n+/i, "")
    .trim();
}

export function buildSandpackFiles(spec: InteractiveSpec) {
  const appCode = spec.appCode?.trim()
    ? sanitizeSandpackCode(spec.appCode)
    : fallbackInteractiveApp(spec.explanation);
  return {
    "/index.tsx": SANDPACK_INDEX_TSX,
    "/styles.css": SANDPACK_STYLES,
    "/App.tsx": appCode,
  };
}

export function fallbackInteractiveApp(explanation?: string): string {
  return `import React, { useMemo, useState } from "react";

export default function App() {
  const [force, setForce] = useState(20);
  const [mass, setMass] = useState(4);
  const acceleration = useMemo(() => force / Math.max(mass, 0.1), [force, mass]);
  const width = Math.min(92, 18 + acceleration * 12);

  return (
    <div style={{ padding: 20, minHeight: 360, background: "linear-gradient(180deg,#f8fafc,#eef2ff)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", background: "white", borderRadius: 24, padding: 20, boxShadow: "0 16px 40px rgba(15,23,42,.12)" }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>牛顿第二定律交互实验</h2>
        <p style={{ color: "#64748b", lineHeight: 1.7 }}>
          ${explanation || "拖动滑块改变外力 F 和质量 m，观察加速度 a = F / m 如何变化。"}
        </p>
        <div style={{ display: "grid", gap: 16 }}>
          <label>外力 F：{force} N<input style={{ width: "100%" }} type="range" min="1" max="50" value={force} onChange={e => setForce(Number(e.target.value))} /></label>
          <label>质量 m：{mass} kg<input style={{ width: "100%" }} type="range" min="1" max="12" value={mass} onChange={e => setMass(Number(e.target.value))} /></label>
        </div>
        <div style={{ marginTop: 24, padding: 18, borderRadius: 18, background: "#f1f5f9" }}>
          <div style={{ height: 80, position: "relative", borderBottom: "4px solid #94a3b8" }}>
            <div style={{ position: "absolute", left: width + "%", bottom: 4, width: 70, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", transition: "left .35s ease", boxShadow: "0 10px 24px rgba(79,70,229,.3)" }} />
          </div>
          <p style={{ fontWeight: 700, color: "#4f46e5" }}>a = F / m = {acceleration.toFixed(2)} m/s²</p>
        </div>
      </div>
    </div>
  );
}
`;
}
