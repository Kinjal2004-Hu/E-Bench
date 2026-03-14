import { jsPDF } from "jspdf";
import { savePdfDownload } from "@/lib/downloadHistory";

export function exportTextAsPdf(fileName: string, title: string, lines: string[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 16;

  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, margin, y);
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const text = lines.join("\n");
  const wrapped = doc.splitTextToSize(text, maxWidth) as string[];

  for (const row of wrapped) {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(row, margin, y);
    y += lineHeight;
  }

  savePdfDownload({
    fileName,
    title,
    dataUri: doc.output("datauristring"),
  });

  doc.save(fileName);
}
