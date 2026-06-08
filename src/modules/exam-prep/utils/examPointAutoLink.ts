// ─── 备考闭环编排：挂靠现有考点，挂不上就反向抽取新考点 ──────────────────────
// 流程（每次上传笔记后台触发）：
//   1. 对照「内置 + 用户已抽取」的合并图谱，尝试把笔记挂靠到已有考点（白名单挂靠）。
//   2. 挂上了 → 直接返回这些考点 id。
//   3. 挂不上 → 判断笔记是否讲了一个图谱里没有的新考点，是则建点并挂靠到新点。
// 返回值写入 card.linkedExamPointIds，使笔记出现在对应考点的「相关笔记」里。

import { getExamKnowledgeGraph } from "../data/examKnowledgeGraphs";
import { addUserExamPoint, getMergedExamGraph } from "../data/userExamPoints";
import {
  buildExamPointLinkPrompt,
  parseExamPointLinkResponse,
  type ExamPointLinkInput,
  type ExamPointLlmCall,
} from "../prompts/examPointLink";
import {
  buildExamPointProposalPrompt,
  parseExamPointProposalResponse,
} from "../prompts/examPointProposal";

export async function linkOrProposeExamPoints(
  input: ExamPointLinkInput,
  callLlm: ExamPointLlmCall,
): Promise<string[]> {
  if (input.contentType === "homework") return [];

  // 只在"有内置图谱骨架"的学科上工作，避免在自定义学科里凭空造点
  const base = getExamKnowledgeGraph(input.subjectId);
  if (!base) return [];

  const graph = getMergedExamGraph(input.subjectId) ?? base;

  // 1. 挂靠已有考点（白名单 = 合并图谱，能挂到用户之前抽取的点上）
  try {
    const raw = await callLlm(buildExamPointLinkPrompt(graph, input));
    const linkedIds = parseExamPointLinkResponse(raw, graph).linkedExamPointIds;
    if (linkedIds.length > 0) return linkedIds;
  } catch (err) {
    console.warn("[examPointAutoLink] 考点挂靠失败", err);
    // 挂靠失败也继续尝试反向抽取
  }

  // 2. 反向抽取新考点
  try {
    const raw = await callLlm(buildExamPointProposalPrompt(graph, input));
    const proposal = parseExamPointProposalResponse(raw);
    if (!proposal) return [];
    const newId = addUserExamPoint(input.subjectId, {
      label: proposal.label,
      chapter: proposal.chapter,
      examPoints: proposal.examPoints,
      answerStrategy: proposal.answerStrategy,
      difficulty: proposal.difficulty,
      summary: proposal.evidence || proposal.examPoints[0],
    });
    return [newId];
  } catch (err) {
    console.warn("[examPointAutoLink] 反向抽取新考点失败", err);
    return [];
  }
}
