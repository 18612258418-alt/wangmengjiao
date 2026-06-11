import { useState, useRef, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Save, Pen, Eraser } from "lucide-react";
import { detectClosedShape, type Point } from "./circleDetect";
import { AiAnalysisPanel, type AiEntry } from "./AiAnalysisPanel";
import { compressImageForApi } from "../../utils/api";
import { formatCircleRegionAnswer, type CircleRegionResult } from "../../prompts/circleRegion";
import { recordAnalysis, recordClarification, summarizeProfile } from "./userProfile";

interface Props {
  file: File;
  onClose: () => void;
  /** Called when a page with annotations is ready to be saved to memory pocket */
  onSavePage: (imageDataUrl: string, hasAnnotations: boolean) => void;
}

type Tool = "pen" | "eraser";

interface Box { x: number; y: number; w: number; h: number }

interface Stroke {
  id: string;
  points: Point[];
  kind: "ink" | "circle";
  bbox?: Box;
  entryId?: string;
}

/** 每页矢量笔迹，width 记录笔迹坐标系对应的画布宽度，便于窗口缩放后重映射 */
interface PageInk {
  width: number;
  strokes: Stroke[];
}

interface PageAnnotationState {
  hasStrokes: boolean;
  saved: boolean;
  /** True when strokes changed since the last save */
  dirtySinceSave: boolean;
}

interface PageAiCache {
  entries: AiEntry[];
  showPanel: boolean;
}

const DEFAULT_PAGE_STATE: PageAnnotationState = {
  hasStrokes: false,
  saved: false,
  dirtySinceSave: false,
};

const ERASE_RADIUS = 16;
/** 停笔多久后把未分析的开放笔迹（下划线/问号/手写字）送去识别 */
const INK_ANALYZE_DELAY = 2000;

