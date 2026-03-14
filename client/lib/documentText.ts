const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function extensionOf(fileName: string): string {
  const lower = fileName.toLowerCase();
  const idx = lower.lastIndexOf(".");
  return idx >= 0 ? lower.slice(idx + 1) : "";
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as {
    getDocument: (src: { data: Uint8Array }) => { promise: Promise<{ numPages: number; getPage: (page: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str?: string }> }> }> }> };
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

  return chunks.join("\n\n");
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

  throw new Error("Unsupported file format. Please upload PDF, DOCX, TXT, or MD.");
}
