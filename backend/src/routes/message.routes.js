const express = require('express');
const router = express.Router({ mergeParams: true });
const messageController = require('../controllers/message.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.post('/', messageController.sendMessage);
router.get('/', messageController.getMessages);
router.put('/:id/leer', messageController.markAsRead);

module.exports = router;
