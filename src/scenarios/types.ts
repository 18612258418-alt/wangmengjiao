import type { FeedGroup, SubjectData } from "../types";
export type ScenarioId = "student" | "common";
export type ScenarioPackage = {
  id: ScenarioId;
  workspaceLabel: string;
  tabs: Partial<Record<"notes" | "homework" | "reviewPlan" | "exam" | "sources", string>>;
  hiddenTabs?: Array<"notes" | "homework" | "reviewPlan" | "exam" | "sources">;
  workspaces?: SubjectData[];
  memories?: Record<string, FeedGroup[]>;
  userProfile: { eyebrow:string; title:string; description:string; goalLabel:string; goal:string; goalDetail:string; statusTitle:string; status:Array<{label:string;value:string;detail:string}>; methodsTitle:string; methods:string[]; traitsTitle:string; traits:string[]; warning:string; evidence:string[] };
};
