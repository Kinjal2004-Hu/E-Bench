export type ApiParticipant = {
  participant?: {
    _id: string;
    fullName?: string;
    email?: string;
  };
  participantModel: "User" | "Consultant";
};

export type ApiChatMessage = {
  _id: string;
  sender: string;
  senderModel: "User" | "Consultant";
  content: string;
  timestamp: string;
};

export type ApiChat = {
  _id: string;
  title?: string;
  participants: ApiParticipant[];
  messages: ApiChatMessage[];
  lastMessage?: string;
  lastMessageAt?: string;
  updatedAt: string;
  createdAt: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

async function authedFetch(path: string, init?: RequestInit) {
  const token = getToken();
  if (!token) {
    throw new Error("Please login again");
  }

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
    } catch {
      // no-op
    }
    throw new Error(msg);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function fetchMyChats(): Promise<ApiChat[]> {
  return authedFetch("/api/chats", { method: "GET" });
}

export async function fetchChatById(chatId: string): Promise<ApiChat> {
  return authedFetch(`/api/chats/${chatId}`, { method: "GET" });
}

export async function deleteChatById(chatId: string): Promise<void> {
  await authedFetch(`/api/chats/${chatId}`, { method: "DELETE" });
}