function pdfDisplayTitle(file: File, metaTitle?: string): string {
  const fromMeta = metaTitle?.trim();
  if (fromMeta) return fromMeta;
  return file.name.replace(/\.pdf$/i, "") || "未命名文档";
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function strokeHit(stroke: Stroke, pos: Point, radius: number): boolean {
  const pts = stroke.points;
  if (pts.length === 1) return Math.hypot(pos.x - pts[0].x, pos.y - pts[0].y) <= radius;
  for (let i = 1; i < pts.length; i++) {
    if (distToSegment(pos, pts[i - 1], pts[i]) <= radius) return true;
  }
  return false;
}

export function PdfReaderModal({ file, onClose, onSavePage }: Props) {
  const [pdfTitle, setPdfTitle] = useState(() => pdfDisplayTitle(file));
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [aiEntries, setAiEntries] = useState<AiEntry[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [hasAnnotations, setHasAnnotations] = useState(false);
  const [pageDirty, setPageDirty] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [tool, setTool] = useState<Tool>("pen");
  const [toast, setToast] = useState("");

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const renderScaleRef = useRef(1);
  const currentPageRef = useRef(1);
  const autoSaveRef = useRef(true);
  const toolRef = useRef<Tool>("pen");
  const pendingRenderPageRef = useRef<number | null>(null);

  const isDrawingRef = useRef(false);
  const isErasingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const touchTrackRef = useRef<{ y: number; time: number } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingInkRef = useRef<{ page: number; ids: string[] }>({ page: 1, ids: [] });
  /** entryId → 已压缩的标记截图，用于澄清回复后二次解析 */
  const entryCropRef = useRef<Map<string, string>>(new Map());

  const pageStateRef = useRef<Map<number, PageAnnotationState>>(new Map());
  const pageInkRef = useRef<Map<number, PageInk>>(new Map());
  const pageAiCacheRef = useRef<Map<number, PageAiCache>>(new Map());
  const pageCircleCountRef = useRef<Map<number, number>>(new Map());
  const circleCountRef = useRef(0);

  const getPageState = (p: number): PageAnnotationState =>
    pageStateRef.current.get(p) ?? DEFAULT_PAGE_STATE;

  const setPageState = (p: number, patch: Partial<PageAnnotationState>) => {
    pageStateRef.current.set(p, { ...getPageState(p), ...patch });
  };

  const getStrokes = (p: number): Stroke[] => pageInkRef.current.get(p)?.strokes ?? [];

  const syncUiFromPage = useCallback((pageNum: number) => {
    const state = getPageState(pageNum);
    setHasAnnotations(state.hasStrokes);
    setPageDirty(state.dirtySinceSave);
    const aiCache = pageAiCacheRef.current.get(pageNum);
    setAiEntries(aiCache?.entries ?? []);
    setShowAiPanel(aiCache?.showPanel ?? false);
    circleCountRef.current = pageCircleCountRef.current.get(pageNum) ?? 0;
  }, []);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(""), 2800);
  }, []);

  // ─── Vector strokes: draw / redraw ──────────────────────────────────────────
  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    const pts = stroke.points;
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = "#EF4444";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    if (stroke.kind === "circle" && stroke.bbox) {
      ctx.save();
      ctx.strokeStyle = "#4D5CFF";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(stroke.bbox.x, stroke.bbox.y, stroke.bbox.w, stroke.bbox.h);
      ctx.restore();
    }
  };

  const redrawPage = useCallback((pageNum: number) => {
    if (pageNum !== currentPageRef.current) return;
    const canvas = annotCanvasRef.current;
    if (!canvas || canvas.width === 0) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const ink = pageInkRef.current.get(pageNum);
    if (!ink || ink.strokes.length === 0) return;

    // 窗口缩放导致画布尺寸变化时，把笔迹坐标重映射到新尺寸
    if (ink.width > 0 && ink.width !== canvas.width) {
      const f = canvas.width / ink.width;
      for (const s of ink.strokes) {
        s.points = s.points.map(pt => ({ x: pt.x * f, y: pt.y * f }));
        if (s.bbox) {
          s.bbox = { x: s.bbox.x * f, y: s.bbox.y * f, w: s.bbox.w * f, h: s.bbox.h * f };
        }
      }
      ink.width = canvas.width;
    }

    for (const s of ink.strokes) drawStroke(ctx, s);
  }, []);

  const addStroke = useCallback((pageNum: number, stroke: Stroke) => {
    const canvas = annotCanvasRef.current;
    const ink = pageInkRef.current.get(pageNum);
    if (ink) {
      ink.strokes.push(stroke);
    } else {
      pageInkRef.current.set(pageNum, { width: canvas?.width ?? 0, strokes: [stroke] });
    }
    setPageState(pageNum, { hasStrokes: true, dirtySinceSave: true });
    if (pageNum === currentPageRef.current) {
      setHasAnnotations(true);
      setPageDirty(true);
    }
  }, []);

  const removeStrokes = useCallback((pageNum: number, ids: Set<string>) => {
    const ink = pageInkRef.current.get(pageNum);
    if (!ink) return;
    ink.strokes = ink.strokes.filter(s => !ids.has(s.id));
    // 待分析的开放笔迹被擦掉后不再送分析
    pendingInkRef.current.ids = pendingInkRef.current.ids.filter(id => !ids.has(id));

    const has = ink.strokes.length > 0;
    setPageState(pageNum, has
      ? { hasStrokes: true, dirtySinceSave: true }
      : { hasStrokes: false, dirtySinceSave: false });
    if (pageNum === currentPageRef.current) {
      setHasAnnotations(has);
      setPageDirty(has);
    }
    redrawPage(pageNum);
  }, [redrawPage]);

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
      try {
        const meta = await pdf.getMetadata();
        const title = (meta?.info as { Title?: string } | undefined)?.Title;
        setPdfTitle(pdfDisplayTitle(file, title));
      } catch {
        setPdfTitle(pdfDisplayTitle(file));
      }
    })();
    return () => {
      cancelled = true;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (inkTimerRef.current) clearTimeout(inkTimerRef.current);
    };
  }, [file]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    autoSaveRef.current = autoSave;
  }, [autoSave]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  // ─── Render page ────────────────────────────────────────────────────────────
  const renderPage = useCallback(async (pageNum: number) => {
    const pdf = pdfDocRef.current;
    const container = containerRef.current;
    if (!pdf || !container) return;

    const pdfCanvas = pdfCanvasRef.current;
    const annotCanvas = annotCanvasRef.current;
    if (!pdfCanvas || !annotCanvas) {
      pendingRenderPageRef.current = pageNum;
      return;
    }

    const cW = container.clientWidth;
    const cH = container.clientHeight;
    if (cW < 10 || cH < 10) {
      pendingRenderPageRef.current = pageNum;
      return;
    }

    setIsRendering(true);
    try {
      const page = await pdf.getPage(pageNum);
      const baseVp = page.getViewport({ scale: 1 });
      const scale = Math.min((cW - 16) / baseVp.width, (cH - 16) / baseVp.height, 2);
      renderScaleRef.current = scale;
      const vp = page.getViewport({ scale });
      const w = Math.floor(vp.width);
      const h = Math.floor(vp.height);

      pdfCanvas.width = w;
      pdfCanvas.height = h;
      annotCanvas.width = w;
      annotCanvas.height = h;
      setPageSize({ w, h });

      const ctx = pdfCanvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      await page.render({ canvas: pdfCanvas, canvasContext: ctx, viewport: vp }).promise;
      redrawPage(pageNum);
      pendingRenderPageRef.current = null;
    } finally {
      setIsRendering(false);
    }
  }, [redrawPage]);

  useEffect(() => {
    if (totalPages <= 0) return;
    syncUiFromPage(currentPage);

    let cancelled = false;
    const run = () => {
      if (!cancelled) void renderPage(currentPage);
    };
    // 等布局完成后再渲染，避免容器宽高为 0
    requestAnimationFrame(() => requestAnimationFrame(run));
    return () => { cancelled = true; };
  }, [currentPage, totalPages, renderPage, syncUiFromPage]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      const pending = pendingRenderPageRef.current;
      if (pending !== null && totalPages > 0) {
        void renderPage(pending);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [totalPages, renderPage]);

  // ─── Canvas utilities ────────────────────────────────────────────────────────
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

  /**
   * 高清截取标记区域：
   * 1. 直接从 PDF 原始数据高分辨率重渲（而非缩放屏幕画布），公式细节清晰
   * 2. maskPoints（圈选）：沿闭合路径把圈外内容涂白，剔除干扰；不画笔迹本身
   * 3. overlayStrokes（下划线/问号/手写字）：把笔迹画进截图，让模型看到标记
   */
  const cropRegionHiRes = useCallback(async (
    bbox: Box,
    opts: { maskPoints?: Point[]; overlayStrokes?: Stroke[] },
  ): Promise<string> => {
    const minSide = Math.min(bbox.w, bbox.h);
    const maxSide = Math.max(bbox.w, bbox.h);
    // 目标：短边 ~700px、长边 ≤1400px；保底 160px（豆包最小边要求）
    let k = 700 / minSide;
    k = Math.min(k, 1400 / maxSide);
    k = Math.max(k, 160 / minSide, 1);
    k = Math.min(k, 6);

    const outW = Math.max(1, Math.round(bbox.w * k));
    const outH = Math.max(1, Math.round(bbox.h * k));

    const region = document.createElement("canvas");
    region.width = outW;
    region.height = outH;
    const regionCtx = region.getContext("2d")!;
    regionCtx.fillStyle = "#ffffff";
    regionCtx.fillRect(0, 0, outW, outH);

    let rendered = false;
    const pdf = pdfDocRef.current;
    if (pdf) {
      try {
        const page = await pdf.getPage(currentPageRef.current);
        const vp = page.getViewport({
          scale: renderScaleRef.current * k,
          offsetX: -bbox.x * k,
          offsetY: -bbox.y * k,
        });
        await page.render({ canvas: region, canvasContext: regionCtx, viewport: vp }).promise;
        rendered = true;
      } catch {
        // 回退到屏幕画布
      }
    }
    if (!rendered) {
      const pc = pdfCanvasRef.current;
      if (!pc) return "";
      regionCtx.drawImage(pc, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, outW, outH);
    }

    // 把笔迹标记画进截图（下划线/问号/手写字需要让模型看到）
    if (opts.overlayStrokes?.length) {
      regionCtx.strokeStyle = "#EF4444";
      regionCtx.lineWidth = Math.max(2, 2.5 * k);
      regionCtx.lineCap = "round";
      regionCtx.lineJoin = "round";
      for (const s of opts.overlayStrokes) {
        if (s.points.length < 2) continue;
        regionCtx.beginPath();
        regionCtx.moveTo((s.points[0].x - bbox.x) * k, (s.points[0].y - bbox.y) * k);
        for (let i = 1; i < s.points.length; i++) {
          regionCtx.lineTo((s.points[i].x - bbox.x) * k, (s.points[i].y - bbox.y) * k);
        }
        regionCtx.stroke();
      }
    }

    const strokePoints = opts.maskPoints ?? [];
    if (strokePoints.length < 6) return region.toDataURL("image/jpeg", 0.9);

    // 圈外涂白：沿笔迹闭合路径裁剪，路径略向外扩，避免切掉压线文字
    const cx = strokePoints.reduce((s, p) => s + p.x, 0) / strokePoints.length;
    const cy = strokePoints.reduce((s, p) => s + p.y, 0) / strokePoints.length;
    const DILATE = 12;

    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);
    ctx.save();
    ctx.beginPath();
    strokePoints.forEach((p, i) => {
      const d = Math.hypot(p.x - cx, p.y - cy) || 1;
      const x = (p.x + ((p.x - cx) / d) * DILATE - bbox.x) * k;
      const y = (p.y + ((p.y - cy) / d) * DILATE - bbox.y) * k;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(region, 0, 0);
    ctx.restore();
    return out.toDataURL("image/jpeg", 0.9);
  }, []);

  // ─── Save current page to memory pocket ────────────────────────────────────
  const saveCurrentPage = useCallback((pageNum = currentPageRef.current) => {
    const state = getPageState(pageNum);
    if (!state.hasStrokes || !state.dirtySinceSave) return;
    const composite = getComposite();
    if (!composite) return;
    onSavePage(composite, true);
    setPageState(pageNum, { saved: true, dirtySinceSave: false });
    if (pageNum === currentPageRef.current) {
      setPageDirty(false);
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1200);
    }
  }, [onSavePage]);

  // ─── Page navigation ─────────────────────────────────────────────────────────
  const cachePageUiState = useCallback((pageNum: number) => {
    pageAiCacheRef.current.set(pageNum, {
      entries: aiEntries,
      showPanel: showAiPanel,
    });
    pageCircleCountRef.current.set(pageNum, circleCountRef.current);
  }, [aiEntries, showAiPanel]);

  const goToPage = useCallback((next: number) => {
    if (next < 1 || next > totalPages || isRendering) return;
    const leaving = currentPageRef.current;

    // 翻页时丢弃尚未触发的笔迹分析（笔迹本身保留）
    if (inkTimerRef.current) {
      clearTimeout(inkTimerRef.current);
      inkTimerRef.current = null;
    }
    pendingInkRef.current.ids = [];

    cachePageUiState(leaving);
    if (autoSaveRef.current) saveCurrentPage(leaving);

    setCurrentPage(next);
  }, [totalPages, isRendering, cachePageUiState, saveCurrentPage]);

  // ─── Pointer coordinate helper ───────────────────────────────────────────────
  const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = annotCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const circleFailureMessage = (err: unknown): string => {
    if (err instanceof TypeError) {
      return "AI 服务未连接，请确认已用 pnpm dev 或 vercel dev 启动";
    }
    if (err instanceof Error) {
      const msg = err.message;
      if (msg.includes("404")) {
        return "AI 服务未连接，请确认已用 pnpm dev 或 vercel dev 启动";
      }
      if (msg.includes("too small") || msg.includes("dimensions are too small")) {
        return "圈选范围太小，请把题干和所求一并圈大一些";
      }
      if (msg.includes("超时") || msg.includes("timeout") || msg.includes("504")) {
        return "AI 分析超时，请稍后重试或缩小圈选范围";
      }
      if (msg.includes("格式异常") || msg === "empty analysis") {
        return "未能识别圈选内容，请重新圈选";
      }
      if (msg.includes("not configured")) {
        return "API Key 未配置，请检查 .env.local";
      }
    }
    return "未能识别圈选内容，请重新圈选";
  };

  // ─── Eraser ──────────────────────────────────────────────────────────────────
  const markEntriesErased = useCallback((pageNum: number, entryIds: string[]) => {
    if (entryIds.length === 0) return;
    setAiEntries(prev => {
      const next = prev.map(e => entryIds.includes(e.id) ? { ...e, erased: true } : e);
      const cache = pageAiCacheRef.current.get(pageNum);
      pageAiCacheRef.current.set(pageNum, {
        entries: next,
        showPanel: cache?.showPanel ?? true,
      });
      return next;
    });
  }, []);

  const eraseAt = useCallback((pos: Point) => {
    const pageNum = currentPageRef.current;
    const strokes = getStrokes(pageNum);
    if (strokes.length === 0) return;

    const hit = strokes.filter(s => strokeHit(s, pos, ERASE_RADIUS));
    if (hit.length === 0) return;

    removeStrokes(pageNum, new Set(hit.map(s => s.id)));
    markEntriesErased(
      pageNum,
      hit.filter(s => s.kind === "circle" && s.entryId).map(s => s.entryId!),
    );
  }, [removeStrokes, markEntriesErased]);

  // ─── AI analysis (shared) ────────────────────────────────────────────────────
  const callCircleApi = useCallback(async (
    imageDataUrl: string,
    opts: { markKind: "circle" | "ink"; userIntent?: string },
  ): Promise<CircleRegionResult> => {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "image",
        mode: "circle_region",
        imageDataUrl,
        fileName: file.name,
        pdfTitle,
        pageNum: currentPageRef.current,
        markKind: opts.markKind,
        userIntent: opts.userIntent,
        userProfile: summarizeProfile(),
      }),
    });

    const raw = await res.text();
    let data = {} as CircleRegionResult & { error?: string };
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      if (!res.ok) throw new Error(`API ${res.status}`);
      throw new Error("模型返回格式异常，请重新圈选");
    }
    if (!res.ok) throw new Error(data.error || `API ${res.status}`);
    if (data.error) throw new Error(data.error);
    return data;
  }, [file.name, pdfTitle]);

  const updateEntries = useCallback((pageNum: number, fn: (prev: AiEntry[]) => AiEntry[]) => {
    setAiEntries(prev => {
      const next = fn(prev);
      const cache = pageAiCacheRef.current.get(pageNum);
      pageAiCacheRef.current.set(pageNum, { entries: next, showPanel: cache?.showPanel ?? true });
      return next;
    });
  }, []);

  const applyResultToEntry = useCallback((pageNum: number, entryId: string, data: CircleRegionResult) => {
    const formatted = formatCircleRegionAnswer(data);
    if (!formatted.trim()) throw new Error("empty analysis");

    updateEntries(pageNum, prev => prev.map(e => e.id === entryId
      ? {
        ...e,
        status: "done" as const,
        intent: data.intent,
        sections: data.sections,
        warnings: data.warnings,
        clarifyQuestion: data.needClarify ? data.clarifyQuestion : undefined,
        answer: formatted,
      }
      : e
    ));

    if (!data.needClarify && data.skill) recordAnalysis(data.skill);
  }, [updateEntries]);

  const removeEntry = useCallback((pageNum: number, entryId: string) => {
    entryCropRef.current.delete(entryId);
    setAiEntries(prev => {
      const next = prev.filter(e => e.id !== entryId);
      const showPanel = next.length > 0;
      pageAiCacheRef.current.set(pageNum, { entries: next, showPanel });
      if (pageNum === currentPageRef.current) setShowAiPanel(showPanel);
      return next;
    });
  }, []);

  const pushLoadingEntry = useCallback((pageNum: number, entryId: string, kind: "circle" | "ink") => {
    const circleIdx = ++circleCountRef.current;
    pageCircleCountRef.current.set(pageNum, circleCountRef.current);
    updateEntries(pageNum, prev => [...prev, {
      id: entryId,
      status: "loading" as const,
      answer: "",
      circleIndex: circleIdx,
      kind,
    }]);
    setShowAiPanel(true);
    pageAiCacheRef.current.set(pageNum, {
      entries: pageAiCacheRef.current.get(pageNum)?.entries ?? [],
      showPanel: true,
    });
  }, [updateEntries]);

  // ─── Circle → AI analysis ────────────────────────────────────────────────────
  const triggerCircleAnalysis = useCallback(async (stroke: Stroke) => {
    const pageNum = currentPageRef.current;
    const bbox = stroke.bbox!;
    const entryId = stroke.entryId!;

    pushLoadingEntry(pageNum, entryId, "circle");

    try {
      const regionImg = await cropRegionHiRes(bbox, { maskPoints: stroke.points });
      if (!regionImg) throw new Error("empty analysis");
      const compressed = await compressImageForApi(regionImg);
      entryCropRef.current.set(entryId, compressed);
      const data = await callCircleApi(compressed, { markKind: "circle" });
      applyResultToEntry(pageNum, entryId, data);
    } catch (err) {
      // 若分析期间笔迹已被擦除，不再回滚画布，仅清掉 loading 条目
      const stillExists = getStrokes(pageNum).some(s => s.id === stroke.id);
      if (stillExists) {
        circleCountRef.current = Math.max(0, circleCountRef.current - 1);
        pageCircleCountRef.current.set(pageNum, circleCountRef.current);
        removeStrokes(pageNum, new Set([stroke.id]));
        showToast(circleFailureMessage(err));
      }
      removeEntry(pageNum, entryId);
    }
  }, [pushLoadingEntry, cropRegionHiRes, callCircleApi, applyResultToEntry, removeStrokes, removeEntry, showToast]);

  // ─── Ink marks (underline / question mark / handwriting) → AI ────────────────
  const analyzeInkMarks = useCallback(async () => {
    const pageNum = currentPageRef.current;
    if (pendingInkRef.current.page !== pageNum) {
      pendingInkRef.current = { page: pageNum, ids: [] };
      return;
    }
    const ids = new Set(pendingInkRef.current.ids);
    pendingInkRef.current.ids = [];

    const strokes = getStrokes(pageNum).filter(s => ids.has(s.id) && s.kind === "ink" && !s.entryId);
    if (strokes.length === 0) return;

    const canvas = annotCanvasRef.current;
    if (!canvas || canvas.width === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of strokes) {
      for (const p of s.points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    }

    // 扁平笔迹（下划线类）需要多带上方的被划线文字作为上下文
    const isFlat = (maxX - minX) / Math.max(maxY - minY, 1) >= 4;
    const mLeft = 30, mRight = 30;
    const mTop = isFlat ? 90 : 50;
    const mBottom = isFlat ? 36 : 50;

    const x = Math.max(0, minX - mLeft);
    const y = Math.max(0, minY - mTop);
    const bbox: Box = {
      x,
      y,
      w: Math.min(canvas.width, maxX + mRight) - x,
      h: Math.min(canvas.height, maxY + mBottom) - y,
    };
    if (bbox.w < 8 || bbox.h < 8) return;

    const entryId = `entry_${Date.now()}`;
    strokes.forEach(s => { s.entryId = entryId; });

    pushLoadingEntry(pageNum, entryId, "ink");

    try {
      const regionImg = await cropRegionHiRes(bbox, { overlayStrokes: strokes });
      if (!regionImg) throw new Error("empty analysis");
      const compressed = await compressImageForApi(regionImg);
      entryCropRef.current.set(entryId, compressed);
      const data = await callCircleApi(compressed, { markKind: "ink" });
      applyResultToEntry(pageNum, entryId, data);
    } catch (err) {
      // 笔迹是用户的笔记，保留在画布上；只移除条目
      strokes.forEach(s => { s.entryId = undefined; });
      circleCountRef.current = Math.max(0, circleCountRef.current - 1);
      pageCircleCountRef.current.set(pageNum, circleCountRef.current);
      removeEntry(pageNum, entryId);
      showToast(circleFailureMessage(err));
    }
  }, [pushLoadingEntry, cropRegionHiRes, callCircleApi, applyResultToEntry, removeEntry, showToast]);

  const scheduleInkAnalysis = useCallback((pageNum: number, strokeId: string) => {
    if (pendingInkRef.current.page !== pageNum) {
      pendingInkRef.current = { page: pageNum, ids: [] };
    }
    pendingInkRef.current.ids.push(strokeId);
    if (inkTimerRef.current) clearTimeout(inkTimerRef.current);
    inkTimerRef.current = setTimeout(() => {
      inkTimerRef.current = null;
      void analyzeInkMarks();
    }, INK_ANALYZE_DELAY);
  }, [analyzeInkMarks]);

  const cancelInkAnalysis = useCallback(() => {
    if (inkTimerRef.current) {
      clearTimeout(inkTimerRef.current);
      inkTimerRef.current = null;
    }
    pendingInkRef.current.ids = [];
  }, []);

  // ─── Clarify reply ───────────────────────────────────────────────────────────
  const handleClarifyReply = useCallback(async (entryId: string, reply: string) => {
    const pageNum = currentPageRef.current;
    const crop = entryCropRef.current.get(entryId);
    if (!crop) return;

    const entry = aiEntries.find(e => e.id === entryId);
    const prevQuestion = entry?.clarifyQuestion;
    recordClarification(reply);

    updateEntries(pageNum, prev => prev.map(e => e.id === entryId
      ? { ...e, status: "loading" as const, clarifyQuestion: undefined }
      : e
    ));

    try {
      const data = await callCircleApi(crop, {
        markKind: entry?.kind ?? "ink",
        userIntent: reply,
      });
      applyResultToEntry(pageNum, entryId, data);
    } catch {
      // 失败则恢复提问，让用户可以重试
      updateEntries(pageNum, prev => prev.map(e => e.id === entryId
        ? { ...e, status: "done" as const, clarifyQuestion: prevQuestion }
        : e
      ));
      showToast("解析失败，请重试");
    }
  }, [aiEntries, updateEntries, callCircleApi, applyResultToEntry, showToast]);

  const finishPenStroke = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const points = [...currentPointsRef.current];
    currentPointsRef.current = [];
    if (points.length < 3) return;

    const pageNum = currentPageRef.current;
    const strokeId = `stroke_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    const bbox = detectClosedShape(points);

    if (bbox) {
      const stroke: Stroke = {
        id: strokeId,
        points,
        kind: "circle",
        bbox,
        entryId: `entry_${Date.now()}`,
      };
      addStroke(pageNum, stroke);
      redrawPage(pageNum);
      void triggerCircleAnalysis(stroke);
    } else {
      addStroke(pageNum, { id: strokeId, points, kind: "ink" });
      scheduleInkAnalysis(pageNum, strokeId);
    }
  }, [addStroke, redrawPage, triggerCircleAnalysis, scheduleInkAnalysis]);

  // ─── Pen / touch handlers ────────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch") {
      touchTrackRef.current = { y: e.clientY, time: Date.now() };
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    if (toolRef.current === "eraser") {
      isErasingRef.current = true;
      eraseAt(getCanvasPos(e));
      return;
    }
    isDrawingRef.current = true;
    currentPointsRef.current = [getCanvasPos(e)];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch") return;

    if (isErasingRef.current) {
      eraseAt(getCanvasPos(e));
      return;
    }
    if (!isDrawingRef.current) return;

    const canvas = annotCanvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getCanvasPos(e);
    const prev = currentPointsRef.current[currentPointsRef.current.length - 1];

    currentPointsRef.current.push(pos);

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

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch") {
      const t = touchTrackRef.current;
      if (!t) return;
      const dy = t.y - e.clientY;
      const dt = Date.now() - t.time;
      touchTrackRef.current = null;
      if (Math.abs(dy) > 55 && dt < 450) {
        goToPage(dy > 0 ? currentPageRef.current + 1 : currentPageRef.current - 1);
      }
      return;
    }

    isErasingRef.current = false;
    finishPenStroke();
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch") return;
    isErasingRef.current = false;
    finishPenStroke();
  };

  // ─── Panel entry deletion ────────────────────────────────────────────────────
  const handleDeleteEntry = useCallback((entryId: string) => {
    const pageNum = currentPageRef.current;
    entryCropRef.current.delete(entryId);
    setAiEntries(prev => {
      const next = prev.filter(e => e.id !== entryId);
      const cache = pageAiCacheRef.current.get(pageNum);
      pageAiCacheRef.current.set(pageNum, { entries: next, showPanel: cache?.showPanel ?? true });
      return next;
    });
  }, []);

  const handleCloseAiPanel = () => {
    setShowAiPanel(false);
    pageAiCacheRef.current.set(currentPageRef.current, {
      entries: aiEntries,
      showPanel: false,
    });
  };

  const handleClose = () => {
    cancelInkAnalysis();
    cachePageUiState(currentPageRef.current);
    if (autoSaveRef.current) saveCurrentPage(currentPageRef.current);
    onClose();
  };

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goToPage(currentPageRef.current + 1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goToPage(currentPageRef.current - 1);
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToPage, handleClose]);

  const toolBtn = (disabled = false) =>
    `w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
      disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-[#F5F6FA] text-[#020418]"
    }`;

  return (
    <div className="fixed inset-0 z-[600] flex flex-col bg-[#F5F6FA]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 flex-shrink-0 bg-white border-b border-[#EAEDF2]">
        <button
          onClick={handleClose}
          className={`${toolBtn()} text-[#7B8291]`}
        >
          <X size={17} />
        </button>

        <div className="flex-1 min-w-0 text-center">
          <p
            className="text-[15px] text-[#020418] truncate px-2"
            style={{ fontWeight: 700 }}
            title={pdfTitle}
          >
            {pdfTitle}
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1 || isRendering}
              className={toolBtn(currentPage <= 1 || isRendering)}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[12px] text-[#7B8291] min-w-[56px] text-center" style={{ fontWeight: 600 }}>
              {totalPages ? `${currentPage} / ${totalPages}` : "加载中..."}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages || isRendering}
              className={toolBtn(currentPage >= totalPages || isRendering)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* 笔 / 橡皮擦切换 */}
          <div className="flex items-center gap-0.5 rounded-xl bg-[#F5F6FA] p-0.5">
            <button
              onClick={() => setTool("pen")}
              title="触控笔书写 / 圈选"
              className="w-8 h-8 flex items-center justify-center rounded-[10px] transition-colors"
              style={{
                background: tool === "pen" ? "#fff" : "transparent",
                color: tool === "pen" ? "#4D5CFF" : "#7B8291",
                boxShadow: tool === "pen" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}
            >
              <Pen size={14} />
            </button>
            <button
              onClick={() => setTool("eraser")}
              title="橡皮擦：点击或划过笔迹即可擦除"
              className="w-8 h-8 flex items-center justify-center rounded-[10px] transition-colors"
              style={{
                background: tool === "eraser" ? "#fff" : "transparent",
                color: tool === "eraser" ? "#4D5CFF" : "#7B8291",
                boxShadow: tool === "eraser" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}
            >
              <Eraser size={14} />
            </button>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={autoSave}
            onClick={() => setAutoSave(v => !v)}
            className="flex items-center gap-2 rounded-xl px-2.5 py-2 hover:bg-[#F5F6FA] transition-colors"
            title={autoSave ? "翻页时自动存入记忆口袋" : "关闭自动保存，需手动存入"}
          >
            <span className="text-[11px] text-[#7B8291] whitespace-nowrap" style={{ fontWeight: 600 }}>
              自动存记忆
            </span>
            <span
              className="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors"
              style={{ background: autoSave ? "#4D5CFF" : "#CBCED4" }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                style={{ left: autoSave ? "18px" : "2px" }}
              />
            </span>
          </button>

          {!autoSave && (
            <button
              onClick={() => saveCurrentPage()}
              disabled={!hasAnnotations || !pageDirty}
              title="手动存入记忆口袋"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] transition-all disabled:opacity-30"
              style={{
                background: saveFlash ? "#34C759" : hasAnnotations && pageDirty ? "#4D5CFF" : "#F5F6FA",
                color: hasAnnotations && pageDirty ? "#fff" : "#7B8291",
                fontWeight: 600,
              }}
            >
              <Save size={13} />
              {saveFlash ? "已存入" : "存入口袋"}
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center overflow-hidden min-h-0 min-w-0"
          style={{ position: "relative" }}
        >
          {isRendering && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <span className="text-[13px] text-[#7B8291]">渲染中...</span>
            </div>
          )}

          {/* Canvas 始终挂载，避免 pageSize 与渲染互相等待 */}
          <div
            style={{
              position: "relative",
              width: pageSize?.w ?? 1,
              height: pageSize?.h ?? 1,
              flexShrink: 0,
              visibility: pageSize ? "visible" : "hidden",
            }}
          >
            <canvas
              ref={pdfCanvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                borderRadius: 4,
                boxShadow: pageSize ? "0 4px 24px rgba(0,0,0,0.08)" : "none",
              }}
            />
            <canvas
              ref={annotCanvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                cursor: tool === "eraser" ? "cell" : "crosshair",
                touchAction: "none",
                borderRadius: 4,
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
            />
          </div>

          {!hasAnnotations && !isRendering && totalPages > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="bg-white/95 backdrop-blur-sm text-[#7B8291] text-[12px] px-5 py-3 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#EAEDF2] text-center leading-5">
                触控笔圈选 / 划线 / 写问号 → AI 即时解析 · 手指上下滑动翻页
              </div>
            </div>
          )}
        </div>

        {showAiPanel && (
          <AiAnalysisPanel
            entries={aiEntries}
            onClose={handleCloseAiPanel}
            onDeleteEntry={handleDeleteEntry}
            onClarifyReply={handleClarifyReply}
          />
        )}
      </div>

      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[610] pointer-events-none transition-all duration-300"
        style={{ opacity: toast ? 1 : 0, transform: `translateX(-50%) translateY(${toast ? "0px" : "12px"})` }}
      >
        <div className="bg-[#1C1C1E] text-white text-[13px] px-4 py-2.5 rounded-2xl shadow-lg" style={{ fontWeight: 500 }}>
          {toast}
        </div>
      </div>
    </div>
  );
}
