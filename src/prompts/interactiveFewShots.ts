import type { InteractionType } from "../types";

const PHYSICS_FEW_SHOT = `import React, { useEffect, useMemo, useRef, useState } from "react";

export default function App() {
  const [rightAngle, setRightAngle] = useState(30);
  const [friction, setFriction] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hud, setHud] = useState({ height: 0, velocity: 0, loss: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controlsRef = useRef({ rightAngle, friction, playing });
  const stateRef = useRef({ s: 0, v: 0, lastT: 0, maxH: 0, loss: 0 });

  useEffect(() => { controlsRef.current = { rightAngle, friction, playing }; }, [rightAngle, friction, playing]);

  const reset = () => {
    stateRef.current = { s: 0, v: 0, lastT: 0, maxH: 0, loss: 0 };
    setHud({ height: 0, velocity: 0, loss: 0 });
    setPlaying(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 760, H = 360;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.scale(dpr, dpr);

    const groundY = 280;
    const leftTop = { x: 80, y: 100 };
    const leftBottom = { x: 280, y: groundY };
    const rightStart = { x: 460, y: groundY };

    const g = 9.8;

    let raf = 0;
    const draw = () => {
      const { rightAngle: a, friction: f } = controlsRef.current;
      const aRad = (a * Math.PI) / 180;
      const rightLen = 320;
      const rightEnd = {
        x: rightStart.x + Math.cos(aRad) * rightLen,
        y: rightStart.y - Math.sin(aRad) * rightLen,
      };

      const leftLen = Math.hypot(leftBottom.x - leftTop.x, leftBottom.y - leftTop.y);
      const flatLen = rightStart.x - leftBottom.x;
      const totalLen = leftLen + flatLen + rightLen;

      const s = Math.max(0, Math.min(stateRef.current.s, totalLen));
      let ball = { x: 0, y: 0 };
      let onSegment: "left" | "flat" | "right" = "left";
      if (s <= leftLen) {
        const t = s / leftLen;
        ball.x = leftTop.x + (leftBottom.x - leftTop.x) * t;
        ball.y = leftTop.y + (leftBottom.y - leftTop.y) * t;
        onSegment = "left";
      } else if (s <= leftLen + flatLen) {
        const t = (s - leftLen) / flatLen;
        ball.x = leftBottom.x + flatLen * t;
        ball.y = groundY;
        onSegment = "flat";
      } else {
        const t = (s - leftLen - flatLen) / rightLen;
        ball.x = rightStart.x + (rightEnd.x - rightStart.x) * t;
        ball.y = rightStart.y + (rightEnd.y - rightStart.y) * t;
        onSegment = "right";
      }

      ctx.clearRect(0, 0, W, H);

      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#f8fafc"); grad.addColorStop(1, "#eef2ff");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = "#cbd5f5"; ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(40, leftTop.y); ctx.lineTo(W - 40, leftTop.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#94a3b8"; ctx.font = "12px Inter";
      ctx.fillText("初始等高线", 48, leftTop.y - 6);

      ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 5; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(leftTop.x, leftTop.y);
      ctx.lineTo(leftBottom.x, leftBottom.y);
      ctx.lineTo(rightStart.x, rightStart.y);
      ctx.lineTo(rightEnd.x, rightEnd.y);
      ctx.stroke();

      ctx.fillStyle = "#2563eb";
      ctx.beginPath(); ctx.arc(ball.x, ball.y - 12, 12, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ball.x, ball.y - 12); ctx.lineTo(ball.x, ball.y - 12 + 30); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ball.x - 4, ball.y - 12 + 26);
      ctx.lineTo(ball.x, ball.y - 12 + 32);
      ctx.lineTo(ball.x + 4, ball.y - 12 + 26);
      ctx.closePath();
      ctx.fillStyle = "#1d4ed8"; ctx.fill();

      const heightPx = leftTop.y - ball.y + 12;
      const heightLogical = Math.max(0, (leftTop.y - groundY) - heightPx + (leftTop.y - groundY)) / 12;
      const hLogical = Math.max(0, (groundY - ball.y - 12) / 12);

      setHud(prev => {
        if (Math.abs(prev.height - hLogical) < 0.05 && Math.abs(prev.velocity - Math.abs(stateRef.current.v) / 12) < 0.05 && Math.abs(prev.loss - stateRef.current.loss) < 0.05) return prev;
        return { height: hLogical, velocity: Math.abs(stateRef.current.v) / 12, loss: stateRef.current.loss };
      });
    };

    const tick = (now: number) => {
      const last = stateRef.current.lastT || now;
      const dt = Math.min(0.033, (now - last) / 1000);
      stateRef.current.lastT = now;

      const c = controlsRef.current;
      if (c.playing) {
        const a = (c.rightAngle * Math.PI) / 180;
        const leftLen = Math.hypot(leftBottom.x - leftTop.x, leftBottom.y - leftTop.y);
        const flatLen = rightStart.x - leftBottom.x;
        const rightLen = 320;
        const totalLen = leftLen + flatLen + rightLen;

        const s = stateRef.current.s;
        const leftAngle = Math.atan2(leftBottom.y - leftTop.y, leftBottom.x - leftTop.x);
        let accel = 0;
        if (s < leftLen) accel = g * Math.sin(leftAngle) - c.friction * g * Math.cos(leftAngle);
        else if (s < leftLen + flatLen) accel = -c.friction * g * (stateRef.current.v >= 0 ? 1 : -1);
        else accel = -g * Math.sin(a) - c.friction * g * Math.cos(a) * (stateRef.current.v >= 0 ? 1 : -1);

        const prevV = stateRef.current.v;
        stateRef.current.v += accel * dt * 12;
        stateRef.current.s += stateRef.current.v * dt;

        const energyLoss = Math.abs(prevV * prevV - stateRef.current.v * stateRef.current.v) / (2 * 12) * c.friction;
        stateRef.current.loss += energyLoss;

        if (stateRef.current.s <= 0) { stateRef.current.s = 0; stateRef.current.v = Math.abs(stateRef.current.v); }
        if (stateRef.current.s >= totalLen) { stateRef.current.s = totalLen; stateRef.current.v = -Math.abs(stateRef.current.v); }
        stateRef.current.maxH = Math.max(stateRef.current.maxH, Math.max(0, (280 - (s < leftLen ? leftTop.y + (leftBottom.y - leftTop.y) * (s / leftLen) : 280)) / 12));
      }

      draw();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{ padding: 20, background: "#f8fafc", minHeight: 540 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", background: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 16px 40px rgba(15,23,42,.08)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#0f172a" }}>伽利略理想斜面实验</p>
            <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>调右斜面角度与摩擦系数，观察小球能否回到等高位置。</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setPlaying(p => !p)} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: playing ? "#f59e0b" : "#2563eb", color: "#fff", cursor: "pointer", fontSize: 14 }}>
              {playing ? "❚❚" : "▶"}
            </button>
            <button onClick={reset} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "#e2e8f0", color: "#0f172a", cursor: "pointer", fontSize: 14 }}>↺</button>
          </div>
        </div>

        <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #e2e8f0", marginBottom: 16 }}>
          <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: 360 }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#0f172a" }}>
            <span style={{ minWidth: 110 }}>右斜面角度：{rightAngle}°</span>
            <input type="range" min={0} max={60} step={1} value={rightAngle} onChange={e => setRightAngle(Number(e.target.value))} style={{ flex: 1, accentColor: "#2563eb" }} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#0f172a" }}>
            <span style={{ minWidth: 110 }}>摩擦系数：{friction.toFixed(2)}</span>
            <input type="range" min={0} max={0.4} step={0.01} value={friction} onChange={e => setFriction(Number(e.target.value))} style={{ flex: 1, accentColor: "#2563eb" }} />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "最大上升高度", value: hud.height.toFixed(2), unit: "m" },
            { label: "当前速度", value: hud.velocity.toFixed(2), unit: "m/s" },
            { label: "能量损耗", value: hud.loss.toFixed(2), unit: "J" },
          ].map(item => (
            <div key={item.label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "12px 14px" }}>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{item.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: "4px 0 0" }}>{item.value}<span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 4 }}>{item.unit}</span></p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}`;

export function getFewShotForInteraction(type: InteractionType): string | undefined {
  switch (type) {
    case "physics_sim": return PHYSICS_FEW_SHOT;
    default: return undefined;
  }
}
