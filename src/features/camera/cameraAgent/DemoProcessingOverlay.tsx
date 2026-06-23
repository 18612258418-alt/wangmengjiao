import { Check, Loader2 } from "lucide-react";
import type { DemoProcessStep } from "./demoCameraPipeline";

interface Props {
  step: DemoProcessStep;
}

const STEPS: { id: DemoProcessStep; label: string }[] = [
  { id: "edge", label: "边缘检测" },
  { id: "warp", label: "透视矫正" },
  { id: "ai", label: "AI 理解" },
];

function stepIndex(s: DemoProcessStep): number {
  return STEPS.findIndex(x => x.id === s);
}

/** 底部进度条：不遮罩取景画面，保持实时预览可见 */
export function DemoProcessingOverlay({ step }: Props) {
  const activeIdx = stepIndex(step);

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 pointer-events-none px-4 pb-4">
      <div className="mx-auto max-w-sm rounded-2xl border border-white/15 bg-black/55 backdrop-blur-md px-4 py-3 shadow-lg">
        <p className="text-white/90 text-[13px] font-medium mb-2.5 text-center">正在整理资料</p>
        <div className="flex items-center justify-between gap-2">
          {STEPS.map((s, i) => {
            const done = i < activeIdx;
            const active = i === activeIdx;
            return (
              <div key={s.id} className="flex flex-1 flex-col items-center gap-1 min-w-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  done ? "bg-[#4D5CFF]" : active ? "bg-white/20" : "bg-white/10"
                }`}>
                  {done
                    ? <Check size={13} className="text-white" />
                    : active
                      ? <Loader2 size={13} className="text-white animate-spin" />
                      : <span className="text-white/35 text-[10px]">{i + 1}</span>}
                </div>
                <span className={`text-[10px] text-center leading-tight truncate w-full ${
                  active ? "text-white" : done ? "text-white/70" : "text-white/35"
                }`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
