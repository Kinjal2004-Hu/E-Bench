import ConsultationTable from "@/components/lawyer/ConsultationTable";
import { consultationRequests } from "@/data/mockLawyerData";

export default function ConsultationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#2f3e24" }}>Consultation Requests</h1>
        <p className="text-sm mt-1" style={{ color: "#5a5920" }}>
          Review incoming client requests and accept or reject them.
        </p>
      </div>
      <ConsultationTable requests={consultationRequests} />
    </div>
  );
}
