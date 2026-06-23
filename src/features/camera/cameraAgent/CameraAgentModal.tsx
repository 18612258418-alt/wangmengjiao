import { useCallback, useEffect, useRef, useState } from "react";
import { X, Camera, SwitchCamera, Loader2, Scan } from "lucide-react";
import type { Quad } from "../perspectiveCorrect";
import { warpCanvasWithQuad } from "../perspectiveCorrect";
import {
  analyzeVideoFrame,
  defaultGuideQuad,
  resetFrameAnalyzer,
  type DetectResult,
} from "../boardDetect/detectQuads";
import { correctPerspectiveDataUrl } from "../perspectiveCorrect";
import { CameraOnboarding, shouldShowCameraOnboarding } from "./CameraOnboarding";
import { isCameraAutoCaptureEnabled } from "./config";
import {
  DEMO_CAMERA_IMAGE,
  DEMO_CAMERA_TIMING,
  isCameraDemoMode,
} from "./demoCamera";
import {
  fakeDetectQuadAtProgress,
  runFakeCapturePipeline,
  type DemoProcessStep,
} from "./demoCameraPipeline";
import { DemoProcessingOverlay } from "./DemoProcessingOverlay";
import { DetectLock, smoothQuad } from "./detectLock";
import { DetectionOverlay } from "./DetectionOverlay";
import type { AgentPhase, AgentSaveMeta } from "./config";

interface Props {
  onClose: () => void;
  onSave: (imageDataUrl: string, meta?: AgentSaveMeta) => void;
}

const ANALYZE_MS = 450;
const MAX_CAPTURE_EDGE = 960;
const AUTO_CAPTURE_DELAY_MS = 600;
const STABLE_NEED = 4;
const PANEL_HOLD_TICKS = 12;
const CAMERA_STILL = 16;
const GUIDE_STABLE_NEED = 3;

const COPY = {
  idle: "将资料放入取景框：文档、板书、证件均可",
  searching: "正在识别资料边缘…",
  detected: "已识别资料区域，请保持稳定",
  guideLocked: "已对准资料，请保持稳定",
  stable: "保持稳定，即将自动整理并存入记忆…",
  processing: "正在整理资料…",
  saving: "正在存入记忆…",
  saved: "已存入记忆，可继续拍摄",
};

function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error("toBlob failed"));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

