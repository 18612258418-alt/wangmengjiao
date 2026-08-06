import { unzipSync } from "fflate";

export interface ParsedPptxPage {
  page: number;
  title: string;
  text: string;
  notes?: string;
}

export interface ParsedPptxDocument {
  title: string;
  pageCount: number;
  pages: ParsedPptxPage[];
  coverDataUrl?: string;
}

function decodeXmlText(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function textRuns(xml: string) {
  const values = Array.from(xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g))
    .map(match => decodeXmlText(match[1]))
    .filter(Boolean);
  return values.filter((value, index) => index === 0 || value !== values[index - 1]);
}

function xmlText(file?: Uint8Array) {
  return file ? new TextDecoder("utf-8").decode(file) : "";
}

function bytesToDataUrl(bytes: Uint8Array, mimeType: string): Promise<string> {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return Promise.resolve(`data:${mimeType};base64,${btoa(binary)}`);
}

function imageMime(path: string) {
  if (/\.png$/i.test(path)) return "image/png";
  if (/\.webp$/i.test(path)) return "image/webp";
  if (/\.gif$/i.test(path)) return "image/gif";
  return "image/jpeg";
}

export async function parsePptxFile(file: File): Promise<ParsedPptxDocument> {
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const slidePaths = Object.keys(archive)
    .map(path => ({ path, match: path.match(/^ppt\/slides\/slide(\d+)\.xml$/) }))
    .filter((item): item is { path: string; match: RegExpMatchArray } => !!item.match)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]));

  if (slidePaths.length === 0) {
    throw new Error("没有在 PPTX 中找到可读取的幻灯片页面。");
  }

  const pages = slidePaths.map(({ path, match }) => {
    const page = Number(match[1]);
    const runs = textRuns(xmlText(archive[path]));
    const notesRuns = textRuns(xmlText(archive[`ppt/notesSlides/notesSlide${page}.xml`]))
      .filter(value => value !== String(page));
    const title = runs[0] || `第 ${page} 页`;
    return {
      page,
      title,
      text: runs.join("\n").slice(0, 5000),
      ...(notesRuns.length ? { notes: notesRuns.join("\n").slice(0, 2500) } : {}),
    };
  });

  const coreRuns = textRuns(xmlText(archive["docProps/core.xml"]));
  const title = coreRuns[0] || file.name.replace(/\.pptx$/i, "");
  const coverPath = Object.keys(archive).find(path =>
    /^ppt\/media\/image\d+\.(png|jpe?g|webp|gif)$/i.test(path),
  );
  const coverDataUrl = coverPath
    ? await bytesToDataUrl(archive[coverPath], imageMime(coverPath)).catch(() => undefined)
    : undefined;

  return {
    title,
    pageCount: pages.length,
    pages,
    ...(coverDataUrl ? { coverDataUrl } : {}),
  };
}

export function pptxDocumentText(document: ParsedPptxDocument) {
  return [
    "【PPT 文档级信息】",
    `文件主题：${document.title}`,
    `总页数：${document.pageCount}`,
    "以下内容按原始页码排列。请先理解整份课件，再融合连续页面，不要把每页机械地当成独立知识点。",
    ...document.pages.map(page => [
      `\n【P${page.page}】`,
      `页面标题：${page.title}`,
      page.text,
      page.notes ? `演讲者备注：${page.notes}` : "",
    ].filter(Boolean).join("\n")),
  ].join("\n").slice(0, 60000);
}
