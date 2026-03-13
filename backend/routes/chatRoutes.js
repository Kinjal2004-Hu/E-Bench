const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createOrGetDirectChat,
  getMyChats,
  getChatById,
  sendMessage,
  deleteChat,
} = require('../controller/chatController');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createOrGetDirectChat);
router.get('/', getMyChats);
router.get('/:chatId', getChatById);
router.post('/:chatId/messages', sendMessage);
router.delete('/:chatId', deleteChat);

module.exports = router;
