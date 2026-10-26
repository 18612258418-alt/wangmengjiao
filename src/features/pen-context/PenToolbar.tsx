import { Check, Eraser, Highlighter, Pencil, Undo2, Redo2 } from "lucide-react";
import { COLORS } from "../../data/initialData";
import type { PenToolKind } from "./types";

const toolBtn = (active: boolean, size: "md" | "sm" = "md") => {
  const dim = size === "sm" ? "w-8 h-8 rounded-[10px]" : "w-10 h-10 rounded-xl";
  return `${dim} flex items-center justify-center transition-colors ${
    active ? "bg-[#EEF0FF] text-[#4D5CFF]" : "hover:bg-[#F5F6FA] text-[#191919]"
  }`;
};

export interface PenToolbarProps {
  tool: PenToolKind;
  onToolChange: (tool: PenToolKind) => void;
  drawColor?: string;
  onColorChange?: (color: string) => void;
  showColorPicker?: boolean;
  onToggleColorPicker?: () => void;
  visible?: boolean;
  layout?: "floating" | "compact" | "inline";
  showUndoRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  showMarker?: boolean;
  className?: string;
}

export function PenToolbar({
  tool,
  onToolChange,
  drawColor = "#EF4444",
  onColorChange,
  showColorPicker = false,
  onToggleColorPicker,
  visible = true,
  layout = "floating",
  showUndoRedo = false,
  onUndo,
  onRedo,
  showMarker = true,
  className = "",
}: PenToolbarProps) {
  if (!visible) return null;

  if (layout === "compact" || layout === "inline") {
    return (
      <div
        className={`flex items-center gap-0.5 rounded-xl bg-[#F5F6FA] p-0.5 ${className}`}
      >
        <button
          type="button"
          onClick={() => onToolChange("pencil")}
          title="触控笔书写 / 圈选"
          className={toolBtn(tool === "pencil", "sm")}
          style={
            layout === "inline" && tool === "pencil"
              ? { background: "#fff", color: "#4D5CFF", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
              : undefined
          }
        >
          <Pencil size={14} />
        </button>
        {showMarker && (
          <button
            type="button"
            onClick={() => onToolChange("marker")}
            title="荧光笔"
            className={toolBtn(tool === "marker", "sm")}
            style={
              layout === "inline" && tool === "marker"
                ? { background: "#fff", color: "#4D5CFF", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                : undefined
            }
          >
            <Highlighter size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={() => onToolChange("eraser")}
          title="橡皮擦"
          className={toolBtn(tool === "eraser", "sm")}
          style={
            layout === "inline" && tool === "eraser"
              ? { background: "#fff", color: "#4D5CFF", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
              : undefined
          }
        >
          <Eraser size={14} />
        </button>
      </div>
    );
  }

  const panelCls =
    "bg-white rounded-2xl border border-[rgba(0,0,0,0.1)] shadow-[0px_5px_12px_rgba(0,0,0,0.1)] h-14 flex items-center px-2 gap-0.5";

  return (
    <div className={`${panelCls} pointer-events-auto px-3 gap-1 ${className}`}>
      {showUndoRedo && (
        <>
          <button type="button" onClick={onUndo} className={toolBtn(false)} title="撤销">
            <Undo2 size={17} />
          </button>
          <button type="button" onClick={onRedo} className={toolBtn(false)} title="重做">
            <Redo2 size={17} />
          </button>
          <div className="w-px h-6 bg-[#E9E9E9] mx-1 flex-shrink-0" />
        </>
      )}

      <button type="button" onClick={() => onToolChange("pencil")} className={toolBtn(tool === "pencil")} title="铅笔">
        <Pencil size={17} />
      </button>
      {showMarker && (
        <button type="button" onClick={() => onToolChange("marker")} className={toolBtn(tool === "marker")} title="荧光笔">
          <Highlighter size={17} />
        </button>
      )}
      <button type="button" onClick={() => onToolChange("eraser")} className={toolBtn(tool === "eraser")} title="橡皮擦">
        <Eraser size={17} />
      </button>

      {onColorChange && onToggleColorPicker && (
        <>
          <div className="w-px h-6 bg-[#E9E9E9] mx-1 flex-shrink-0" />
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={onToggleColorPicker}
              className="w-7 h-7 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 flex-shrink-0"
              style={{ background: drawColor }}
              title="颜色"
            />
            {showColorPicker && (
              <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl p-3 flex gap-2.5 z-20">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onColorChange(c)}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                    style={{ background: c }}
                  >
                    {drawColor === c && <Check size={12} className="text-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
