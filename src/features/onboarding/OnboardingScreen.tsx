import { useState, useEffect, useRef, useCallback } from "react";
import { Pen, MonitorDown, Camera, Mic, ChevronRight, FileSignature, Sparkles } from "lucide-react";

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
  onOpenFormFill?: () => void;
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
      <div style={{
        position: "absolute",
        width: "min(90vw, 90vh)",
        height: "min(90vw, 90vh)",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at 40% 50%, #6B21A8 0%, #1e1b4b 45%, transparent 70%)",
        opacity: 0.9,
      }} />
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

function PenIntroCard({
  onContinue,
  onSkip,
  onPdfSelected,
}: {
  onContinue: () => void;
  onSkip: () => void;
  onPdfSelected?: (file: File) => void;
}) {
  return (
    <div
      className="relative z-10 mx-6 max-w-md w-full rounded-3xl p-6"
      style={{
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={18} color="#8B9AFF" />
        <span className="text-white text-[15px]" style={{ fontWeight: 700 }}>AI 情境感知 · 笔</span>
      </div>
      <p className="text-[14px] text-white/80 leading-7 mb-5">
        揭笔即识别当前场景。上传 PDF 圈选一处重点，AI 将自动生成记忆卡——无需先找按钮。
      </p>

      <div
        className="rounded-2xl bg-black/25 border border-white/10 p-4 mb-5 flex items-center justify-center"
        style={{ minHeight: 88 }}
      >
        <svg width="140" height="48" viewBox="0 0 140 48" aria-hidden>
          <path
            d="M12 32 Q 40 8, 68 28 T 128 22"
            fill="none"
            stroke="#4D5CFF"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <label
        htmlFor="intro-pdf-input"
        className="block w-full text-center py-3 rounded-2xl bg-[#4D5CFF] text-white text-[14px] cursor-pointer mb-2"
        style={{ fontWeight: 600 }}
      >
        上传 PDF 用笔
        <input
          id="intro-pdf-input"
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

      <button
        type="button"
        onClick={onContinue}
        className="block w-full text-center py-3 rounded-2xl bg-white/15 text-white text-[14px] mb-2"
        style={{ fontWeight: 600 }}
      >
        浏览更多场景
      </button>

      <button
        type="button"
        onClick={onSkip}
        className="block w-full text-center py-2 text-white/50 text-[13px]"
      >
        跳过，直接进入
      </button>
    </div>
  );
}

export function OnboardingScreen({
  onEnter,
  mode = "first",
  onPdfSelected,
  onOpenScreenshot,
  onOpenCamera,
  onOpenVoice,
  onOpenFormFill,
}: Props) {
  const now = useClock();
  const [entered, setEntered] = useState(mode === "first");
  const [leaving, setLeaving] = useState(false);
  const [introStep, setIntroStep] = useState<"intro" | "dock">(mode === "first" ? "intro" : "dock");
  const [tooltip, setTooltip] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      onClick: () => { showTip("对准资料，AI 自动识别并整理"); onOpenCamera?.(); },
    },
    {
      label: "录音",
      gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      icon: <Mic size={26} color="#fff" />,
      onClick: () => { showTip("录下课堂内容，自动转文字"); onOpenVoice?.(); },
    },
    {
      label: "填表",
      gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
      icon: <FileSignature size={26} color="#fff" />,
      onClick: () => { showTip("识别学术表格，记忆库可填充诚信申明与签名"); onOpenFormFill?.(); },
    },
  ];

  const showDock = introStep === "dock";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "#000",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
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
      <FluidOrb />

      <div style={{ position: "relative", zIndex: 1, padding: "40px 36px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
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

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
        {introStep === "intro" ? (
          <PenIntroCard
            onContinue={() => setIntroStep("dock")}
            onSkip={() => handleEnter()}
            onPdfSelected={onPdfSelected}
          />
        ) : (
          <div style={{ textAlign: "center", padding: "0 24px" }}>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 400, lineHeight: 1.6, letterSpacing: 0.2 }}>
              尝试各场景下触发 Memo 的交互方式
            </p>
          </div>
        )}
      </div>

      <Tooltip text={tooltip} visible={showTooltip} />

      {showDock && (
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
            <label
              htmlFor="onboarding-pdf-input"
              className="flex flex-col items-center gap-2 select-none active:scale-90 transition-transform duration-150 cursor-pointer"
              onClick={() => showTip("圈画重点，AI 自动解析并生成记忆卡")}
            >
              <div
                style={{
                  width: 60, height: 60,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 0 2.5px rgba(255,255,255,0.55)",
                }}
              >
                <Pen size={26} color="#fff" />
              </div>
              <span style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, fontWeight: 500, letterSpacing: 0.1 }}>
                笔
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

            <div style={{ width: 1, height: 60, background: "rgba(255,255,255,0.15)", alignSelf: "center", marginTop: -20 }} />

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

          <div style={{
            width: 120, height: 4,
            borderRadius: 2,
            background: "rgba(255,255,255,0.35)",
            margin: "18px auto 0",
          }} />
        </div>
      )}
    </div>
  );
}
