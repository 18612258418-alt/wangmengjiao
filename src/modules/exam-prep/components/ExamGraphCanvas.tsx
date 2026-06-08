import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { ExamKnowledgeGraph } from "../types";
import { layoutExamGraph, NODE_R } from "../utils/examGraphLayout";
import { isUserExamPointId } from "../data/userExamPoints";
import {
  DIFFICULTY_FILL,
  DIFFICULTY_FILL_VAR,
  DIFFICULTY_LABEL,
  DIFFICULTY_RING,
  DIFFICULTY_RING_VAR,
} from "../utils/examGraphStyles";
import { EXAM_PANEL_FILL, EXAM_PANEL_SHELL } from "./examPanelStyles";

interface Transform {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 2.8;
const DRAG_THRESHOLD = 4;

/** 分层 DAG 正交连线：竖 → 横 → 竖，减少曲线交叉 */
function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const pad = 4;
  const yStart = y1 + pad;
  const yEnd = y2 - pad;

  if (Math.abs(x1 - x2) < 1.5) {
    return `M ${x1} ${yStart} L ${x2} ${yEnd}`;
  }

  const midY = (yStart + yEnd) / 2;
  return `M ${x1} ${yStart} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${yEnd}`;
}

function fitTransform(
  containerW: number,
  containerH: number,
  graphW: number,
  graphH: number,
): Transform {
  const pad = 32;
  const scale = Math.min(
    (containerW - pad) / graphW,
    (containerH - pad) / graphH,
    0.95,
  );
  return {
    scale,
    x: (containerW - graphW * scale) / 2,
    y: (containerH - graphH * scale) / 2,
  };
}

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function ExamGraphCanvas({
  graph,
  selectedId,
  onSelect,
}: {
  graph: ExamKnowledgeGraph;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  /** 当前按下的所有指针（client 坐标），用于区分单指平移与双指缩放 */
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const panRef = useRef<{ active: boolean; moved: boolean; startX: number; startY: number; base: Transform }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    base: { x: 0, y: 0, scale: 1 },
  });
  /**
   * 单指按在节点上时记录「待选中」候选。因为容器在 pointerdown 时调用了 setPointerCapture，
   * 浏览器会把随后的 click 重定向到容器（而非节点 <g>），导致节点 onClick 不触发。
   * 这里改为在 pointerup 时根据 pointerdown 记下的候选完成选中，绕开 click 重定向。
   */
  const clickCandidateRef = useRef<{ id: string; x: number; y: number } | null>(null);
  /** 双指捏合缩放状态：记录起始间距、起始 transform，以及捏合中点对应的图坐标 */
  const pinchRef = useRef<{ active: boolean; startDist: number; base: Transform; gx: number; gy: number }>({
    active: false,
    startDist: 0,
    base: { x: 0, y: 0, scale: 1 },
    gx: 0,
    gy: 0,
  });

  const { nodes, edges, width, height } = useMemo(
    () => layoutExamGraph(graph.points),
    [graph.points],
  );

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const relatedIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const point = graph.points.find(p => p.id === selectedId);
    if (!point) return new Set([selectedId]);
    return new Set([selectedId, ...point.prerequisites, ...point.postrequisites]);
  }, [graph.points, selectedId]);

  const applyFit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setTransform(fitTransform(el.clientWidth, el.clientHeight, width, height));
  }, [width, height]);

  useEffect(() => {
    applyFit();
  }, [applyFit]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => applyFit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [applyFit]);

  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    setTransform(prev => {
      const nextScale = clampScale(prev.scale * factor);
      const ratio = nextScale / prev.scale;
      return {
        scale: nextScale,
        x: mx - (mx - prev.x) * ratio,
        y: my - (my - prev.y) * ratio,
      };
    });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 0.92 : 1.08);
  }, [zoomAt]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // 缩放按钮等浮层控件：不要在容器上捕获指针，否则会把后续 click 重定向到容器，导致按钮失效
    if ((e.target as Element).closest?.("[data-graph-control]")) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch { /* ignore */ }

    // 第二根手指落下 → 进入双指缩放，并取消单指平移
    if (pointersRef.current.size === 2) {
      panRef.current.active = false;
      clickCandidateRef.current = null;
      panRef.current.moved = true; // 抑制本次手势结束后的误触选中
      const [a, b] = [...pointersRef.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const cx = (a.x + b.x) / 2 - rect.left;
      const cy = (a.y + b.y) / 2 - rect.top;
      pinchRef.current = {
        active: true,
        startDist: dist,
        base: transform,
        gx: (cx - transform.x) / transform.scale,
        gy: (cy - transform.y) / transform.scale,
      };
      return;
    }

    // 单指：按在节点上记为待选中候选；在空白处则开始平移
    if (pointersRef.current.size === 1) {
      const target = e.target as Element;
      const nodeEl = target.closest?.("[data-node-id]");
      if (nodeEl) {
        clickCandidateRef.current = {
          id: nodeEl.getAttribute("data-node-id") ?? "",
          x: e.clientX,
          y: e.clientY,
        };
        return;
      }
      clickCandidateRef.current = null;
      panRef.current = {
        active: true,
        moved: false,
        startX: e.clientX,
        startY: e.clientY,
        base: transform,
      };
    }
  }, [transform]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // 双指缩放：根据两指间距比例缩放，并让捏合中点对应的图坐标始终贴合中点（顺带支持双指平移）
    if (pinchRef.current.active && pointersRef.current.size >= 2) {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const [a, b] = [...pointersRef.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const cx = (a.x + b.x) / 2 - rect.left;
      const cy = (a.y + b.y) / 2 - rect.top;
      const p = pinchRef.current;
      const nextScale = clampScale(p.base.scale * (dist / p.startDist));
      setTransform({
        scale: nextScale,
        x: cx - p.gx * nextScale,
        y: cy - p.gy * nextScale,
      });
      return;
    }

    // 在节点上按下后若发生明显拖动，取消「待选中」（视为拖拽而非点击）
    const cand = clickCandidateRef.current;
    if (cand && Math.hypot(e.clientX - cand.x, e.clientY - cand.y) > DRAG_THRESHOLD) {
      clickCandidateRef.current = null;
    }

    const pan = panRef.current;
    if (!pan.active) return;
    const dx = e.clientX - pan.startX;
    const dy = e.clientY - pan.startY;
    if (!pan.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    pan.moved = true;
    setTransform({
      ...pan.base,
      x: pan.base.x + dx,
      y: pan.base.y + dy,
    });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // 浮层控件（缩放按钮）上的抬起：交给按钮自身 onClick，不要触发画布的取消选中
    if ((e.target as Element).closest?.("[data-graph-control]")) return;
    pointersRef.current.delete(e.pointerId);
    const wasPan = panRef.current.moved;

    // 双指缩放结束（抬起一根手指）
    if (pinchRef.current.active && pointersRef.current.size < 2) {
      pinchRef.current.active = false;
      clickCandidateRef.current = null;
      // 若仍剩一根手指，平滑地接管为单指平移，避免跳变
      if (pointersRef.current.size === 1) {
        const [remaining] = [...pointersRef.current.values()];
        panRef.current = {
          active: true,
          moved: true,
          startX: remaining.x,
          startY: remaining.y,
          base: transform,
        };
      } else {
        panRef.current.active = false;
      }
      setTimeout(() => { panRef.current.moved = false; }, 0);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch { /* ignore */ }
      return;
    }

    panRef.current.active = false;
    setTimeout(() => { panRef.current.moved = false; }, 0);
    const candidate = clickCandidateRef.current;
    clickCandidateRef.current = null;
    if (!wasPan && pointersRef.current.size === 0) {
      if (candidate?.id) {
        onSelect(candidate.id);
      } else {
        onSelect(null);
      }
    }
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }
  }, [onSelect, transform]);

  const renderNode = (node: typeof nodes[0]) => {
    const active = selectedId === node.id;
    const related = relatedIds.has(node.id);
    const dimmed = selectedId !== null && !related;
    const fill = DIFFICULTY_FILL_VAR[node.difficulty];
    const ring = DIFFICULTY_RING_VAR[node.difficulty];
    const fromNote = isUserExamPointId(node.id);

    return (
      <g
        key={node.id}
        data-graph-node
        data-node-id={node.id}
        className="cursor-pointer"
        style={{ opacity: dimmed ? 0.35 : 1, transition: "opacity 0.15s" }}
      >
        {active && (
          <circle
            cx={node.x}
            cy={node.y}
            r={NODE_R + 2}
            fill="none"
            stroke="var(--exam-node-active-stroke)"
            strokeWidth={1}
            strokeDasharray="3 2"
            opacity={0.6}
          />
        )}
        <circle
          cx={node.x}
          cy={node.y}
          r={NODE_R}
          fill={fill}
          stroke={active ? "var(--exam-node-active-stroke)" : ring}
          strokeWidth={active ? 1.25 : 0.75}
        />
        {fromNote && (
          <circle
            cx={node.x + NODE_R * 0.8}
            cy={node.y - NODE_R * 0.8}
            r={2.4}
            fill="#16A34A"
            stroke="#fff"
            strokeWidth={0.8}
          />
        )}
        <text
          x={node.x}
          y={node.y + NODE_R + 7}
          textAnchor="middle"
          fill={active ? "var(--exam-node-active-stroke)" : "#41464F"}
          fontSize={7.5}
          fontWeight={active ? 700 : 500}
          pointerEvents="none"
        >
          {node.label}
        </text>
        <title>{`${node.label} · ${DIFFICULTY_LABEL[node.difficulty]}${fromNote ? " · 由你的笔记扩展" : ""}`}</title>
      </g>
    );
  };

  const sortedNodes = useMemo(() => {
    if (!selectedId) return nodes;
    return [...nodes.filter(n => n.id !== selectedId), ...nodes.filter(n => n.id === selectedId)];
  }, [nodes, selectedId]);

  return (
    <div className={`${EXAM_PANEL_SHELL} ${EXAM_PANEL_FILL} flex flex-col min-h-0 overflow-hidden`}>
      <div className="flex-shrink-0 px-4 pt-3 pb-2.5 border-b border-[#EAEDF2] bg-white">
        <p className="text-[14px] text-[#020418]" style={{ fontWeight: 700 }}>考点知识图谱</p>
        <p className="text-[11px] text-[#9CA3AF] mt-0.5">
          拖拽平移 · 滚轮/双指缩放 · 点击节点查看考点详情
        </p>
      </div>

      <div
        ref={containerRef}
        className="flex-1 min-h-0 relative overflow-hidden cursor-grab active:cursor-grabbing select-none bg-[#FAFBFD]"
        style={{ touchAction: "none" }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {graph.points.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-[13px] text-[#7B8291]">
            该章节暂无考点
          </div>
        ) : (
          <svg width="100%" height="100%" className="block">
            <defs>
              <marker id="exam-arrow" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
                <path d="M0,0 L5,2.5 L0,5 Z" fill="#B0B5C0" />
              </marker>
              <marker id="exam-arrow-active" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
                <path d="M0,0 L5,2.5 L0,5 Z" fill="var(--exam-node-active-stroke)" />
              </marker>
            </defs>

            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
              {edges.map((e, i) => {
                const from = nodeMap.get(e.from);
                const to = nodeMap.get(e.to);
                if (!from || !to) return null;
                const x1 = from.x;
                const y1 = from.y + NODE_R;
                const x2 = to.x;
                const y2 = to.y - NODE_R;
                const active = selectedId === e.from || selectedId === e.to;
                const dimmed = selectedId !== null && !active;
                return (
                  <path
                    key={`${e.from}-${e.to}-${i}`}
                    d={edgePath(x1, y1, x2, y2)}
                    fill="none"
                    stroke={active ? "var(--exam-edge-active)" : "var(--exam-edge)"}
                    strokeWidth={active ? 1.25 : 0.75}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    opacity={dimmed ? 0.22 : 1}
                    style={{ transition: "opacity 0.15s" }}
                    markerEnd={active ? "url(#exam-arrow-active)" : "url(#exam-arrow)"}
                  />
                );
              })}
              {sortedNodes.map(node => renderNode(node))}
            </g>
          </svg>
        )}

        <div data-graph-control className="absolute top-3 right-3 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => {
              const el = containerRef.current;
              if (!el) return;
              const rect = el.getBoundingClientRect();
              zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.2);
            }}
            className="w-8 h-8 rounded-lg bg-white border border-[#EAEDF2] flex items-center justify-center text-[#41464F] hover:bg-[#EEF0FF] shadow-sm"
            title="放大"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              const el = containerRef.current;
              if (!el) return;
              const rect = el.getBoundingClientRect();
              zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 0.83);
            }}
            className="w-8 h-8 rounded-lg bg-white border border-[#EAEDF2] flex items-center justify-center text-[#41464F] hover:bg-[#EEF0FF] shadow-sm"
            title="缩小"
          >
            <Minus size={14} />
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 px-4 py-2.5 border-t border-[#EAEDF2] flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-3">
          {(["basic", "advanced", "challenge"] as const).map(d => (
            <span key={d} className="flex items-center gap-1.5 text-[10px] text-[#7B8291]">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ background: DIFFICULTY_FILL[d], border: `1.5px solid ${DIFFICULTY_RING[d]}` }}
              />
              {DIFFICULTY_LABEL[d]}
            </span>
          ))}
        </div>
        <span className="flex items-center gap-1.5 text-[10px] text-[#7B8291]">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#16A34A", border: "1.5px solid #fff", boxShadow: "0 0 0 1px #16A34A" }} />
          笔记扩展
        </span>
      </div>
    </div>
  );
}
