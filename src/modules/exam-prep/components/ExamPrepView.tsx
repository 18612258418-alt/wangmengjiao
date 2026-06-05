import { useCallback, useEffect, useMemo, useState } from "react";
import type { CardData, ExerciseSet, FeedGroup, SubjectData } from "../types";
import { getExamKnowledgeGraph, getPointById } from "../data/examKnowledgeGraphs";
import {
  resolveExamPointSelection,
  saveExamPointSelection,
} from "../utils/examPointSelection";
import { ExamGraphCanvas } from "./ExamGraphCanvas";
import { ExamPointDetailPanel } from "./ExamPointDetailPanel";
import { EXAM_PANEL_FILL, EXAM_PANEL_SHELL } from "./examPanelStyles";

export interface ExamPrepViewProps {
  subject: SubjectData;
  feedGroups?: FeedGroup[];
  exerciseSets?: ExerciseSet[];
  onOpenGenerate?: () => void;
  onOpenExercise?: (exerciseSet: ExerciseSet) => void;
  onOpenNote?: (card: CardData, date: string) => void;
  /** 无图谱学科时的占位文案 */
  emptyGraphMessage?: string;
}

export function ExamPrepView({
  subject,
  feedGroups = [],
  exerciseSets = [],
  onOpenGenerate,
  onOpenExercise: _onOpenExercise,
  onOpenNote,
  emptyGraphMessage = "该学科暂未配置考点图谱",
}: ExamPrepViewProps) {
  const graph = useMemo(() => getExamKnowledgeGraph(subject.id), [subject.id]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  useEffect(() => {
    if (!graph) {
      setSelectedPointId(null);
      return;
    }
    setSelectedPointId(resolveExamPointSelection(graph, subject.id));
  }, [graph, subject.id]);

  const handleSelectPoint = useCallback((id: string | null) => {
    if (!graph || !id) return;
    setSelectedPointId(id);
    saveExamPointSelection(subject.id, id);
  }, [graph, subject.id]);

  const selectedPoint = graph && selectedPointId
    ? getPointById(graph, selectedPointId)
    : null;

  const subjectExerciseSets = exerciseSets.filter(e => e.subjectId === subject.id);
  const showGenerateBar = onOpenGenerate && subjectExerciseSets.length === 0;

  if (!graph) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center px-8 text-center bg-[#F5F6FA]">
        <p className="text-[14px] text-[#7B8291]">{emptyGraphMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden bg-[#F5F6FA]">
        <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden px-6 pt-3 pb-8">
          <div className="flex flex-1 min-h-0 items-stretch gap-3">
            <div className="flex flex-1 min-w-0 min-h-0 flex-col">
              <ExamGraphCanvas
                graph={graph}
                selectedId={selectedPointId}
                onSelect={handleSelectPoint}
              />
            </div>

            <aside className={`flex-shrink-0 w-[360px] ${EXAM_PANEL_SHELL} ${EXAM_PANEL_FILL}`}>
              <ExamPointDetailPanel
                graph={graph}
                point={selectedPoint}
                subjectId={subject.id}
                subjectShort={subject.short}
                feedGroups={feedGroups}
                onSelectPoint={handleSelectPoint}
                onOpenNote={onOpenNote}
              />
            </aside>
          </div>
        </div>
      </div>

      {showGenerateBar && (
        <div className="flex-shrink-0 px-6 py-2 border-t border-[#EAEDF2] bg-white/80 flex items-center justify-between">
          <span className="text-[12px] text-[#7B8291]">可基于笔记生成练习题与难点讲解</span>
          <button
            type="button"
            onClick={onOpenGenerate}
            className="text-[12px] px-3 py-1.5 rounded-xl bg-[#4D5CFF] text-white hover:bg-[#3D4CEF] transition-colors"
            style={{ fontWeight: 600 }}
          >
            + 开始备考
          </button>
        </div>
      )}
    </div>
  );
}
