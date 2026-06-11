import { useState, useRef, useEffect, useCallback } from "react";
import { X, Loader2 } from "lucide-react";

// 在 html2canvas 失败时用原生 Canvas 绘制课件截图
function renderCourseCanvas(w: number, h: number): string {
  const c = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = w * dpr; c.height = h * dpr;
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // 白底
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);

  // 顶部 header 区
  ctx.fillStyle = "#F5F6FA"; ctx.fillRect(0, 0, w, 56);
  ctx.fillStyle = "#4D5CFF";
  ctx.font = "600 13px -apple-system,sans-serif";
  ctx.fillText("course.university.edu/physics/ch12", 16, 33);

  // 内容区
  const pad = 20;
  let y = 80;

  const label = (text: string, color = "#7B8291") => {
    ctx.fillStyle = color; ctx.font = "500 10px -apple-system,sans-serif";
    ctx.fillText(text, pad, y); y += 16;
  };
  const title = (text: string) => {
    ctx.fillStyle = "#020418"; ctx.font = "700 18px -apple-system,sans-serif";
    ctx.fillText(text, pad, y); y += 28;
  };
  const body = (text: string) => {
    ctx.fillStyle = "#333"; ctx.font = "400 13px -apple-system,sans-serif";
    // 简单换行
    const words = text.split(""); let line = ""; const maxW = w - pad * 2;
    for (const ch of words) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxW) {
        ctx.fillText(line, pad, y); y += 20; line = ch;
      } else { line = test; }
    }
    if (line) { ctx.fillText(line, pad, y); y += 20; }
    y += 4;
  };
  const box = (text: string, bg: string, color = "#333") => {
    ctx.fillStyle = bg;
    ctx.beginPath(); (ctx as CanvasRenderingContext2D & { roundRect?: Function }).roundRect?.(pad, y, w - pad * 2, 36, 8) ?? ctx.rect(pad, y, w - pad * 2, 36);
    ctx.fill();
    ctx.fillStyle = color; ctx.font = "500 13px 'Courier New',monospace";
    ctx.fillText(text, pad + 12, y + 23); y += 48;
  };
  const divider = () => {
    ctx.strokeStyle = "#EAEDF2"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
    y += 16;
  };

  label("大学物理 · 第十二章", "#7B8291");
  title("机械振动与机械波");
  label("授课教师：张伟  |  2026 春季学期");
  y += 6; divider();

  // §1
  ctx.fillStyle = "#4D5CFF"; ctx.font = "700 11px sans-serif";
  ctx.fillText("1", pad + 3, y + 14);
  ctx.fillStyle = "#020418"; ctx.font = "700 15px -apple-system,sans-serif";
  ctx.fillText("  简谐振动", pad + 16, y + 14); y += 26;
  body("质点在平衡位置附近往复运动，回复力 F = −kx，则为简谐振动（SHM）。");
  box("x(t) = A cos(ωt + φ₀)", "#F5F6FA");
  body("A 为振幅，ω 为角频率，φ₀ 为初相位。ω = 2πf = 2π/T。");
  y += 8;

  // §2
  ctx.fillStyle = "#020418"; ctx.font = "700 15px -apple-system,sans-serif";
  ctx.fillText("2  旋转矢量法", pad, y + 14); y += 26;
  box("⚠ 重点：N 个振动合成，合振幅 R = (a/2)/sin(δ/2)", "#FFFBEB", "#92400E");
  body("旋矢法将代数运算转化为几何问题，是分析多振动叠加的核心工具。");
  y += 8;

  // §3
  ctx.fillStyle = "#020418"; ctx.font = "700 15px -apple-system,sans-serif";
  ctx.fillText("3  机械波的产生与传播", pad, y + 14); y += 26;
  body("机械波在弹性介质中传播，传递能量，不传递物质。波速由介质决定：");
  box("v = λf = λ/T", "#F5F6FA");

  // §4
  ctx.fillStyle = "#020418"; ctx.font = "700 15px -apple-system,sans-serif";
  ctx.fillText("4  驻波与干涉", pad, y + 14); y += 26;
  body("两列相反方向的相干波叠加形成驻波，波腹振幅 2A，波节振幅为 0。");
  ctx.fillStyle = "#EEF0FF"; ctx.fillRect(pad, y, (w - pad * 2) / 2 - 4, 44);
  ctx.fillStyle = "#4D5CFF"; ctx.font = "600 11px sans-serif"; ctx.fillText("波腹：|x| = nλ/2", pad + 8, y + 26);
  ctx.fillStyle = "#F0FDF4"; ctx.fillRect((w + pad * 2) / 2, y, (w - pad * 2) / 2 - 4, 44);
  ctx.fillStyle = "#16A34A"; ctx.fillText("波节：|x| = (2n+1)λ/4", (w + pad * 2) / 2 + 8, y + 26);

  return c.toDataURL("image/jpeg", 0.9);
}

