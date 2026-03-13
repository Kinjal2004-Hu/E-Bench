"use client";

import { useEffect, useState } from "react";
import CaseFiles from "@/components/lawyer/CaseFiles";
import { fetchCaseFiles } from "@/lib/lawyerApi";
import type { CaseFile } from "@/lib/lawyerApi";

export default function CaseFilesPage() {
  const [files, setFiles] = useState<CaseFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCaseFiles()
      .then(setFiles)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load case files.")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm py-8 text-center" style={{ color: "#7a7040" }}>Loading…</p>;
  if (error) return <p className="text-sm py-8 text-center text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#2f3e24" }}>Case Files</h1>
        <p className="text-sm mt-1" style={{ color: "#5a5920" }}>
          Upload, download, and manage case documents for all clients.
        </p>
      </div>
      <CaseFiles files={files} />
    </div>
  );
}
