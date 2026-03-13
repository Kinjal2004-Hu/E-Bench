// hooks/useVideoCall.js
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add TURN server for production:
    // { urls: 'turn:your-turn-server', username: '...', credential: '...' }
  ]
};

export function useVideoCall(roomId, role) {
  const [remoteStream, setRemoteStream] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [messages, setMessages] = useState([]);

  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit('ice-candidate', { roomId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };

    pc.onconnectionstatechange = () => {
      setIsConnected(pc.connectionState === 'connected');
    };

    return pc;
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    const socket = io('http://localhost:4000');
    socketRef.current = socket;

    // Get local media
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      socket.emit('join-room', { roomId, role });

      // Lawyer creates the offer
      socket.on('peer-joined', async () => {
        if (role === 'lawyer') {
          const pc = createPeerConnection();
          peerConnectionRef.current = pc;
          stream.getTracks().forEach((t) => pc.addTrack(t, stream));

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { roomId, offer });
        }
      });

      socket.on('offer', async ({ offer }) => {
        const pc = createPeerConnection();
        peerConnectionRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { roomId, answer });
      });

      socket.on('answer', async ({ answer }) => {
        await peerConnectionRef.current?.setRemoteDescription(answer);
      });

      socket.on('ice-candidate', async ({ candidate }) => {
        await peerConnectionRef.current?.addIceCandidate(candidate);
      });

      socket.on('chat-message', (msg) => {
        setMessages((prev) => [...prev, msg]);
      });

      socket.on('peer-left', () => {
        setIsConnected(false);
        setRemoteStream(null);
      });
    });

    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerConnectionRef.current?.close();
      socket.disconnect();
    };
  }, [roomId, role, createPeerConnection]);

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  };

  const sendMessage = (message) => {
    socketRef.current?.emit('chat-message', { roomId, message, sender: role });
  };

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerConnectionRef.current?.close();
    socketRef.current?.disconnect();
  };

  return {
    localVideoRef, remoteVideoRef,
    isConnected, isMuted, isCameraOff,
    messages, toggleMute, toggleCamera,
    sendMessage, endCall
  };
}