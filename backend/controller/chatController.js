const Chat = require('../models/ChatModel');
const Consultant = require('../models/ConsultantModel');
const User = require('../models/UserModel');
const { t } = require('../i18n/i18n');

const toParticipantModel = (userType) => (userType === 'consultant' ? 'Consultant' : 'User');

const getLocale = (req) => req.query.locale || req.body?.locale || 'en';

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
  const locale = getLocale(req);

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
    return res.status(500).json({ error: t('errors.serverError', locale) });
  }
};

// GET /api/chats/clients
const getAvailableClients = async (req, res) => {
  const locale = getLocale(req);

  try {
    if (req.user.userType !== 'consultant') {
      return res.status(403).json({ error: t('errors.unauthorized', locale) });
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
    return res.status(500).json({ error: t('errors.serverError', locale) });
  }
};

// POST /api/chats
const createOrGetDirectChat = async (req, res) => {
  const locale = getLocale(req);

  try {
    const requesterId = req.user.id;
    const requesterModel = toParticipantModel(req.user.userType);
    const { participantId, participantModel, initialMessage } = req.body;

    if (!participantId || !participantModel) {
      return res.status(400).json({ error: t('errors.required', locale) });
    }

    if (!isValidParticipantModel(participantModel)) {
      return res.status(400).json({ error: t('errors.badRequest', locale) });
    }

    if (participantId === requesterId && participantModel === requesterModel) {
      return res.status(400).json({ error: t('errors.badRequest', locale) });
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
    return res.status(500).json({ error: t('errors.serverError', locale) });
  }
};

// GET /api/chats
const getMyChats = async (req, res) => {
  const locale = getLocale(req);

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
    return res.status(500).json({ error: t('errors.serverError', locale) });
  }
};

// GET /api/chats/:chatId
const getChatById = async (req, res) => {
  const locale = getLocale(req);

  try {
    const requesterId = req.user.id;
    const requesterModel = toParticipantModel(req.user.userType);
    const { chatId } = req.params;

    // Reject non-ObjectID strings (e.g. localStorage keys like chat_1234567890)
    if (!/^[a-f\d]{24}$/i.test(chatId)) {
      return res.status(404).json({ error: t('chat.noChatFound', locale) });
    }

    const chat = await Chat.findById(chatId)
      .populate('participants.participant', 'fullName email')
      .populate('messages.sender', 'fullName email');

    if (!chat) {
      return res.status(404).json({ error: t('chat.noChatFound', locale) });
    }

    if (!ensureRequesterInChat(chat, requesterId, requesterModel)) {
      return res.status(403).json({ error: t('errors.unauthorized', locale) });
    }

    return res.json(chat);
  } catch (error) {
    console.error('getChatById error:', error);
    return res.status(500).json({ error: t('errors.serverError', locale) });
  }
};

// POST /api/chats/:chatId/messages
const sendMessage = async (req, res) => {
  const locale = getLocale(req);

  try {
    const requesterId = req.user.id;
    const requesterModel = toParticipantModel(req.user.userType);
    const { chatId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: t('errors.required', locale) });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: t('chat.noChatFound', locale) });
    }

    if (!ensureRequesterInChat(chat, requesterId, requesterModel)) {
      return res.status(403).json({ error: t('errors.unauthorized', locale) });
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
    return res.status(500).json({ error: t('errors.serverError', locale) });
  }
};

// DELETE /api/chats/:chatId
const deleteChat = async (req, res) => {
  const locale = getLocale(req);

  try {
    const requesterId = req.user.id;
    const requesterModel = toParticipantModel(req.user.userType);
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: t('chat.noChatFound', locale) });
    }

    if (!ensureRequesterInChat(chat, requesterId, requesterModel)) {
      return res.status(403).json({ error: t('errors.unauthorized', locale) });
    }

    await Chat.findByIdAndDelete(chatId);
    return res.json({ message: t('chat.chatDeleted', locale) });
  } catch (error) {
    console.error('deleteChat error:', error);
    return res.status(500).json({ error: t('errors.serverError', locale) });
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
