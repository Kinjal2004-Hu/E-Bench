const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const lawyerRoutes = require('./routes/lawyerRoutes');
const userRoutes = require('./routes/userRoutes');
const Chat = require('./models/ChatModel');
const forumRoutes = require('./routes/forumRoutes');
const toolRoutes = require('./routes/toolRoutes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

// ── MongoDB Connection ──
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ebench')
    .then(() => console.log('✓ MongoDB connected'))
    .catch(err => console.error('✗ MongoDB connection failed:', err));

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/lawyer', lawyerRoutes);
app.use('/api/user', userRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/tools', toolRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] }
});

// JWT authentication for Socket.IO connections
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required.'));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid or expired token.'));
  }
});

// ── In-memory state ──
const rooms = new Map();   // roomId → { user: socketId|null, lawyer: socketId|null, createdAt }
const lawyers = new Map(); // socketId → socket  (online lawyers listening for calls)

// ── REST: User creates a call room ──
app.post('/create-room', (req, res) => {
  const roomId = uuidv4();
  rooms.set(roomId, { user: null, lawyer: null, createdAt: Date.now() });

  // Try to extract caller name from JWT token
  let callerName = 'A client';
  try {
    const bearerToken = req.headers.authorization?.split(' ')[1];
    if (bearerToken) {
      const decoded = jwt.verify(bearerToken, JWT_SECRET);
      callerName = decoded.fullName || decoded.name || 'A client';
    }
  } catch { /* ignore invalid tokens — still create the room */ }

  // Notify every online lawyer about the incoming call
  for (const [, lawyerSocket] of lawyers) {
    lawyerSocket.emit('incoming-call', { roomId, from: 'user', callerName, timestamp: Date.now() });
  }

  console.log(`Room created: ${roomId} — notified ${lawyers.size} lawyer(s) (caller: ${callerName})`);
  res.json({ roomId });
});

// ── Socket.IO ──
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.data = {};

  const requesterId = socket.user?.id || socket.user?.userId;
  const requesterModel = socket.user?.userType === 'consultant' ? 'Consultant' : 'User';

  // Register as lawyer listener (so they receive incoming-call notifications)
  socket.on('register-lawyer', () => {
    lawyers.set(socket.id, socket);
    socket.data.isLawyer = true;
    console.log(`Lawyer registered: ${socket.id} (total: ${lawyers.size})`);
  });

  // Join room with role
  socket.on('join-room', ({ roomId, role }) => {
    if (typeof roomId !== 'string' || typeof role !== 'string') return;
    if (role !== 'user' && role !== 'lawyer') return;

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { user: null, lawyer: null, createdAt: Date.now() });
    }

    const room = rooms.get(roomId);
    room[role] = socket.id;
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.role = role;

    // Tell the other peer someone joined
    socket.to(roomId).emit('peer-joined', { role, socketId: socket.id });
    console.log(`${role} joined room ${roomId}`);
  });

  // ── WebRTC Signaling ──
  socket.on('offer', ({ roomId, offer }) => {
    if (!roomId || !offer) return;
    socket.to(roomId).emit('offer', { offer, from: socket.id });
  });

  socket.on('answer', ({ roomId, answer }) => {
    if (!roomId || !answer) return;
    socket.to(roomId).emit('answer', { answer });
  });

  socket.on('ice-candidate', ({ roomId, candidate }) => {
    if (!roomId || !candidate) return;
    socket.to(roomId).emit('ice-candidate', { candidate });
  });

  // ── Chat inside the call ──
  socket.on('chat-message', ({ roomId, message, sender }) => {
    if (!roomId || typeof message !== 'string' || !message.trim()) return;
    io.to(roomId).emit('chat-message', {
      message: message.trim(),
      sender,
      timestamp: Date.now()
    });
  });

  // ── DB-backed direct chat ──
  socket.on('join-chat-room', async ({ chatId }) => {
    try {
      if (!chatId || !requesterId) return;
      const chat = await Chat.findOne({
        _id: chatId,
        participants: {
          $elemMatch: {
            participant: requesterId,
            participantModel: requesterModel,
          },
        },
      });
      if (!chat) return;
      socket.join(`chat:${chatId}`);
    } catch (error) {
      console.error('join-chat-room error:', error);
    }
  });

  socket.on('send-chat-message', async ({ chatId, content }, ack) => {
    try {
      if (!chatId || typeof content !== 'string' || !content.trim() || !requesterId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Invalid payload' });
        return;
      }

      const chat = await Chat.findOne({
        _id: chatId,
        participants: {
          $elemMatch: {
            participant: requesterId,
            participantModel: requesterModel,
          },
        },
      });

      if (!chat) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Chat not found' });
        return;
      }

      const message = {
        sender: requesterId,
        senderModel: requesterModel,
        content: content.trim(),
      };

      chat.messages.push(message);
      chat.lastMessage = message.content;
      chat.lastMessageAt = new Date();
      await chat.save();

      const savedMessage = chat.messages[chat.messages.length - 1];
      const payload = {
        _id: savedMessage._id,
        chatId,
        sender: savedMessage.sender,
        senderModel: savedMessage.senderModel,
        content: savedMessage.content,
        timestamp: savedMessage.timestamp,
      };

      io.to(`chat:${chatId}`).emit('chat-message-realtime', payload);
      if (typeof ack === 'function') ack({ ok: true, message: payload });
    } catch (error) {
      console.error('send-chat-message error:', error);
      if (typeof ack === 'function') ack({ ok: false, error: 'Failed to send message' });
    }
  });

  // ── Disconnect cleanup ──
  socket.on('disconnect', () => {
    const { roomId, role, isLawyer } = socket.data;

    if (isLawyer) {
      lawyers.delete(socket.id);
      console.log(`Lawyer unregistered: ${socket.id} (remaining: ${lawyers.size})`);
    }

    if (roomId) {
      socket.to(roomId).emit('peer-left', { role });
      const room = rooms.get(roomId);
      if (room) {
        room[role] = null;
        // Cleanup empty rooms
        if (!room.user && !room.lawyer) {
          rooms.delete(roomId);
          console.log(`Room deleted: ${roomId}`);
        }
      }
    }

    console.log('Socket disconnected:', socket.id);
  });
});

// ── Stale room cleanup every 30 minutes ──
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, room] of rooms) {
    if (room.createdAt < cutoff && !room.user && !room.lawyer) {
      rooms.delete(id);
      console.log(`Stale room cleaned: ${id}`);
    }
  }
}, 30 * 60 * 1000);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`✓ Signaling server running on :${PORT}`));