interface Props {
  onClose: () => void;
  onSave: (imageDataUrl: string) => void;
}

// html2canvas 失败时的降级截图（纯 canvas 绘制可视区域色块）
// ─── 模拟进度条 ───────────────────────────────────────────────────────────────
function FakeProgressBar() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPct(70), 120),
      setTimeout(() => setPct(85), 350),
      setTimeout(() => setPct(95), 700),
      setTimeout(() => setPct(100), 900),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);
  if (pct >= 100) return null;
  return (
    <div className="absolute top-0 left-0 right-0 h-[2px] z-10 overflow-hidden">
      <div
        className="h-full bg-[#4D5CFF]"
        style={{
          width: `${pct}%`,
          transition: `width ${pct === 70 ? 120 : 300}ms ease-out`,
        }}
      />
    </div>
  );
}

// ─── 三指手势引导弹窗（fixed 居中，玻璃态） ───────────────────────────────────
function GestureGuide({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div
        className="pointer-events-auto mx-6 max-w-[300px] w-full rounded-3xl px-6 py-6 flex flex-col items-center gap-4"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          animation: "guideIn 0.38s cubic-bezier(0.34,1.5,0.64,1) both",
        }}
      >
        <FingerAnimation />
        <p className="text-[17px] text-[#020418] text-center leading-6" style={{ fontWeight: 700 }}>
          三指下滑截图
        </p>
        <p className="text-[13px] text-[#5A6070] text-center leading-[1.6]">
          三根手指同时向下滑动<br />即可截取当前屏幕内容
        </p>
        <button
          onClick={onDismiss}
          className="w-full py-3 rounded-2xl text-[14px] text-[#4D5CFF] transition-colors"
          style={{ fontWeight: 600, background: "rgba(77,92,255,0.10)" }}
        >
          我知道了
        </button>
      </div>
    </div>
  );
}

function FingerAnimation() {
  return (
    <div className="relative h-14 w-20 flex items-end justify-center overflow-visible">
      {[-16, 0, 16].map((x, i) => (
        <div
          key={i}
          className="absolute bottom-0 rounded-full bg-[#4D5CFF]"
          style={{
            width: 14,
            height: 32,
            left: `calc(50% + ${x}px - 7px)`,
            animation: "fingerSwipe 1.5s ease-in-out infinite",
            animationDelay: `${i * 90}ms`,
            opacity: 0.75,
          }}
        />
      ))}
    </div>
  );
}

// ─── html2canvas 失败时的简单占位截图 ────────────────────────────────────────
function makeFallbackSnapshot(el: HTMLElement): string {
  const W = el.offsetWidth || 375;
  const H = el.offsetHeight || 600;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2;
  canvas.height = H * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.scale(2, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  // 简单画几条色块模拟内容
  const stripes = ["#F5F6FA", "#EEF0FF", "#F0FDF4", "#FFFBEB"];
  let y = 60;
  stripes.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.roundRect(20, y, W - 40, 60 + i * 8, 12);
    ctx.fill();
    y += 80 + i * 8;
  });
  ctx.fillStyle = "#4D5CFF";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("大学物理 · 机械振动与机械波", W / 2, 36);
  return canvas.toDataURL("image/jpeg", 0.88);
}

