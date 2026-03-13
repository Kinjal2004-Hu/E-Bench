"use client";

import CaseFiles from "@/components/lawyer/CaseFiles";
import { caseFiles } from "@/data/mockLawyerData";

export default function CaseFilesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#2f3e24" }}>Case Files</h1>
        <p className="text-sm mt-1" style={{ color: "#5a5920" }}>
          Upload, download, and manage case documents for all clients.
        </p>
      </div>
      <CaseFiles files={caseFiles} />
    </div>
  );
}
