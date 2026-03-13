const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getAvailableLawyers,
  getAvailableClients,
  createOrGetDirectChat,
  getMyChats,
  getChatById,
  sendMessage,
  deleteChat,
} = require('../controller/chatController');

const router = express.Router();

router.use(authMiddleware);

router.get('/lawyers', getAvailableLawyers);
router.get('/clients', getAvailableClients);
router.post('/', createOrGetDirectChat);
router.get('/', getMyChats);
router.get('/:chatId', getChatById);
router.post('/:chatId/messages', sendMessage);
router.delete('/:chatId', deleteChat);

module.exports = router;
