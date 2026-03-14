export type PdfDownloadRecord = {
  id: string;
  fileName: string;
  title: string;
  createdAt: string;
  dataUri: string;
};

const STORAGE_KEY = "ebench_pdf_downloads";
const MAX_STORED_PDFS = 15;

function hasWindow() {
  return typeof window !== "undefined";
}

export function getPdfDownloads(): PdfDownloadRecord[] {
  if (!hasWindow()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as PdfDownloadRecord[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item) =>
      item &&
      typeof item.id === "string" &&
      typeof item.fileName === "string" &&
      typeof item.title === "string" &&
      typeof item.createdAt === "string" &&
      typeof item.dataUri === "string"
    );
  } catch {
    return [];
  }
}

export function savePdfDownload(record: Omit<PdfDownloadRecord, "id" | "createdAt">) {
  if (!hasWindow()) return;

  const nextRecord: PdfDownloadRecord = {
    id: `pdf_${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...record,
  };

  const existing = getPdfDownloads();
  const next = [nextRecord, ...existing].slice(0, MAX_STORED_PDFS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function removePdfDownload(id: string) {
  if (!hasWindow()) return;

  const next = getPdfDownloads().filter((item) => item.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function redownloadPdf(record: PdfDownloadRecord) {
  if (!hasWindow()) return;

  const anchor = document.createElement("a");
  anchor.href = record.dataUri;
  anchor.download = record.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}