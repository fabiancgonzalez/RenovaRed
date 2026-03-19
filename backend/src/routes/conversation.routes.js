const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversation.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.post('/', conversationController.create);
router.get('/mis-conversaciones', conversationController.getMyConversations);
router.get('/:id', conversationController.getById);
router.put('/:id/estado', conversationController.updateStatus);
router.delete('/:id/for-me', conversationController.deleteForMe);

module.exports = router;
