const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversation.controller');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// Rutas para usuarios normales
router.post('/', conversationController.create);
router.get('/mis-conversaciones', conversationController.getMyConversations);
router.get('/:id', conversationController.getById);
router.put('/:id/estado', conversationController.updateStatus);
router.delete('/:id/for-me', conversationController.deleteForMe);

// Obtener todas las conversaciones (solo admin)
router.get('/admin/all', authorize('Admin'), conversationController.getAllConversationsForAdmin);

// Eliminar conversación permanentemente (solo admin)
router.delete('/admin/:id', authorize('Admin'), conversationController.deleteConversationPermanently);

module.exports = router;