// ─── 模拟课件内容 ─────────────────────────────────────────────────────────────
function MockPage() {
  return (
    <article className="px-5 py-6 max-w-2xl mx-auto text-[#1a1a2e] font-sans">
      <div className="mb-6 pb-4 border-b border-gray-200">
        <p className="text-[11px] text-[#7B8291] tracking-widest uppercase mb-1">大学物理 · 第十二章</p>
        <h1 className="text-[22px] font-bold leading-tight">机械振动与机械波</h1>
        <p className="text-[13px] text-[#7B8291] mt-1">授课教师：张伟 &nbsp;|&nbsp; 2026 春季学期</p>
      </div>

      <section className="mb-7">
        <h2 className="text-[16px] font-bold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-[#4D5CFF] text-white text-[11px] flex items-center justify-center font-bold">1</span>
          简谐振动
        </h2>
        <p className="text-[14px] leading-7 text-[#333] mb-3">
          质点在平衡位置附近做往复运动，若回复力满足
          <strong> F = −kx</strong>，则该运动为<strong>简谐振动</strong>（Simple Harmonic Motion）。
          其位移随时间的变化规律为：
        </p>
        <div className="bg-[#F5F6FA] rounded-xl px-5 py-4 my-3 text-center text-[15px] font-mono tracking-wide">
          x(t) = A cos(ωt + φ₀)
        </div>
        <p className="text-[13px] leading-7 text-[#555]">
          其中 <em>A</em> 为振幅，<em>ω</em> 为角频率，<em>φ₀</em> 为初相位。
          角频率与固有频率的关系为 <strong>ω = 2πf = 2π/T</strong>。
        </p>
      </section>

      <section className="mb-7">
        <h2 className="text-[16px] font-bold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-[#4D5CFF] text-white text-[11px] flex items-center justify-center font-bold">2</span>
          旋转矢量法
        </h2>
        <p className="text-[14px] leading-7 text-[#333] mb-3">
          用一个以角速度 <em>ω</em> 匀速旋转的矢量（旋矢）来表示简谐振动：矢量长度等于振幅 <em>A</em>，
          矢量端点在横轴的投影即为位移 x(t)。
        </p>
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-3 my-3 text-[13px] text-[#92400E]">
          ⚠ <strong>重点</strong>：N 个同频等幅、相邻相位差为 δ 的振动合成，合振幅为
          <span className="font-mono"> R = (a/2) / sin(δ/2)</span>，总相位差
          <span className="font-mono"> θ = Nδ</span>。
        </div>
        <p className="text-[13px] leading-7 text-[#555]">
          旋矢法将代数运算转化为几何问题，是分析多振动叠加的核心工具。
        </p>
      </section>

      <section className="mb-7">
        <h2 className="text-[16px] font-bold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-[#4D5CFF] text-white text-[11px] flex items-center justify-center font-bold">3</span>
          机械波的产生与传播
        </h2>
        <p className="text-[14px] leading-7 text-[#333] mb-3">
          机械波是机械振动在弹性介质中的传播过程。传播过程中传递<strong>能量</strong>，不传递物质。
          波速由介质决定：
        </p>
        <div className="bg-[#F5F6FA] rounded-xl px-5 py-4 my-3 text-center text-[15px] font-mono tracking-wide">
          v = λf = λ/T
        </div>
        <p className="text-[13px] leading-7 text-[#555]">
          波长 λ、频率 f（由振源决定）、波速 v（由介质决定）三者满足上述关系。
          同一列波从一种介质进入另一种介质时，<strong>频率不变，波长改变</strong>。
        </p>
      </section>

      <section className="mb-7">
        <h2 className="text-[16px] font-bold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-[#4D5CFF] text-white text-[11px] flex items-center justify-center font-bold">4</span>
          驻波与干涉
        </h2>
        <p className="text-[14px] leading-7 text-[#333] mb-3">
          两列振幅相同、传播方向相反的相干波叠加形成<strong>驻波</strong>。
          驻波的波节处振幅为零，波腹处振幅最大（为 2A）。
        </p>
        <div className="grid grid-cols-2 gap-3 my-3">
          <div className="bg-[#EEF0FF] rounded-xl px-4 py-3 text-[13px]">
            <p className="font-bold text-[#4D5CFF] mb-1">波腹条件</p>
            <p className="font-mono">|x| = nλ/2 &nbsp;(n=0,1,2…)</p>
          </div>
          <div className="bg-[#F0FDF4] rounded-xl px-4 py-3 text-[13px]">
            <p className="font-bold text-[#16A34A] mb-1">波节条件</p>
            <p className="font-mono">|x| = (2n+1)λ/4</p>
          </div>
        </div>
        <p className="text-[13px] leading-7 text-[#555]">
          弦乐器、管乐器的发声原理均基于驻波，固定端为波节，自由端为波腹。
        </p>
      </section>

      <div className="h-28" />
    </article>
  );
}

// ─── 主 Modal ─────────────────────────────────────────────────────────────────
export function ScreenshotModeModal({ onClose, onSave }: Props) {
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const isCapturing = capturing || flash;
  const contentRef = useRef<HTMLDivElement>(null);
  const isRunning = useRef(false);
  // 用 ref 持有 triggerCapture，避免 useEffect touch 里拿到旧闭包
  const triggerRef = useRef<() => void>(() => undefined);

  const triggerCapture = useCallback(async () => {
    const el = contentRef.current;
    if (!el || isRunning.current) return;
    isRunning.current = true;
    setShowGuide(false);

    // 白光闪烁效果
    setFlash(true);
    await new Promise(r => setTimeout(r, 80));
    setFlash(false);
    await new Promise(r => requestAnimationFrame(r));

    setCapturing(true);
    await new Promise(r => setTimeout(r, 300)); // 给用户一点处理感
    const url = renderCourseCanvas(el.clientWidth, el.clientHeight);
    setCapturing(false);
    isRunning.current = false;

    onSave(url);
  }, [onSave]);

  // 始终用最新的 triggerCapture 更新 ref
  useEffect(() => { triggerRef.current = triggerCapture; }, [triggerCapture]);

  // Mac 键盘快捷键 ⌘S / Ctrl+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        triggerRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 三指触摸手势（绑定在 window，不受滚动容器影响）
  useEffect(() => {
    let startY = 0;
    let startTime = 0;
    let fingerCount = 0;

    const onStart = (e: TouchEvent) => {
      fingerCount = e.touches.length;
      if (fingerCount < 3) return;
      startY = e.touches[0].clientY;
      startTime = Date.now();
    };

    const onEnd = (e: TouchEvent) => {
      if (fingerCount < 3 || e.changedTouches.length === 0) {
        fingerCount = 0; return;
      }
      const dy = e.changedTouches[0].clientY - startY;
      const dt = Date.now() - startTime;
      if (startTime > 0 && dy > 50 && dt < 700) {
        triggerRef.current();
      }
      startY = 0; startTime = 0; fingerCount = 0;
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, []); // 只挂一次，通过 triggerRef 拿最新函数

  return (
    <>
      <style>{`
        @keyframes fingerSwipe {
          0%   { transform: translateY(-6px); opacity: 0.35; }
          45%  { transform: translateY(10px); opacity: 0.9;  }
          75%  { transform: translateY(18px); opacity: 0.6;  }
          100% { transform: translateY(-6px); opacity: 0.35; }
        }
        @keyframes guideIn {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        [data-flash="1"] { animation: ssFlash 0.2s ease-out forwards; }
        @keyframes ssFlash {
          0%   { filter: brightness(1); }
          30%  { filter: brightness(3); }
          100% { filter: brightness(1); }
        }
      `}</style>

      <div className="fixed inset-0 z-[600] flex flex-col bg-white">

        {/* ── 浏览器顶栏 ── */}
        <div className="relative flex items-center gap-2 px-3 py-2.5 bg-[#F5F6FA] border-b border-[#EAEDF2] flex-shrink-0">
          <FakeProgressBar />
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#7B8291] hover:bg-[#EAEDF2] transition-colors"
          >
            <X size={16} />
          </button>
          <div className="flex-1 flex items-center bg-white rounded-xl px-3 py-1.5 border border-[#EAEDF2]">
            <span className="text-[12px] text-[#7B8291] truncate select-none">
              course.university.edu/physics/ch12
            </span>
          </div>
          <button
            onClick={triggerCapture}
            disabled={isCapturing}
            className="flex items-center gap-1.5 text-[11px] text-[#4D5CFF] px-2.5 py-1.5 rounded-lg bg-[#EEF0FF] hover:bg-[#DDE1FF] transition-colors disabled:opacity-40 select-none"
            style={{ fontWeight: 600 }}
          >
            {capturing && <Loader2 size={11} className="animate-spin" />}
            截图
            <kbd className="hidden sm:inline-flex text-[9px] px-1 py-0.5 rounded bg-white/70 border border-[#D0D5FF] text-[#9CA3AF] leading-none" style={{ fontFamily: "inherit" }}>
              ⌘S
            </kbd>
          </button>
        </div>

        {/* ── 内容区（html2canvas 只会看这里，里面不放任何覆盖层） ── */}
        <div ref={contentRef} className="flex-1 overflow-y-auto bg-white">
          <MockPage />
        </div>

        {/* 白光闪烁 —— fixed，不在 contentRef 内 */}
        {flash && (
          <div className="fixed inset-0 z-[605] bg-white pointer-events-none"
            style={{ animation: "ssFlash 0.22s ease-out forwards" }} />
        )}

        {/* 截图处理中 —— fixed，不在 contentRef 内 */}
        {capturing && (
          <div className="fixed inset-0 z-[605] flex items-center justify-center pointer-events-none"
            style={{ background: "rgba(255,255,255,0.55)" }}>
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={22} className="animate-spin text-[#4D5CFF]" />
              <span className="text-[12px] text-[#7B8291]">正在截图…</span>
            </div>
          </div>
        )}

        {/* ── 底部静态提示 ── */}
        {!showGuide && !isCapturing && (
          <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#F5F6FA] border-t border-[#EAEDF2] flex-shrink-0">
            <div className="flex gap-0.5 items-center">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#4D5CFF] animate-pulse"
                  style={{ animationDelay: `${i * 130}ms` }} />
              ))}
            </div>
            <span className="text-[12px] text-[#7B8291]">三指下滑 或 点右上角「截图」</span>
          </div>
        )}

        {/* ── 引导弹窗（fixed 居中，玻璃态） ── */}
        {showGuide && !isCapturing && (
          <GestureGuide onDismiss={() => setShowGuide(false)} />
        )}

      </div>
    </>
  );
}

