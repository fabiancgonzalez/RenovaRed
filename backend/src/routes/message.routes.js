const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);

// GET /api/messages/conversation/:conversationId   → Listar mensajes por conversación
router.get('/conversation/:conversationId', messageController.getByConversation);

// GET /api/messages/:id                             → Obtener mensaje por id
router.get('/:id', messageController.getById);

// POST /api/messages/conversation/:conversationId   → Enviar mensaje
// Body: { content, attachments? }
router.post('/conversation/:conversationId', messageController.create);

// PATCH /api/messages/:id/read                      → Marcar un mensaje como leído
router.patch('/:id/read', messageController.markAsRead);

// PATCH /api/messages/conversation/:conversationId/read → Marcar todos como leídos en conversación
router.patch('/conversation/:conversationId/read', messageController.markConversationAsRead);

module.exports = router;
