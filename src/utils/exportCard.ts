import { toBlob as htmlToBlob } from "html-to-image";
import type { CardData } from "../types";
import { sourceLabel } from "../shared/SourceIcon";
import { parseSections } from "./parseSections";

async function saveBlob(blob: Blob, filename: string, mimeDescription: string, mimeType: string, extension: string) {
  const anyWindow = window as unknown as {
    showSaveFilePicker?: (opts: {
      suggestedName: string;
      types: { description: string; accept: Record<string, string[]> }[];
    }) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }>;
  };
  if (typeof anyWindow.showSaveFilePicker === "function") {
    try {
      const handle = await anyWindow.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: mimeDescription, accept: { [mimeType]: [extension] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      console.warn("[export] showSaveFilePicker failed, falling back", err);
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportCardImage(card: CardData, contentEl: HTMLElement) {
  const original = {
    overflow: contentEl.style.overflow,
    height: contentEl.style.height,
    maxHeight: contentEl.style.maxHeight,
  };
  contentEl.style.overflow = "visible";
  contentEl.style.height = "auto";
  contentEl.style.maxHeight = "none";

  const safeTitle = (card.title || "memory").replace(/[/\\?%*:|"<>]/g, "-").slice(0, 80);
  const filename = `${safeTitle}.png`;

  try {
    const fullWidth = contentEl.scrollWidth;
    const fullHeight = contentEl.scrollHeight;

    const blob = await htmlToBlob(contentEl, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
      width: fullWidth,
      height: fullHeight,
      style: {
        overflow: "visible",
        maxHeight: "none",
        height: `${fullHeight}px`,
        width: `${fullWidth}px`,
        transform: "none",
      },
    });
    if (!blob) {
      console.error("[exportCardImage] htmlToBlob returned null");
      alert("导出失败：图片生成异常，请重试");
      return;
    }

    await saveBlob(blob, filename, "PNG 图片", "image/png", ".png");
  } catch (err) {
    console.error("[exportCardImage] failed", err);
    const msg = err instanceof Error ? err.message : String(err);
    alert(`导出失败：${msg || "未知错误"}\n请重试或反馈给开发者`);
  } finally {
    contentEl.style.overflow = original.overflow;
    contentEl.style.height = original.height;
    contentEl.style.maxHeight = original.maxHeight;
  }
}

export async function exportCardMarkdown(card: CardData, unifiedContent: string) {
  const lines: string[] = [
    `# ${card.title}`,
    `> 来源：${sourceLabel(card.source ?? "")} · ${card.time}`,
    "",
  ];
  if (unifiedContent) {
    const sections = parseSections(unifiedContent);
    for (const sec of sections) {
      lines.push(`## ${sec.title}`);
      lines.push(sec.content.replace(/\[\[(.+?)\]\]/g, "$1"));
      lines.push("");
    }
  }
  if (card.aiKeyPoints?.length) {
    lines.push("## AI 提炼重点");
    card.aiKeyPoints.forEach(p => lines.push(`- ${p}`));
    lines.push("");
  }
  if (card.hasAnnotations === true && card.detailSections?.length) {
    lines.push("## 圈选重点");
    if (card.detailIntro) lines.push(`> ${card.detailIntro}`);
    card.detailSections.forEach((sec, i) => {
      lines.push(`### ${i + 1}. ${sec.title}`);
      sec.items.forEach(item => lines.push(`- ${item}`));
    });
    lines.push("");
  }
  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const safeTitle = (card.title || "memory").replace(/[/\\?%*:|"<>]/g, "-").slice(0, 80);
  await saveBlob(blob, `${safeTitle}.md`, "Markdown 文件", "text/markdown", ".md");
}
