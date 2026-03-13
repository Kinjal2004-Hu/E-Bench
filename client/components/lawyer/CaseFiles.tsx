"use client";

import { useState, useRef } from "react";
import { uploadCaseFile, deleteCaseFile, getCaseFileDownloadUrl } from "@/lib/lawyerApi";
import type { CaseFile } from "@/lib/lawyerApi";

type CaseFilesProps = {
  files: CaseFile[];
};

export default function CaseFiles({ files: initialFiles }: CaseFilesProps) {
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [clientName, setClientName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!clientName.trim()) {
      setUploadError("Enter a client name before uploading.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const created = await uploadCaseFile(file, clientName.trim());
      setFiles((prev) => [created, ...prev]);
      setClientName("");
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await deleteCaseFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

  return (
    <div
      className="rounded-lg shadow-sm border overflow-hidden"
      style={{ borderColor: "#c1b77a", background: "#f0e8c3" }}
    >
      {/* Upload bar */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: "#c1b77a", background: "#d4c88a" }}
      >
        <span className="text-sm font-semibold shrink-0" style={{ color: "#2f3e24" }}>Case Documents</span>
        <input
          type="text"
          placeholder="Client name…"
          value={clientName}
          onChange={(e) => { setClientName(e.target.value); setUploadError(""); }}
          className="rounded-md border px-2 py-1 text-sm outline-none flex-1 min-w-0"
          style={{ borderColor: "#c1b77a", background: "#fdf8e8", color: "#2f3e24" }}
        />
        <label
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-white text-xs font-medium cursor-pointer transition-colors shrink-0"
          style={{ background: uploading ? "#999" : "#757f35" }}
        >
          {uploading ? "Uploading…" : "+ Upload File"}
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept=".pdf,.doc,.docx,.jpg,.png,.txt"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>
      {uploadError && (
        <p className="px-4 py-2 text-xs text-red-600 bg-red-50">{uploadError}</p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr style={{ background: "#d4c88a", color: "#2f3e24" }}>
              <th className="text-left px-4 py-3 font-semibold">File Name</th>
              <th className="text-left px-4 py-3 font-semibold">Type</th>
              <th className="text-left px-4 py-3 font-semibold">Client</th>
              <th className="text-left px-4 py-3 font-semibold">Date</th>
              <th className="text-left px-4 py-3 font-semibold">Size</th>
              <th className="text-left px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm" style={{ color: "#7a7040" }}>
                  No case files uploaded yet.
                </td>
              </tr>
            ) : (
              files.map((file) => (
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
                    <div className="flex gap-2">
                      <a
                        href={getCaseFileDownloadUrl(file.id)}
                        download={file.fileName}
                        className="px-3 py-1.5 rounded-md text-white text-xs font-medium transition-colors"
                        style={{ background: "#757f35" }}
                      >
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(file.id)}
                        className="px-3 py-1.5 rounded-md bg-red-500 text-white text-xs font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
