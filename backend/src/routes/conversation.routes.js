const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversation.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET  /api/conversations           → Mis conversaciones (buyer o seller)
router.get('/', conversationController.getMyConversations);

// GET  /api/conversations/:id       → Detalle + mensajes (marca como leído)
router.get('/:id', conversationController.getById);

// POST /api/conversations           → Iniciar conversación
// Body: { publication_id, seller_id }
router.post('/', conversationController.create);

// POST /api/conversations/:id/messages → Enviar mensaje
// Body: { content, attachments? }
router.post('/:id/messages', conversationController.sendMessage);

module.exports = router;
