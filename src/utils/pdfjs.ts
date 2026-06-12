import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

let workerReady = false;

export function isPdfFile(file: File): boolean {
  if (file.type === "application/pdf") return true;
  return /\.pdf$/i.test(file.name);
}

export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name);
}

export async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!workerReady) {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    workerReady = true;
  }
  return pdfjs;
}

export async function readFileBytes(file: File): Promise<ArrayBuffer> {
  try {
    return await file.arrayBuffer();
  } catch {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error ?? new Error("无法读取文件"));
      reader.readAsArrayBuffer(file);
    });
  }
}

export async function openPdfDocument(file: File) {
  const pdfjs = await loadPdfJs();
  const data = await readFileBytes(file);
  try {
    return await pdfjs.getDocument({ data }).promise;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/worker|importScripts|module/i.test(message)) {
      throw new Error("PDF 引擎加载失败，请刷新页面后重试");
    }
    throw new Error(isImageFile(file) ? "请选择 PDF 文件，图片请从相册选取" : "无法打开该 PDF，请换一个文件试试");
  }
}
