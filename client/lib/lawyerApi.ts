import { getToken } from "./chatApi";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function lawyerFetch(path: string, init?: RequestInit) {
  const token = getToken();
  if (!token) throw new Error("Please login again");

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    let msg = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      msg = data.error || data.message || msg;
    } catch { /* no-op */ }
    throw new Error(msg);
  }

  if (response.status === 204) return null;
  return response.json();
}

// ── Types ────────────────────────────────────────────────────────────────────

export type DashboardStats = {
  todaysAppointments: number;
  pendingRequests: number;
  totalClients: number;
  totalEarnings: number;
};

export type LawyerProfile = {
  _id?: string;
  fullName: string;
  email?: string;
  specialization: string;
  professionalSummary: string;
  experience: string;
  languages: string;
  consultationFee: string;
  availability: string;
  photoUrl: string;
};

export type Appointment = {
  _id: string;
  clientName: string;
  consultationType: "Chat" | "Video" | "Office Meeting" | "Phone Call";
  caseType: string;
  date: string;
  time: string;
  status: "confirmed" | "rescheduled" | "pending";
};

export type ConsultationRequest = {
  _id: string;
  clientName: string;
  legalCategory: string;
  requestedDate: string;
  message: string;
  status: "pending" | "accepted" | "rejected";
};

export type CaseFile = {
  id: string;
  fileName: string;
  clientName: string;
  uploadDate: string;
  fileSize: string;
  fileType: string;
};

// ── API calls ────────────────────────────────────────────────────────────────

export async function fetchStats(): Promise<DashboardStats> {
  return lawyerFetch("/api/lawyer/stats");
}

export async function fetchLawyerProfile(): Promise<LawyerProfile> {
  return lawyerFetch("/api/lawyer/profile");
}

export async function updateLawyerProfile(data: Partial<LawyerProfile>): Promise<LawyerProfile> {
  return lawyerFetch("/api/lawyer/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function fetchAppointments(date?: string): Promise<Appointment[]> {
  const q = date ? `?date=${date}` : "";
  return lawyerFetch(`/api/lawyer/appointments${q}`);
}

export async function createAppointment(data: Omit<Appointment, "_id">): Promise<Appointment> {
  return lawyerFetch("/api/lawyer/appointments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAppointmentStatus(
  id: string,
  status: Appointment["status"]
): Promise<Appointment> {
  return lawyerFetch(`/api/lawyer/appointments/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteAppointment(id: string): Promise<void> {
  await lawyerFetch(`/api/lawyer/appointments/${id}`, { method: "DELETE" });
}

export async function fetchConsultationRequests(status?: string): Promise<ConsultationRequest[]> {
  const q = status ? `?status=${status}` : "";
  return lawyerFetch(`/api/lawyer/consultation-requests${q}`);
}

export async function updateConsultationStatus(
  id: string,
  status: "accepted" | "rejected"
): Promise<ConsultationRequest> {
  return lawyerFetch(`/api/lawyer/consultation-requests/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function fetchCaseFiles(): Promise<CaseFile[]> {
  return lawyerFetch("/api/lawyer/case-files");
}

export async function uploadCaseFile(file: File, clientName: string): Promise<CaseFile> {
  const token = getToken();
  if (!token) throw new Error("Please login again");

  const form = new FormData();
  form.append("file", file);
  form.append("clientName", clientName);

  const response = await fetch(`${API_BASE}/api/lawyer/case-files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!response.ok) {
    let msg = `Upload failed (${response.status})`;
    try {
      const data = await response.json();
      msg = data.error || msg;
    } catch { /* no-op */ }
    throw new Error(msg);
  }
  return response.json();
}

export function getCaseFileDownloadUrl(fileId: string): string {
  const token = getToken();
  return `${API_BASE}/api/lawyer/case-files/${encodeURIComponent(fileId)}/download?token=${token}`;
}

export async function deleteCaseFile(fileId: string): Promise<void> {
  await lawyerFetch(`/api/lawyer/case-files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
}
