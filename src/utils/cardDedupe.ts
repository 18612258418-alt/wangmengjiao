import type { CardData } from "../types";

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

  const anchor = card.sourceAnchor;
  if (anchor?.fileId) {
    return anchor.kind === "pdf"
      ? `pdf:${anchor.fileId}:${anchor.page ?? ""}`
      : `${anchor.kind}:${anchor.fileId}`;
  }

  const imgFp = imageFingerprint(card.img);
  if (imgFp) return `img:${card.source}:${imgFp}`;

  const intro = (card.detailIntro || card.overview || "").trim().slice(0, 36);
  if (intro) return `intro:${card.source}:${intro}`;

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
