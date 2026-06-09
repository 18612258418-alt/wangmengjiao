import { useState, useRef, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { detectClosedShape, type Point } from "./circleDetect";
import { AiAnalysisPanel, type AiEntry } from "./AiAnalysisPanel";
import { compressImageForApi } from "../../utils/api";

interface Props {
  file: File;
  onClose: () => void;
  /** Called when a page with annotations is ready to be saved to memory pocket */
  onSavePage: (imageDataUrl: string, hasAnnotations: boolean) => void;
}

interface PageAnnotationState {
  hasStrokes: boolean;
  /** Whether this page has already been dispatched to onSavePage */
  saved: boolean;
}

export function PdfReaderModal({ file, onClose, onSavePage }: Props) {
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [aiEntries, setAiEntries] = useState<AiEntry[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);

  // Drawing state (refs to avoid stale closures in event handlers)
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const circleCountRef = useRef(0);
  const touchTrackRef = useRef<{ y: number; time: number } | null>(null);

  // Per-page annotation state
  const pageStateRef = useRef<Map<number, PageAnnotationState>>(new Map());
  const getPageState = (p: number): PageAnnotationState =>
    pageStateRef.current.get(p) ?? { hasStrokes: false, saved: false };
  const setPageState = (p: number, s: Partial<PageAnnotationState>) => {
    pageStateRef.current.set(p, { ...getPageState(p), ...s });
  };

  // ─── Load PDF ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.mjs",
        import.meta.url,
      ).toString();
      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      if (cancelled) return;
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
    })();
    return () => { cancelled = true; };
  }, [file]);

  // ─── Render page ────────────────────────────────────────────────────────────
  const renderPage = useCallback(async (pageNum: number) => {
    const pdf = pdfDocRef.current;
    if (!pdf || !containerRef.current) return;
    setIsRendering(true);
    try {
      const page = await pdf.getPage(pageNum);
      const cW = containerRef.current.clientWidth;
      const cH = containerRef.current.clientHeight;
      const baseVp = page.getViewport({ scale: 1 });
      const scale = Math.min((cW - 16) / baseVp.width, (cH - 16) / baseVp.height, 2);
      const vp = page.getViewport({ scale });
      const w = Math.floor(vp.width);
      const h = Math.floor(vp.height);

      const pdfCanvas = pdfCanvasRef.current;
      const annotCanvas = annotCanvasRef.current;
      if (!pdfCanvas || !annotCanvas) return;

      pdfCanvas.width = w;
      pdfCanvas.height = h;
      annotCanvas.width = w;
      annotCanvas.height = h;
      setPageSize({ w, h });

      const ctx = pdfCanvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
    } finally {
      setIsRendering(false);
    }
  }, []);

  useEffect(() => {
    if (totalPages > 0) renderPage(currentPage);
  }, [currentPage, totalPages, renderPage]);

  // ─── Canvas utilities ────────────────────────────────────────────────────────
  const clearAnnotCanvas = () => {
    const c = annotCanvasRef.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    circleCountRef.current = 0;
  };

  const getComposite = (): string => {
    const pc = pdfCanvasRef.current;
    const ac = annotCanvasRef.current;
    if (!pc || !ac) return "";
    const off = document.createElement("canvas");
    off.width = pc.width;
    off.height = pc.height;
    const ctx = off.getContext("2d")!;
    ctx.drawImage(pc, 0, 0);
    ctx.drawImage(ac, 0, 0);
    return off.toDataURL("image/jpeg", 0.82);
  };

  const cropRegion = (bbox: { x: number; y: number; w: number; h: number }): string => {
    const pc = pdfCanvasRef.current;
    const ac = annotCanvasRef.current;
    if (!pc || !ac) return "";
    const bw = Math.max(1, Math.round(bbox.w));
    const bh = Math.max(1, Math.round(bbox.h));
    const off = document.createElement("canvas");
    off.width = bw;
    off.height = bh;
    const ctx = off.getContext("2d")!;
    ctx.drawImage(pc, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, bw, bh);
    ctx.drawImage(ac, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, bw, bh);
    return off.toDataURL("image/jpeg", 0.88);
  };

  // ─── Save current page to memory pocket ────────────────────────────────────
  const saveCurrentPage = useCallback(() => {
    const state = getPageState(currentPage);
    if (!state.hasStrokes || state.saved) return;
    const composite = getComposite();
    if (!composite) return;
    onSavePage(composite, true);
    setPageState(currentPage, { saved: true });
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1200);
  }, [currentPage, onSavePage]);

  // ─── Page navigation ─────────────────────────────────────────────────────────
  const goToPage = useCallback((next: number) => {
    if (next < 1 || next > totalPages || isRendering) return;
    // Auto-save annotated page before leaving
    saveCurrentPage();
    clearAnnotCanvas();
    setAiEntries([]);
    setShowAiPanel(false);
    setCurrentPage(next);
  }, [totalPages, isRendering, saveCurrentPage]);

  // ─── Pointer coordinate helper ───────────────────────────────────────────────
  const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = annotCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    // Canvas CSS size == pixel size (we set both to same value)
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // ─── Pen drawing handlers ────────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch") {
      // Record touch start for swipe detection
      touchTrackRef.current = { y: e.clientY, time: Date.now() };
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    currentPointsRef.current = [getCanvasPos(e)];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || e.pointerType === "touch") return;

    const canvas = annotCanvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getCanvasPos(e);
    const prev = currentPointsRef.current[currentPointsRef.current.length - 1];

    currentPointsRef.current.push(pos);
    setPageState(currentPage, { hasStrokes: true });

    ctx.beginPath();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "#EF4444";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLCanvasElement>) => {
    // ── Touch: detect swipe for page navigation ──
    if (e.pointerType === "touch") {
      const t = touchTrackRef.current;
      if (!t) return;
      const dy = t.y - e.clientY;
      const dt = Date.now() - t.time;
      touchTrackRef.current = null;
      if (Math.abs(dy) > 55 && dt < 450) {
        goToPage(dy > 0 ? currentPage + 1 : currentPage - 1);
      }
      return;
    }

    // ── Pen: finish stroke ──
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const points = [...currentPointsRef.current];
    currentPointsRef.current = [];

    if (points.length < 3) return;

    // Detect if stroke is a closed shape
    const bbox = detectClosedShape(points);
    if (!bbox) return; // Open stroke = free annotation, nothing more to do

    // ── Closed shape detected → highlight + AI analysis ──
    const canvas = annotCanvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    // Draw dashed selection rect over the circled area
    ctx.save();
    ctx.strokeStyle = "#4D5CFF";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(bbox.x, bbox.y, bbox.w, bbox.h);
    ctx.restore();

    const circleIdx = ++circleCountRef.current;
    const entryId = `entry_${Date.now()}`;
    const newEntry: AiEntry = {
      id: entryId,
      status: "loading",
      answer: "",
      circleIndex: circleIdx,
    };

    setAiEntries(prev => [...prev, newEntry]);
    setShowAiPanel(true);

    // Crop the circled region and send to AI
    try {
      const regionImg = cropRegion(bbox);
      const compressed = await compressImageForApi(regionImg);
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "image",
          imageDataUrl: compressed,
          fileName: "circle_region.jpg",
        }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json() as {
        summary?: string; overview?: string; detailIntro?: string;
        aiKeyPoints?: string[]; detailSections?: { title: string; items: string[] }[];
      };

      // Compose a readable answer from the response fields
      const parts: string[] = [];
      if (data.overview) parts.push(data.overview);
      if (data.detailIntro && data.detailIntro !== data.overview) parts.push(data.detailIntro);
      if (data.detailSections?.length) {
        for (const s of data.detailSections.slice(0, 2)) {
          if (s.title) parts.push(`【${s.title}】`);
          if (s.items?.length) parts.push(s.items.slice(0, 3).join("\n"));
        }
      }
      if (!parts.length && data.summary) parts.push(data.summary);

      setAiEntries(prev =>
        prev.map(e => e.id === entryId
          ? { ...e, status: "done", answer: parts.join("\n\n") || "分析完成" }
          : e
        )
      );
    } catch {
      setAiEntries(prev =>
        prev.map(e => e.id === entryId ? { ...e, status: "error" } : e)
      );
    }
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawingRef.current && e.pointerType !== "touch") {
      isDrawingRef.current = false;
      currentPointsRef.current = [];
    }
  };

  // ─── Close modal ─────────────────────────────────────────────────────────────
  const handleClose = () => {
    saveCurrentPage();
    onClose();
  };

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goToPage(currentPage + 1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goToPage(currentPage - 1);
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentPage, goToPage]);

  const hasAnnotations = getPageState(currentPage).hasStrokes;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col" style={{ background: "#1C1C1E" }}>

      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
        style={{ background: "#2C2C2E", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Left: close */}
        <button
          onClick={handleClose}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
          style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}
        >
          <X size={17} />
        </button>

        {/* Center: page navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1 || isRendering}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-opacity disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-[13px] text-white min-w-[64px] text-center" style={{ fontWeight: 600 }}>
            {totalPages ? `${currentPage} / ${totalPages}` : "加载中..."}
          </span>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages || isRendering}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-opacity disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Right: manual save button */}
        <button
          onClick={saveCurrentPage}
          disabled={!hasAnnotations}
          title="存入记忆口袋"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] transition-all disabled:opacity-30"
          style={{
            background: saveFlash ? "#34C759" : hasAnnotations ? "#4D5CFF" : "rgba(255,255,255,0.08)",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          <Save size={13} />
          {saveFlash ? "已存入" : "存入口袋"}
        </button>
      </div>

      {/* ── Body: PDF canvas + AI panel ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Canvas area */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center overflow-hidden"
          style={{ position: "relative" }}
        >
          {isRendering && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <span className="text-[13px] text-white opacity-50">渲染中...</span>
            </div>
          )}

          {/* Stacked canvases */}
          {pageSize && (
            <div style={{ position: "relative", width: pageSize.w, height: pageSize.h, flexShrink: 0 }}>
              {/* PDF layer */}
              <canvas
                ref={pdfCanvasRef}
                width={pageSize.w}
                height={pageSize.h}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  borderRadius: 4,
                  boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
                }}
              />
              {/* Annotation layer */}
              <canvas
                ref={annotCanvasRef}
                width={pageSize.w}
                height={pageSize.h}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  cursor: "crosshair",
                  touchAction: "none",
                  borderRadius: 4,
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
              />
            </div>
          )}

          {/* Pen / touch usage hint (shown when no annotations yet) */}
          {!hasAnnotations && !isRendering && pageSize && (
            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                background: "rgba(10,12,30,0.72)",
                backdropFilter: "blur(6px)",
                borderRadius: 14,
                padding: "8px 16px",
              }}
            >
              <p className="text-[12px] text-white text-center" style={{ opacity: 0.85 }}>
                Apple Pencil 圈画 → AI 即时解析 &nbsp;·&nbsp; 手指上下滑动翻页
              </p>
            </div>
          )}
        </div>

        {/* AI Analysis panel (slides in when circles are detected) */}
        {showAiPanel && (
          <AiAnalysisPanel
            entries={aiEntries}
            onClose={() => setShowAiPanel(false)}
          />
        )}
      </div>
    </div>
  );
}
