"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  MessageSquare, SendHorizontal, X, Clock,
} from "lucide-react";
import { useVideoCall } from "@/hooks/useVideoCall";

const SESSION_DURATION = 30 * 60;

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function VideoSessionPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lawyerName = searchParams.get("lawyer") ?? "Lawyer";
  const role = (searchParams.get("role") ?? "user") as "user" | "lawyer";

  const {
    localVideoRef, remoteVideoRef, isConnected, isMuted, isCameraOff,
    messages, error, toggleMute, toggleCamera, sendMessage, endCall,
  } = useVideoCall(roomId, role);

  /* ── 30-min countdown ── */
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [sessionEnded, setSessionEnded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); setSessionEnded(true); endCall(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [endCall]);

  /* ── In-call chat ── */
  const [chatOpen, setChatOpen] = useState(false);
  const [msgInput, setMsgInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = useCallback(() => {
    if (!msgInput.trim() || sessionEnded) return;
    sendMessage(msgInput.trim());
    setMsgInput("");
  }, [msgInput, sendMessage, sessionEnded]);

  const handleEnd = useCallback(() => {
    endCall();
    router.replace(role === "lawyer" ? "/lawyer-dashboard" : "/dashboard");
  }, [endCall, router, role]);

  const isWarning = timeLeft > 0 && timeLeft <= 5 * 60;
  const peerLabel = role === "lawyer" ? "Client" : lawyerName;

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
        <div>
          <h1 className="font-semibold text-lg">Video Consultation</h1>
          <p className="text-sm text-gray-400">with {peerLabel}</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono font-semibold
          ${sessionEnded ? "bg-red-900 text-red-300" : isWarning ? "bg-amber-900 text-amber-300 animate-pulse" : "bg-gray-800 text-green-300"}`}>
          <Clock size={14} />
          {sessionEnded ? "Session Ended" : formatTime(timeLeft)}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-yellow-400 animate-pulse"}`} />
          {isConnected ? "Connected" : "Connecting…"}
        </div>
      </div>

      {/* Video + chat sidebar */}
      <div className="flex-1 relative flex bg-gray-950">
        {/* Remote video */}
        <div className="flex-1 relative">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center mb-3 mx-auto text-3xl font-bold">
                  {peerLabel.charAt(0).toUpperCase()}
                </div>
                <p className="text-gray-400 text-sm">
                  {sessionEnded ? "Session has ended" : `Waiting for ${peerLabel} to join…`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Local video PiP */}
        <div className="absolute bottom-4 right-4 w-40 h-28 rounded-xl overflow-hidden border-2 border-gray-700 shadow-lg">
          <video ref={localVideoRef} autoPlay playsInline muted
            className={`w-full h-full object-cover ${isCameraOff ? "opacity-0" : ""}`} />
          {isCameraOff && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <VideoOff size={20} className="text-gray-400" />
            </div>
          )}
        </div>

        {/* Chat sidebar */}
        {chatOpen && (
          <div className="w-80 flex flex-col bg-gray-900 border-l border-gray-800">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <span className="font-semibold text-sm">In-call Chat</span>
              <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={`max-w-[85%] px-3 py-2 rounded-xl text-sm
                  ${m.sender === role ? "ml-auto bg-blue-700 text-white" : "bg-gray-700 text-gray-100"}`}>
                  {m.message}
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>
            <div className="p-3 border-t border-gray-800 flex gap-2">
              <input type="text" value={msgInput} onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()} disabled={sessionEnded}
                placeholder={sessionEnded ? "Session ended" : "Type…"}
                className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none placeholder-gray-500 disabled:opacity-50" />
              <button onClick={handleSend} disabled={sessionEnded || !msgInput.trim()}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-colors">
                <SendHorizontal size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border-t border-gray-800 py-4 flex items-center justify-center gap-4">
        <CtrlBtn onClick={toggleMute} active={isMuted}
          activeIcon={<MicOff size={20} />} inactiveIcon={<Mic size={20} />}
          label={isMuted ? "Unmute" : "Mute"} />
        <CtrlBtn onClick={toggleCamera} active={isCameraOff}
          activeIcon={<VideoOff size={20} />} inactiveIcon={<Video size={20} />}
          label={isCameraOff ? "Start Video" : "Stop Video"} />
        <button onClick={() => setChatOpen((o) => !o)}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs transition-colors
            ${chatOpen ? "bg-blue-700 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
          <MessageSquare size={20} /> Chat
        </button>
        <button onClick={handleEnd}
          className="flex flex-col items-center gap-1 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs transition-colors">
          <PhoneOff size={22} /> End Call
        </button>
      </div>

      {error && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-700 text-white text-sm px-5 py-2 rounded-lg shadow">
          {error}
        </div>
      )}

      {/* Session ended overlay */}
      {sessionEnded && (
        <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center">
          <div className="bg-gray-900 rounded-2xl p-8 text-center max-w-sm shadow-2xl">
            <div className="w-16 h-16 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-red-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Session Ended</h2>
            <p className="text-gray-400 text-sm mb-6">Your 30-minute consultation has ended.</p>
            <button onClick={() => router.replace(role === "lawyer" ? "/lawyer-dashboard" : "/dashboard")}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-colors">
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CtrlBtn({ onClick, active, activeIcon, inactiveIcon, label }: {
  onClick: () => void; active: boolean;
  activeIcon: React.ReactNode; inactiveIcon: React.ReactNode; label: string;
}) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs transition-colors
        ${active ? "bg-red-800 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
      {active ? activeIcon : inactiveIcon}{label}
    </button>
  );
}
