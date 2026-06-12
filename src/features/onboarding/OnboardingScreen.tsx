import { useState, useEffect, useRef, useCallback } from "react";
import { Pen, MonitorDown, Camera, Mic, ChevronRight } from "lucide-react";

/** 移动端（尤其 Android）拒绝 display:none 的 input，需用视觉隐藏 */
const HIDDEN_FILE_INPUT_STYLE: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

interface Props {
  onEnter: () => void;
  /** "first"：首次加载淡入，scale+fade退出；"demo"：从底部滑入，向下滑出 */
  mode?: "first" | "demo";
  onPdfSelected?: (file: File) => void;
  onOpenScreenshot?: () => void;
  onOpenCamera?: () => void;
  onOpenVoice?: () => void;
}

// ───── 实时时钟 ─────
function useClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function pad(n: number) { return String(n).padStart(2, "0"); }
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ───── 彩色流体球（纯CSS）─────
function FluidOrb() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
      {/* 最大外圆 */}
      <div style={{
        position: "absolute",
        width: "min(90vw, 90vh)",
        height: "min(90vw, 90vh)",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at 40% 50%, #6B21A8 0%, #1e1b4b 45%, transparent 70%)",
        opacity: 0.9,
      }} />
      {/* 青绿高光 */}
      <div style={{
        position: "absolute",
        width: "min(70vw, 70vh)",
        height: "min(70vw, 70vh)",
        borderRadius: "50%",
        top: "4%",
        left: "25%",
        background: "radial-gradient(ellipse at 50% 20%, #0d9488 0%, transparent 60%)",
        opacity: 0.75,
      }} />
      {/* 红粉高光 */}
      <div style={{
        position: "absolute",
        width: "min(55vw, 55vh)",
        height: "min(55vw, 55vh)",
        borderRadius: "50%",
        top: "30%",
        left: "35%",
        background: "radial-gradient(ellipse at 50% 70%, #be123c 0%, #e11d48 30%, transparent 65%)",
        opacity: 0.65,
      }} />
      {/* 深蓝/紫核心 */}
      <div style={{
        position: "absolute",
        width: "min(60vw, 60vh)",
        height: "min(60vw, 60vh)",
        borderRadius: "50%",
        top: "10%",
        left: "30%",
        background: "radial-gradient(ellipse at 60% 40%, #4f46e5 0%, #7c3aed 40%, transparent 70%)",
        opacity: 0.8,
      }} />
      {/* 蓝紫边缘晕 */}
      <div style={{
        position: "absolute",
        width: "min(80vw, 80vh)",
        height: "min(80vw, 80vh)",
        borderRadius: "50%",
        bottom: "5%",
        right: "10%",
        background: "radial-gradient(ellipse at 70% 80%, #6d28d9 0%, transparent 55%)",
        opacity: 0.5,
      }} />
    </div>
  );
}

// ───── 单个 Dock 图标 ─────
interface DockIconProps {
  label: string;
  icon: React.ReactNode;
  gradient: string;
  onClick?: () => void;
  highlight?: boolean;
}

function DockIcon({ label, icon, gradient, onClick, highlight }: DockIconProps) {
  return (
    <button
      className="flex flex-col items-center gap-2 select-none active:scale-90 transition-transform duration-150"
      style={{ transform: highlight ? "scale(1.06)" : undefined }}
      onClick={onClick}
    >
      <div
        style={{
          width: 60, height: 60,
          borderRadius: 14,
          background: gradient,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: highlight ? "0 0 0 2.5px rgba(255,255,255,0.55)" : "none",
        }}
      >
        {icon}
      </div>
      <span style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, fontWeight: 500, letterSpacing: 0.1 }}>
        {label}
      </span>
    </button>
  );
}

// ───── 提示气泡 ─────
function Tooltip({ text, visible }: { text: string; visible: boolean }) {
  return (
    <div style={{
      position: "fixed", bottom: 160, left: "50%",
      transform: `translateX(-50%) translateY(${visible ? 0 : 8}px)`,
      opacity: visible ? 1 : 0,
      transition: "all 0.3s ease",
      background: "rgba(28,28,30,0.92)",
      backdropFilter: "blur(12px)",
      color: "#fff",
      fontSize: 13,
      fontWeight: 500,
      padding: "8px 18px",
      borderRadius: 20,
      pointerEvents: "none",
      whiteSpace: "nowrap",
    }}>
      {text}
    </div>
  );
}

