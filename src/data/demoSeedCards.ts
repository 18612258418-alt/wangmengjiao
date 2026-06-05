/**
 * AI-generated demo cards (Doubao vision + DeepSeek detail).
 * Regenerate: node scripts/generate-seed-cards.mjs
 */
import imgDemoGdp from "../imports/demo-gdp-economics.png";
import imgDemoCalculus from "../imports/demo-calculus-limit.png";
import imgDemoVonNeumann from "../imports/demo-von-neumann.png";
import type { CardData, FeedGroup } from "../types";
import generated from "./generatedSeedCards.json";

function buildCard(entry: typeof generated[0], img: string): CardData {
  const d = entry.doubao;
  return {
    id: entry.id,
    title: d.title.startsWith("记忆：") ? d.title : `记忆：${d.title}`,
    img,
    source: "evernote",
    time: entry.time,
    skill: d.skill as CardData["skill"],
    overview: d.overview,
    detailIntro: d.detailIntro,
    detailSections: d.detailSections,
    aiKeyPoints: d.aiKeyPoints,
    expandedKnowledge: d.expandedKnowledge,
    knowledgeTree: d.knowledgeTree?.map((n, i) => ({
      label: n.label,
      level: n.level ?? i + 1,
      current: n.current,
    })),
    nextAction: d.nextAction,
    hasAnnotations: true,
    unifiedDetail: entry.unifiedDetail,
  };
}

const gdpCard = buildCard(generated[0], imgDemoGdp);
const calcCard = buildCard(generated[1], imgDemoCalculus);
const vonCard = buildCard(generated[2], imgDemoVonNeumann);

export const DEMO_SEED_PATCH: Record<string, FeedGroup[]> = {
  math: [{
    date: "20260522",
    label: "新增了1个记忆",
    summary: "本次从极限概念经典问题入手，重点攻克曲边梯形面积求法：以直代曲、划分区间、取极限，理解定积分与导数两条极限分支的统一思想。",
    cards: [calcCard],
  }],
  other: [{
    date: "20260522",
    label: "新增了2个记忆",
    summary: "本次跨学科批注了两块内容：宏观经济学 GDP 核算中的净出口 NX 公式，以及计算机组成原理冯·诺依曼架构的控制单元与指令周期。",
    cards: [gdpCard, vonCard],
  }],
};

export const DEMO_SEED_PATCH_KEY = "seed-patch-v2-demo-cards";
