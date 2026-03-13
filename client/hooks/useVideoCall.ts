"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const SIGNAL_SERVER = "http://localhost:4000";

export type ChatMsg = {
  message: string;
  sender: string;
  timestamp: number;
};

export function useVideoCall(roomId: string, role: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // ── Create peer connection ──
  const createPC = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", { roomId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      setIsConnected(pc.connectionState === "connected");
    };

    return pc;
  }, [roomId]);

  // ── Main effect: connect socket + get media ──
  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;
    const socket = io(SIGNAL_SERVER) as Socket;
    socketRef.current = socket;

    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        socket.emit("join-room", { roomId, role });

        // When the other peer joins, the user (who created the room) makes the offer
        socket.on("peer-joined", async () => {
          if (role === "user") {
            const pc = createPC();
            pcRef.current = pc;
            stream.getTracks().forEach((t) => pc.addTrack(t, stream));
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", { roomId, offer });
          }
        });

        socket.on("offer", async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
          const pc = createPC();
          pcRef.current = pc;
          stream.getTracks().forEach((t) => pc.addTrack(t, stream));
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", { roomId, answer });
        });

        socket.on("answer", async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          }
        });

        socket.on("ice-candidate", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
          if (pcRef.current) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        });

        socket.on("chat-message", (msg: ChatMsg) => {
          setMessages((prev) => [...prev, msg]);
        });

        socket.on("peer-left", () => {
          setIsConnected(false);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to access camera/mic");
      }
    };

    setup();

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      socket.disconnect();
    };
  }, [roomId, role, createPC]);

  // ── Controls ──
  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsCameraOff(!track.enabled); }
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || !socketRef.current) return;
    socketRef.current.emit("chat-message", { roomId, message: text.trim(), sender: role });
  }, [roomId, role]);

  const endCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    socketRef.current?.disconnect();
    setIsConnected(false);
  }, []);

  return {
    localVideoRef,
    remoteVideoRef,
    isConnected,
    isMuted,
    isCameraOff,
    messages,
    error,
    toggleMute,
    toggleCamera,
    sendMessage,
    endCall,
  };
}
