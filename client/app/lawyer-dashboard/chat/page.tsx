"use client";

import ChatInterface from "@/components/lawyer/ChatInterface";
import { clientChats } from "@/data/mockLawyerData";

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#2f3e24" }}>Client Chat</h1>
        <p className="text-sm mt-1" style={{ color: "#5a5920" }}>
          Communicate with your clients directly through the platform.
        </p>
      </div>
      <ChatInterface chats={clientChats} />
    </div>
  );
}