function rectsEqual(
  a: { left: number; top: number; width: number; height: number },
  b: { left: number; top: number; width: number; height: number },
) {
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

function isMediaSupported(): boolean {
  return (
    typeof navigator !== "undefined"
    && !!navigator.mediaDevices?.getUserMedia
    && (location.protocol === "https:"
      || location.hostname === "localhost"
      || location.hostname === "127.0.0.1")
  );
}

function getVideoDisplayRect(
  containerW: number,
  containerH: number,
  videoW: number,
  videoH: number,
) {
  if (!containerW || !containerH) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  if (!videoW || !videoH) {
    return { left: 0, top: 0, width: containerW, height: containerH };
  }
  const videoAspect = videoW / videoH;
  const containerAspect = containerW / containerH;
  if (videoAspect > containerAspect) {
    const width = containerW;
    const height = containerW / videoAspect;
    return { left: 0, top: (containerH - height) / 2, width, height };
  }
  const height = containerH;
  const width = containerH * videoAspect;
  return { left: (containerW - width) / 2, top: 0, width, height };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function InputCaptureFallback({
  onCapture,
  onClose,
}: {
  onCapture: (url: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async e => {
          const file = e.target.files?.[0];
          if (!file) { onClose(); return; }
          onCapture(await fileToDataUrl(file));
          e.target.value = "";
        }}
      />
      <div className="fixed inset-0 z-[600] bg-black flex flex-col items-center justify-center gap-6">
        <Camera size={52} className="text-white/50" />
        <p className="text-white/70 text-[16px] font-medium">点击打开相机</p>
        <button
          onClick={() => ref.current?.click()}
          className="px-8 py-3 rounded-full bg-white text-black text-[15px] font-semibold active:scale-95 transition-transform"
        >
          打开相机
        </button>
        <button onClick={onClose} className="text-white/40 text-[13px] mt-2 underline">取消</button>
      </div>
    </>
  );
}

export function CameraAgentModal({ onClose, onSave }: Props) {
  const [phase, setPhase] = useState<AgentPhase>("preview");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [camError, setCamError] = useState(false);
  const [cameraCount, setCameraCount] = useState(1);
  const [quad, setQuad] = useState<Quad | null>(null);
  const [detected, setDetected] = useState(false);
  const [stable, setStable] = useState(false);
  const [statusText, setStatusText] = useState(COPY.idle);
  const [showGuide, setShowGuide] = useState(shouldShowCameraOnboarding());
  const [videoRect, setVideoRect] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [videoSize, setVideoSize] = useState({ w: 0, h: 0 });
  const [demoProcessStep, setDemoProcessStep] = useState<DemoProcessStep | null>(null);
  const [demoPreviewUrl, setDemoPreviewUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const panelHoldRef = useRef<{ panel: DetectResult; left: number } | null>(null);
  const firstDetectAtRef = useRef(0);
  const stableCountRef = useRef(0);
  const guideStableRef = useRef(0);
  const detectLockRef = useRef(new DetectLock(4, 10));
  const capturingRef = useRef(false);
  const autoTriggeredRef = useRef(false);
  const demoStartedRef = useRef(false);
  const demoFlyStartedRef = useRef(false);

  const phaseRef = useRef<AgentPhase>("preview");

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const updateLayout = useCallback(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!container) return;
    const vw = video?.videoWidth ?? 0;
    const vh = video?.videoHeight ?? 0;
    if (vw && vh) {
      setVideoSize(prev => (prev.w === vw && prev.h === vh ? prev : { w: vw, h: vh }));
    }
    setVideoRect(prev => {
      const next = getVideoDisplayRect(
        container.clientWidth,
        container.clientHeight,
        vw,
        vh,
      );
      return rectsEqual(prev, next) ? prev : next;
    });
  }, []);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(devices => {
      setCameraCount(devices.filter(d => d.kind === "videoinput").length);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isMediaSupported()) return;
    let active = true;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280, max: 1280 },
            height: { ideal: 720, max: 720 },
          },
          audio: false,
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.onloadedmetadata = () => updateLayout();
          video.onplaying = () => updateLayout();
          try { await video.play(); } catch { /* autoplay */ }
          updateLayout();
        }
      } catch (err) {
        console.error("[CameraAgent]", err);
        if (active) setCamError(true);
      }
    }
    void start();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [facingMode, updateLayout]);

  // 确保容器尺寸与 video 元数据就绪后更新 overlay 坐标
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => updateLayout());
    ro.observe(container);
    updateLayout();
    return () => ro.disconnect();
  }, [updateLayout]);

  const finishCapture = useCallback(async (
    dataUrl: string,
    autoCapture: boolean,
    demo = false,
  ) => {
    setPhase("saving");
    setStatusText(COPY.saving);
    onSave(dataUrl, { autoCapture, demo });
    await new Promise<void>(r => window.setTimeout(r, demo ? 700 : 500));

    capturingRef.current = false;
    autoTriggeredRef.current = false;
    demoFlyStartedRef.current = false;
    setDemoProcessStep(null);
    setDemoPreviewUrl(null);
    setDetected(false);
    setStable(false);
    setQuad(null);
    setPhase("preview");
    setStatusText(COPY.saved);

    if (demo) {
      // 首轮演示结束后保持取景，不再自动扫描/自动拍摄
      demoStartedRef.current = true;
      return;
    }

    detectLockRef.current.reset();
    panelHoldRef.current = null;
    firstDetectAtRef.current = 0;
    stableCountRef.current = 0;
    guideStableRef.current = 0;
    window.setTimeout(() => setStatusText(COPY.idle), 1200);
  }, [onSave]);

  const demoCaptureAndProcess = useCallback(async (auto: boolean) => {
    if (capturingRef.current) return;
    capturingRef.current = true;
    autoTriggeredRef.current = true;
    setPhase("processing");

    const video = videoRef.current;
    demoFlyStartedRef.current = false;
    try {
      const imageUrl = await runFakeCapturePipeline({
        video,
        onStep: (step, previewUrl, status) => {
          setDemoProcessStep(step);
          setDemoPreviewUrl(previewUrl);
          setStatusText(status);
          if (step === "warp" && previewUrl && !demoFlyStartedRef.current) {
            demoFlyStartedRef.current = true;
            onSave(previewUrl, { autoCapture: auto, demo: true, flyOnly: true });
          }
        },
      });
      await finishCapture(imageUrl, auto, true);
    } catch (err) {
      console.error("[CameraAgent] demo capture failed", err);
      setPhase("preview");
      setStatusText(COPY.idle);
      setDemoProcessStep(null);
      setDemoPreviewUrl(null);
    } finally {
      capturingRef.current = false;
    }
  }, [finishCapture]);

  const captureAndProcess = useCallback(async (opts: { quad: Quad | null; auto: boolean }) => {
    if (capturingRef.current) return;
    if (isCameraDemoMode) {
      await demoCaptureAndProcess(opts.auto);
      return;
    }
    capturingRef.current = true;
    setPhase("processing");
    setStatusText(COPY.processing);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      capturingRef.current = false;
      onClose();
      return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) {
      capturingRef.current = false;
      onClose();
      return;
    }

    try {
      const capScale = Math.min(MAX_CAPTURE_EDGE / vw, MAX_CAPTURE_EDGE / vh, 1);
      const w = Math.round(vw * capScale);
      const h = Math.round(vh * capScale);
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);

      let quad = opts.quad;
      if (quad && capScale < 1) {
        quad = {
          tl: [quad.tl[0] * capScale, quad.tl[1] * capScale],
          tr: [quad.tr[0] * capScale, quad.tr[1] * capScale],
          br: [quad.br[0] * capScale, quad.br[1] * capScale],
          bl: [quad.bl[0] * capScale, quad.bl[1] * capScale],
        };
      }

      let out: HTMLCanvasElement | null = null;
      if (quad) {
        out = warpCanvasWithQuad(canvas, quad);
      }
      const dataUrl = await canvasToJpeg(out ?? canvas);
      await finishCapture(dataUrl, opts.auto);
    } catch (err) {
      console.error("[CameraAgent] capture failed", err);
      setPhase("preview");
      setStatusText(COPY.idle);
    } finally {
      capturingRef.current = false;
    }
  }, [demoCaptureAndProcess, finishCapture, onClose]);

  // 演示版：假边缘检测动画 → 白框 → 蓝框 → 自动拍摄（rAF 平滑更新，减少闪烁）
  useEffect(() => {
    if (!isCameraDemoMode || showGuide) {
      demoStartedRef.current = false;
      return;
    }
    if (demoStartedRef.current) return;
    demoStartedRef.current = true;

    setStatusText(COPY.searching);
    setPhase("preview");
    setDetected(false);
    setStable(false);

    let cancelled = false;
    let raf = 0;
    let prevQuad: Quad | null = null;
    let detectedLocked = false;
    let stableLocked = false;
    const start = performance.now();
    let lastQuadUpdate = 0;

    const loop = (now: number) => {
      if (capturingRef.current || cancelled) return;
      const elapsed = now - start;
      const scanT = Math.min(1, elapsed / DEMO_CAMERA_TIMING.scanMs);

      const video = videoRef.current;
      const vw = video?.videoWidth || 1280;
      const vh = video?.videoHeight || 720;
      let q = fakeDetectQuadAtProgress(vw, vh, scanT);
      if (prevQuad) q = smoothQuad(prevQuad, q, 0.32);
      prevQuad = q;
      if (now - lastQuadUpdate >= 32) {
        lastQuadUpdate = now;
        setQuad(q);
      }

      if (scanT > 0.45 && !detectedLocked) {
        detectedLocked = true;
        setDetected(true);
        setPhase("detecting");
        setStatusText(COPY.detected);
      }

      if (elapsed >= DEMO_CAMERA_TIMING.stableMs && !stableLocked) {
        stableLocked = true;
        setStable(true);
        setPhase("stable");
        setStatusText(COPY.stable);
      }

      if (elapsed < DEMO_CAMERA_TIMING.autoCaptureMs) {
        raf = requestAnimationFrame(loop);
      } else if (isCameraAutoCaptureEnabled && !autoTriggeredRef.current) {
        void demoCaptureAndProcess(true);
      }
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      demoStartedRef.current = false;
      cancelAnimationFrame(raf);
    };
  }, [showGuide, demoCaptureAndProcess]);

  // 真实检测（演示版关闭）
  useEffect(() => {
    if (isCameraDemoMode) return;
    const tick = () => {
      if (capturingRef.current) return;
      if (phaseRef.current === "processing" || phaseRef.current === "saving") return;

      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) {
        setStatusText(COPY.idle);
        return;
      }

      const analysis = analyzeVideoFrame(video, { minAreaRatio: 0.04 });
      if (!analysis) {
        setStatusText(COPY.idle);
        return;
      }

      const { metrics, camMotion } = analysis;

      let panel = analysis.panel;
      if (panel) {
        panelHoldRef.current = { panel, left: PANEL_HOLD_TICKS };
      } else if (panelHoldRef.current) {
        panelHoldRef.current.left -= 1;
        if (panelHoldRef.current.left <= 0) {
          panelHoldRef.current = null;
        } else {
          panel = panelHoldRef.current.panel;
        }
      }

      if (camMotion < CAMERA_STILL && metrics.sharpness > 4 && metrics.edgeDensity > 0.012) {
        guideStableRef.current += 1;
      } else {
        guideStableRef.current = Math.max(0, guideStableRef.current - 1);
      }

      const realDetect = !!panel?.method;
      if (realDetect && !firstDetectAtRef.current) {
        firstDetectAtRef.current = Date.now();
      }
      if (!realDetect && !panelHoldRef.current) {
        firstDetectAtRef.current = 0;
        autoTriggeredRef.current = false;
      }
      let candidateQuad: Quad | null = panel?.quad ?? null;
      if (!candidateQuad && guideStableRef.current >= GUIDE_STABLE_NEED) {
        candidateQuad = defaultGuideQuad(analysis.videoW, analysis.videoH);
      }

      const locked = detectLockRef.current.update(candidateQuad);
      setQuad(locked.quad);
      setDetected(locked.active && realDetect);

      if (locked.active && locked.quad) {
        if (!realDetect) {
          stableCountRef.current = 0;
          setStable(false);
          setPhase("detecting");
          setStatusText(COPY.guideLocked);
          return;
        }

        // 用手机静止判定稳定（检测框每帧都会抖，不适合用来算 stable）
        if (camMotion < CAMERA_STILL) {
          stableCountRef.current += 1;
        } else {
          stableCountRef.current = Math.max(0, stableCountRef.current - 1);
        }

        const isStable = stableCountRef.current >= STABLE_NEED;
        setStable(isStable);
        setPhase(isStable ? "stable" : "detecting");

        const canAutoCapture = isCameraAutoCaptureEnabled
          && isStable
          && !showGuide
          && !autoTriggeredRef.current
          && Date.now() - firstDetectAtRef.current >= AUTO_CAPTURE_DELAY_MS;

        if (canAutoCapture) {
          autoTriggeredRef.current = true;
          void captureAndProcess({ quad: locked.quad, auto: true });
          return;
        }

        setStatusText(isStable ? COPY.stable : COPY.detected);
        return;
      }
      stableCountRef.current = 0;
      setStable(false);
      setPhase("preview");
      const usingGuide = guideStableRef.current >= GUIDE_STABLE_NEED;
      setStatusText(showGuide ? COPY.idle : (usingGuide ? COPY.guideLocked : COPY.searching));
    };

    const id = window.setInterval(tick, ANALYZE_MS);
    tick();
    return () => {
      window.clearInterval(id);
      resetFrameAnalyzer();
      panelHoldRef.current = null;
      firstDetectAtRef.current = 0;
      autoTriggeredRef.current = false;
    };
  }, [showGuide, captureAndProcess, updateLayout]);

  const handleManualShutter = () => {
    void captureAndProcess({ quad: detected ? quad : null, auto: false });
  };

  if ((!isMediaSupported() || camError) && phase === "preview") {
    return (
      <InputCaptureFallback
        onClose={onClose}
        onCapture={async url => {
          if (isCameraDemoMode) {
            await demoCaptureAndProcess(false);
            return;
          }
          setPhase("processing");
          const corrected = await correctPerspectiveDataUrl(url);
          await finishCapture(corrected, false);
        }}
      />
    );
  }

  const busy = phase === "processing" || phase === "saving";

  return (
    <div className="fixed inset-0 z-[600] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button
          onClick={onClose}
          disabled={busy}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-40"
        >
          <X size={18} />
        </button>
        <div className="text-center px-2">
          <p className="text-white text-[15px]" style={{ fontWeight: 600 }}>情境感知相机</p>
          <p className="text-white/55 text-[11px] mt-0.5 leading-snug">{statusText}</p>
        </div>
        {cameraCount >= 2 ? (
          <button
            onClick={() => setFacingMode(m => (m === "environment" ? "user" : "environment"))}
            disabled={busy}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-40"
          >
            <SwitchCamera size={18} />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={updateLayout}
          onPlaying={updateLayout}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            background: "#000",
          }}
        />
        {!showGuide && (
          <DetectionOverlay
            quad={quad}
            detected={detected}
            stable={stable}
            videoRect={videoRect}
            videoSize={videoSize}
          />
        )}
        {showGuide && <CameraOnboarding onDismiss={() => setShowGuide(false)} />}
        {busy && isCameraDemoMode && demoProcessStep && (
          <DemoProcessingOverlay step={demoProcessStep} />
        )}
        {busy && !isCameraDemoMode && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 z-20">
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={28} className="animate-spin text-white" />
              <span className="text-white/80 text-[13px]">
                {phase === "saving" ? COPY.saving : statusText || COPY.processing}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center px-8 py-6 flex-shrink-0 gap-8">
        <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white/80">
          <Scan size={20} />
        </div>
        <button
          onClick={handleManualShutter}
          disabled={busy}
          className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-50"
          aria-label="手动拍摄"
        >
          {busy
            ? <Loader2 size={28} className="animate-spin text-[#4D5CFF]" />
            : <Camera size={32} className="text-[#020418]" />}
        </button>
        <div className="w-12" />
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
