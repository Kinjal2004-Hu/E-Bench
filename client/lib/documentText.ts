const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const OCR_TEXT_MIN_LENGTH = 50;
const BACKEND_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function extensionOf(fileName: string): string {
  const lower = fileName.toLowerCase();
  const idx = lower.lastIndexOf(".");
  return idx >= 0 ? lower.slice(idx + 1) : "";
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as {
    getDocument: (src: { data: Uint8Array }) => { promise: Promise<{ numPages: number; getPage: (page: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str?: string }> }>; getViewport: (opts: { scale: number }) => { width: number; height: number }; render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> } }> }> };
    GlobalWorkerOptions: { workerSrc: string };
    version: string;
  };

  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;

  const chunks: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const text = content.items.map((it) => it.str || "").join(" ");
    if (text.trim()) chunks.push(text.trim());
  }

  const extracted = chunks.join("\n\n");

  if (extracted.trim().length < OCR_TEXT_MIN_LENGTH && pdf.numPages > 0) {
    return ocrPdfPages(pdf, pdfjs, file.name);
  }

  return extracted;
}

async function ocrPdfPages(pdf: any, pdfjs: any, fileName: string): Promise<string> {
  const chunks: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png", 0.9)
    );
    if (!blob) continue;

    const formData = new FormData();
    formData.append("image", blob, `page_${p}.png`);

    try {
      const res = await fetch(`${BACKEND_API}/api/extension/ocr`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text?.trim()) chunks.push(data.text.trim());
      }
    } catch {
      // OCR failed for this page, continue silently
    }
  }

  const ocrText = chunks.join("\n\n");
  if (ocrText.trim().length >= OCR_TEXT_MIN_LENGTH) {
    return ocrText;
  }

  return extractedTextFallback(fileName, ocrText);
}

function extractedTextFallback(fileName: string, ocrText: string): string {
  const msg = `[Scanned document: ${fileName}]${
    ocrText ? `\nOCR extracted:\n${ocrText}` : "\nNo text could be extracted from this scanned document."
  }`;
  return msg;
}

async function extractDocxText(file: File): Promise<string> {
  const mammothModule = (await import("mammoth")) as unknown as {
    extractRawText: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
  };

  const buffer = await file.arrayBuffer();
  const result = await mammothModule.extractRawText({ arrayBuffer: buffer });
  return result.value || "";
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File is too large. Max size is 20MB.");
  }

  const ext = extensionOf(file.name);

  if (ext === "pdf") {
    return extractPdfText(file);
  }

  if (ext === "docx") {
    return extractDocxText(file);
  }

  if (ext === "txt" || ext === "md") {
    return file.text();
  }

  if (ext === "doc") {
    throw new Error("Legacy .doc is not supported in-browser. Please upload .docx, .pdf, or .txt.");
  }

  if (ext === "png" || ext === "jpg" || ext === "jpeg") {
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(`${BACKEND_API}/api/extension/ocr`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        return data.text?.trim() || "[No text detected in image]";
      }
    } catch {
      // fall through
    }
    return `[Image uploaded: ${file.name}]`;
  }

  throw new Error("Unsupported file format. Please upload PDF, DOCX, TXT, MD, PNG, or JPG.");
}
