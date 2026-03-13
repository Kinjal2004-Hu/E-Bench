const Chat = require('../models/ChatModel');
const Consultant = require('../models/ConsultantModel');
const User = require('../models/UserModel');

const toParticipantModel = (userType) => (userType === 'consultant' ? 'Consultant' : 'User');

const isValidParticipantModel = (model) => model === 'User' || model === 'Consultant';

const normalizeParticipant = (id, model) => ({
  participant: id,
  participantModel: model,
});

const ensureRequesterInChat = (chat, requesterId, requesterModel) => {
  const requesterIdStr = String(requesterId);
  return chat.participants.some(
    (p) => {
      const participantId = p?.participant?._id || p?.participant;
      return String(participantId) === requesterIdStr && p.participantModel === requesterModel;
    }
  );
};

// GET /api/chats/lawyers
const getAvailableLawyers = async (req, res) => {
  try {
    const { specialization, search, verifiedOnly } = req.query;

    const query = {};
    if (verifiedOnly === 'true') {
      query.isVerified = true;
    }
    if (specialization && typeof specialization === 'string') {
      query.specialization = specialization;
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      query.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { specialization: { $regex: q, $options: 'i' } },
      ];
    }

    const lawyers = await Consultant.find(query)
      .select('_id fullName email specialization professionalSummary rating totalClients isVerified consultationFee')
      .sort({ rating: -1, totalClients: -1, fullName: 1 });

    return res.json(lawyers);
  } catch (error) {
    console.error('getAvailableLawyers error:', error);
    return res.status(500).json({ error: 'Failed to fetch lawyers' });
  }
};

// GET /api/chats/clients
const getAvailableClients = async (req, res) => {
  try {
    if (req.user.userType !== 'consultant') {
      return res.status(403).json({ error: 'Only consultants can access clients list' });
    }

    const { search } = req.query;
    const query = {};

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      query.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    const clients = await User.find(query)
      .select('_id fullName email createdAt')
      .sort({ fullName: 1 });

    return res.json(clients);
  } catch (error) {
    console.error('getAvailableClients error:', error);
    return res.status(500).json({ error: 'Failed to fetch clients' });
  }
};

// POST /api/chats
const createOrGetDirectChat = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const requesterModel = toParticipantModel(req.user.userType);
    const { participantId, participantModel, initialMessage } = req.body;

    if (!participantId || !participantModel) {
      return res.status(400).json({ error: 'participantId and participantModel are required' });
    }

    if (!isValidParticipantModel(participantModel)) {
      return res.status(400).json({ error: 'participantModel must be User or Consultant' });
    }

    if (participantId === requesterId && participantModel === requesterModel) {
      return res.status(400).json({ error: 'Cannot create a chat with yourself' });
    }

    let chat = await Chat.findOne({
      isDirect: true,
      $and: [
        {
          participants: {
            $elemMatch: {
              participant: requesterId,
              participantModel: requesterModel,
            },
          },
        },
        {
          participants: {
            $elemMatch: {
              participant: participantId,
              participantModel,
            },
          },
        },
      ],
    })
      .populate('participants.participant', 'fullName email')
      .populate('messages.sender', 'fullName email');

    if (!chat) {
      chat = await Chat.create({
        isDirect: true,
        participants: [
          normalizeParticipant(requesterId, requesterModel),
          normalizeParticipant(participantId, participantModel),
        ],
      });

      chat = await Chat.findById(chat._id)
        .populate('participants.participant', 'fullName email')
        .populate('messages.sender', 'fullName email');
    }

    if (initialMessage && typeof initialMessage === 'string' && initialMessage.trim()) {
      const message = {
        sender: requesterId,
        senderModel: requesterModel,
        content: initialMessage.trim(),
      };
      chat.messages.push(message);
      chat.lastMessage = message.content;
      chat.lastMessageAt = new Date();
      await chat.save();

      chat = await Chat.findById(chat._id)
        .populate('participants.participant', 'fullName email')
        .populate('messages.sender', 'fullName email');
    }

    return res.status(200).json(chat);
  } catch (error) {
    console.error('createOrGetDirectChat error:', error);
    return res.status(500).json({ error: 'Failed to create or fetch chat' });
  }
};

// GET /api/chats
const getMyChats = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const requesterModel = toParticipantModel(req.user.userType);

    const chats = await Chat.find({
      participants: {
        $elemMatch: {
          participant: requesterId,
          participantModel: requesterModel,
        },
      },
    })
      .populate('participants.participant', 'fullName email')
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    return res.json(chats);
  } catch (error) {
    console.error('getMyChats error:', error);
    return res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

// GET /api/chats/:chatId
const getChatById = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const requesterModel = toParticipantModel(req.user.userType);
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId)
      .populate('participants.participant', 'fullName email')
      .populate('messages.sender', 'fullName email');

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!ensureRequesterInChat(chat, requesterId, requesterModel)) {
      return res.status(403).json({ error: 'Access denied for this chat' });
    }

    return res.json(chat);
  } catch (error) {
    console.error('getChatById error:', error);
    return res.status(500).json({ error: 'Failed to fetch chat' });
  }
};

// POST /api/chats/:chatId/messages
const sendMessage = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const requesterModel = toParticipantModel(req.user.userType);
    const { chatId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!ensureRequesterInChat(chat, requesterId, requesterModel)) {
      return res.status(403).json({ error: 'Access denied for this chat' });
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

    const updatedChat = await Chat.findById(chat._id)
      .populate('participants.participant', 'fullName email')
      .populate('messages.sender', 'fullName email');

    const newMessage = updatedChat.messages[updatedChat.messages.length - 1];
    return res.status(201).json(newMessage);
  } catch (error) {
    console.error('sendMessage error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
};

// DELETE /api/chats/:chatId
const deleteChat = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const requesterModel = toParticipantModel(req.user.userType);
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!ensureRequesterInChat(chat, requesterId, requesterModel)) {
      return res.status(403).json({ error: 'Access denied for this chat' });
    }

    await Chat.findByIdAndDelete(chatId);
    return res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('deleteChat error:', error);
    return res.status(500).json({ error: 'Failed to delete chat' });
  }
};

module.exports = {
  getAvailableLawyers,
  getAvailableClients,
  createOrGetDirectChat,
  getMyChats,
  getChatById,
  sendMessage,
  deleteChat,
};
