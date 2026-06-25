import type { CardData } from "../types";
import { FALLBACK_DETAILS } from "../data/initialData";
import { DEMO_SCREENSHOT_ANCHOR, DEMO_SCREENSHOT_CARD_ID } from "../features/screenshot/constants";

const DEMO_NOTES_INTRO = FALLBACK_DETAILS.notes.detailIntro;

/** 演示截图 / 同页 fallback 批注（含历史无 anchor 的重复项） */
export function isDemoScreenshotCard(card: CardData): boolean {
  if (card.id === DEMO_SCREENSHOT_CARD_ID) return true;
  const anchor = card.sourceAnchor;
  if (anchor?.kind === "screenshot" && anchor.fileId === DEMO_SCREENSHOT_ANCHOR.fileId) {
    return true;
  }
  const intro = (card.detailIntro || card.overview || "").trim();
  return intro === DEMO_NOTES_INTRO
    || intro.startsWith("你的笔记批注已收录");
}

function sampleHash(s: string): string {
  let h = 2166136261;
  const step = Math.max(1, Math.floor(s.length / 48));
  for (let i = 0; i < s.length; i += step) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** 同一张截图/批注图的指纹（data URL 有效载荷；静态资源 URL 不参与） */
function imageFingerprint(img: string): string | null {
  if (!img.startsWith("data:image")) return null;
  const comma = img.indexOf(",");
  const payload = comma >= 0 ? img.slice(comma + 1) : img;
  if (payload.length < 400) return null;
  const head = payload.slice(0, 1200);
  const tail = payload.slice(-400);
  return sampleHash(`${payload.length}:${head}:${tail}`);
}

/** 与 dedupe / upsert / 自动合并 一致的重复判定 key */
export function cardDedupeKey(card: CardData): string | null {
  if (card.contentType === "homework") return null;

  if (isDemoScreenshotCard(card)) {
    return `screenshot:${DEMO_SCREENSHOT_ANCHOR.fileId}`;
  }

  const anchor = card.sourceAnchor;
  if (anchor?.fileId) {
    return anchor.kind === "pdf"
      ? `pdf:${anchor.fileId}:${anchor.page ?? ""}`
      : `${anchor.kind}:${anchor.fileId}`;
  }

  // 文案 intro 优先于图片指纹：避免同批注一次用 data URL、一次用静态封面导致无法合并
  const intro = (card.detailIntro || card.overview || "").trim().slice(0, 36);
  if (intro) return `intro:${card.source}:${intro}`;

  const imgFp = imageFingerprint(card.img);
  if (imgFp) return `img:${card.source}:${imgFp}`;

  return `title:${card.source}:${card.title.trim().slice(0, 48)}`;
}

/** 展示层去重：与 cardDedupeKey 同一套规则 */
export function dedupeCardRefs(
  items: Array<{ card: CardData; date: string }>,
): Array<{ card: CardData; date: string }> {
  const byKey = new Map<string, { card: CardData; date: string }>();

  for (const item of items) {
    const key = cardDedupeKey(item.card);
    if (!key) {
      byKey.set(`__solo_${item.card.id}`, item);
      continue;
    }
    const prev = byKey.get(key);
    if (!prev || item.card.time.localeCompare(prev.card.time) > 0) {
      byKey.set(key, item);
    }
  }

  return [...byKey.values()].sort((a, b) => b.card.time.localeCompare(a.card.time));
}
