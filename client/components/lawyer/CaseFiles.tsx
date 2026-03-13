"use client";

import { useState, useRef } from "react";
import type { CaseFile } from "@/data/mockLawyerData";

type CaseFilesProps = {
  files: CaseFile[];
};

export default function CaseFiles({ files: initialFiles }: CaseFilesProps) {
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setTimeout(() => {
      const ext = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
      setFiles((prev) => [
        {
          id: `cf-${Date.now()}`,
          fileName: file.name,
          clientName: "—",
          uploadDate: new Date().toISOString().split("T")[0],
          fileSize: `${(file.size / 1024).toFixed(0)} KB`,
          fileType: ext,
        },
        ...prev,
      ]);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }, 600);
  };

  return (
    <div
      className="rounded-lg shadow-sm border overflow-hidden"
      style={{ borderColor: "#c1b77a", background: "#f0e8c3" }}
    >
      {/* Upload bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "#c1b77a", background: "#d4c88a" }}
      >
        <span className="text-sm font-semibold" style={{ color: "#2f3e24" }}>Case Documents</span>
        <label
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-white text-xs font-medium cursor-pointer transition-colors"
          style={{ background: "#757f35" }}
        >
          {uploading ? "Uploading…" : "+ Upload File"}
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept=".pdf,.doc,.docx,.jpg,.png"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr style={{ background: "#d4c88a", color: "#2f3e24" }}>
              <th className="text-left px-4 py-3 font-semibold">File Name</th>
              <th className="text-left px-4 py-3 font-semibold">Type</th>
              <th className="text-left px-4 py-3 font-semibold">Client</th>
              <th className="text-left px-4 py-3 font-semibold">Date</th>
              <th className="text-left px-4 py-3 font-semibold">Size</th>
              <th className="text-left px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.id} className="border-t align-middle" style={{ borderColor: "#c1b77a" }}>
                <td className="px-4 py-3 font-medium" style={{ color: "#2f3e24" }}>{file.fileName}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-[11px] px-2 py-0.5 rounded font-bold tracking-wide"
                    style={{ background: "#d4c88a", color: "#2f3e24" }}
                  >
                    {file.fileType}
                  </span>
                </td>
                <td className="px-4 py-3" style={{ color: "#5a5920" }}>{file.clientName}</td>
                <td className="px-4 py-3" style={{ color: "#5a5920" }}>{file.uploadDate}</td>
                <td className="px-4 py-3" style={{ color: "#5a5920" }}>{file.fileSize}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-md text-white text-xs font-medium transition-colors"
                    style={{ background: "#757f35" }}
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