// ───── 主组件 ─────
export function OnboardingScreen({ onEnter, mode = "first", onPdfSelected, onOpenScreenshot, onOpenCamera, onOpenVoice }: Props) {
  const now = useClock();
  // demo 模式：先从屏幕底部平移进入，再向下滑出
  // first 模式：直接显示，退出时 scale+fade
  const [entered, setEntered] = useState(mode === "first");
  const [leaving, setLeaving] = useState(false);
  const [tooltip, setTooltip] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // demo 模式：挂载后触发滑入
  useEffect(() => {
    if (mode === "demo") {
      const id = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(id);
    }
  }, [mode]);

  const showTip = useCallback((text: string) => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip(text);
    setShowTooltip(true);
    tooltipTimer.current = setTimeout(() => setShowTooltip(false), 2200);
  }, []);

  useEffect(() => () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); }, []);

  // afterClose: 引导页退出动画结束后再触发 modal，避免 z-index 遮挡
  const handleEnter = useCallback((afterClose?: () => void) => {
    setLeaving(true);
    const delay = mode === "demo" ? 480 : 550;
    setTimeout(() => {
      onEnter();
      afterClose?.();
    }, delay);
  }, [mode, onEnter]);

  const hH = now.getHours();
  const timeStr = `${pad(hH)}:${pad(now.getMinutes())}`;
  const dateStr = `${WEEKDAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;

  const icons: DockIconProps[] = [
    {
      label: "截图",
      gradient: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
      icon: <MonitorDown size={26} color="#fff" />,
      onClick: () => { showTip("三指下滑截图，自动存入记忆"); onOpenScreenshot?.(); },
    },
    {
      label: "拍照",
      gradient: "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)",
      icon: <Camera size={26} color="#1e293b" />,
      onClick: () => { showTip("拍下课本/板书，AI 一键解读"); onOpenCamera?.(); },
    },
    {
      label: "录音",
      gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      icon: <Mic size={26} color="#fff" />,
      onClick: () => { showTip("录下课堂内容，自动转文字"); onOpenVoice?.(); },
    },
  ];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "#000",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
        // demo 模式：translateY 滑入/出；first 模式：opacity + scale
        ...(mode === "demo"
          ? {
              transform: leaving
                ? "translateY(100%)"
                : entered ? "translateY(0)" : "translateY(100%)",
              transition: "transform 0.45s cubic-bezier(0.32,0.72,0,1)",
            }
          : {
              opacity: leaving ? 0 : 1,
              transform: leaving ? "scale(1.04)" : "scale(1)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
            }),
      }}
    >
      {/* 流体球背景 */}
      <FluidOrb />

      {/* 顶栏：时间 + 右上状态 */}
      <div style={{ position: "relative", zIndex: 1, padding: "40px 36px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          {/* 左：大时钟 */}
          <div>
            <div style={{ fontSize: "clamp(56px, 9vw, 96px)", fontWeight: 200, color: "#fff", lineHeight: 1, letterSpacing: -2 }}>
              {timeStr}
            </div>
            <div style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", marginTop: 6, fontWeight: 400 }}>
              {dateStr}
            </div>
          </div>

          <div />
        </div>
      </div>

      {/* 中间：Slogan */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", padding: "0 24px" }}>
          <p style={{ color: "rgba(255,255,255,0.82)", fontSize: "clamp(15px, 2.2vw, 20px)", fontWeight: 400, lineHeight: 1.7, letterSpacing: 0.3 }}>
            尝试各场景下触发 AI 记忆的交互方式
          </p>
        </div>
      </div>

      {/* 气泡提示 */}
      <Tooltip text={tooltip} visible={showTooltip} />

      {/* 底部 Dock */}
      <div style={{ position: "relative", zIndex: 1, padding: "0 0 48px", flexShrink: 0 }}>
        <div style={{
          margin: "0 auto",
          width: "fit-content",
          padding: "18px 28px",
          borderRadius: 28,
          background: "rgba(255,255,255,0.13)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.18)",
          display: "flex",
          gap: 24,
          alignItems: "flex-start",
        }}>
          {/* 圈注：label 直连 file input，避免 Android 拦截 programmatic click */}
          <label
            htmlFor="onboarding-pdf-input"
            className="flex flex-col items-center gap-2 select-none active:scale-90 transition-transform duration-150 cursor-pointer"
            onClick={() => showTip("圈画重点，AI 自动解析知识点")}
          >
            <div
              style={{
                width: 60, height: 60,
                borderRadius: 14,
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Pen size={26} color="#fff" />
            </div>
            <span style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, fontWeight: 500, letterSpacing: 0.1 }}>
              圈注
            </span>
            <input
              id="onboarding-pdf-input"
              type="file"
              accept="application/pdf,.pdf,image/*"
              style={HIDDEN_FILE_INPUT_STYLE}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPdfSelected?.(file);
                e.target.value = "";
              }}
            />
          </label>

          {icons.map((ic) => (
            <DockIcon key={ic.label} {...ic} />
          ))}

          {/* 分隔 */}
          <div style={{ width: 1, height: 60, background: "rgba(255,255,255,0.15)", alignSelf: "center", marginTop: -20 }} />

          {/* 进入记忆 */}
          <button
            onClick={() => handleEnter()}
            className="flex flex-col items-center gap-2"
          >
            <div style={{
              width: 60, height: 60,
              borderRadius: 14,
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <ChevronRight size={26} color="#fff" />
            </div>
            <span style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, fontWeight: 500 }}>进入记忆</span>
          </button>
        </div>

        {/* Home indicator */}
        <div style={{
          width: 120, height: 4,
          borderRadius: 2,
          background: "rgba(255,255,255,0.35)",
          margin: "18px auto 0",
        }} />
      </div>
    </div>
  );
}
