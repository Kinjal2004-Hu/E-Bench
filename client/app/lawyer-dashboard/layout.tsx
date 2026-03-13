"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Phone, X, Video } from "lucide-react";
import LawyerSidebarNav from "@/components/lawyer/Sidebar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type IncomingCall = {
  roomId: string;
  callerName?: string;
};

export default function LawyerDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isRinging, setIsRinging] = useState(false);

  // Register as lawyer listener for incoming calls (persistent across all sub-pages)
  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token") || localStorage.getItem("ebench_token") || ""
        : "";
    if (!token) return;

    const socket = io(API_BASE, { auth: { token } });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("register-lawyer");
    });

    socket.on("incoming-call", ({ roomId, callerName }: { roomId: string; callerName?: string }) => {
      setIncomingCall({ roomId, callerName: callerName || "A client" });
      setIsRinging(true);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Auto-dismiss after 60 seconds
  useEffect(() => {
    if (!incomingCall) return;
    const timer = setTimeout(() => {
      setIncomingCall(null);
      setIsRinging(false);
    }, 60000);
    return () => clearTimeout(timer);
  }, [incomingCall]);

  const handleJoin = () => {
    if (!incomingCall) return;
    router.push(`/session/${incomingCall.roomId}/video?role=lawyer&lawyer=Client`);
    setIncomingCall(null);
    setIsRinging(false);
  };

  const handleDismiss = () => {
    setIncomingCall(null);
    setIsRinging(false);
  };

  return (
    <div className="flex min-h-screen" style={{ background: "#d9d09e" }}>
      <LawyerSidebarNav />
      <main className="flex-1 md:ml-60 min-w-0 p-4 md:p-7">
        {children}
      </main>

      {/* ── Incoming Video Call Notification ── */}
      {incomingCall && (
        <>
          {/* Backdrop pulse overlay */}
          <div
            className="fixed inset-0 z-40 pointer-events-none"
            style={{
              background: "radial-gradient(circle at top right, rgba(15,40,84,0.12) 0%, transparent 60%)",
              animation: "eb-pulse-bg 2s ease-in-out infinite",
            }}
          />

          {/* Notification toast */}
          <div
            className="fixed top-5 right-5 z-50 overflow-hidden"
            style={{
              borderRadius: 20,
              boxShadow: "0 8px 40px rgba(15,40,84,0.35), 0 0 0 1px rgba(73,136,196,0.3)",
              animation: "eb-slide-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
              minWidth: 370,
              maxWidth: 420,
            }}
          >
            {/* Gradient background */}
            <div
              style={{
                background: "linear-gradient(135deg, #0F2854 0%, #1C4D8D 50%, #0F2854 100%)",
                padding: "20px 22px",
              }}
            >
              {/* Top label */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#22c55e",
                    boxShadow: "0 0 8px rgba(34,197,94,0.6)",
                    animation: "eb-dot-pulse 1.5s ease-in-out infinite",
                  }}
                />
                <span
                  className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "rgba(189,232,245,0.8)" }}
                >
                  Incoming Video Call
                </span>
              </div>

              {/* Caller info row */}
              <div className="flex items-center gap-4">
                {/* Animated ringing icon */}
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: "rgba(34,197,94,0.15)",
                    border: "2px solid rgba(34,197,94,0.3)",
                    animation: "eb-ring 1.2s ease-in-out infinite",
                  }}
                >
                  <Video size={24} className="text-green-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold text-base truncate"
                    style={{ color: "#fff" }}
                  >
                    {incomingCall.callerName}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "#BDE8F5" }}
                  >
                    is requesting a video consultation
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleJoin}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                    color: "#fff",
                    boxShadow: "0 4px 16px rgba(34,197,94,0.3)",
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(34,197,94,0.45)";
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px rgba(34,197,94,0.3)";
                  }}
                >
                  <Phone size={15} />
                  Accept & Join
                </button>

                <button
                  onClick={handleDismiss}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.2)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.4)";
                    (e.currentTarget as HTMLButtonElement).style.color = "#fca5a5";
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)";
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
                  }}
                >
                  <X size={15} />
                  Dismiss
                </button>
              </div>
            </div>

            {/* Bottom progress / timeout bar */}
            <div
              style={{
                height: 3,
                background: "rgba(255,255,255,0.1)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, #22c55e, #4ade80)",
                  animation: "eb-timeout-bar 60s linear forwards",
                }}
              />
            </div>
          </div>

          {/* CSS Animations */}
          <style>{`
            @keyframes eb-slide-in {
              from {
                opacity: 0;
                transform: translateX(100px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateX(0) scale(1);
              }
            }

            @keyframes eb-ring {
              0%, 100% { transform: rotate(0deg) scale(1); }
              15% { transform: rotate(12deg) scale(1.05); }
              30% { transform: rotate(-10deg) scale(1.05); }
              45% { transform: rotate(8deg) scale(1); }
              60% { transform: rotate(-5deg) scale(1); }
            }

            @keyframes eb-dot-pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.5; transform: scale(1.4); }
            }

            @keyframes eb-pulse-bg {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 1; }
            }

            @keyframes eb-timeout-bar {
              from { width: 100%; }
              to { width: 0%; }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
