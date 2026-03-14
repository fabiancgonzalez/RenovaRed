const messageService = require('../services/message.service');
const MessageDTO = require('../dtos/message.dto');

exports.getByConversation = async (req, res) => {
  try {
    const result = await messageService.getByConversation(req.params.conversationId, req.user.id);

    if (result.body.success && Array.isArray(result.body.data)) {
      result.body.data = MessageDTO.list(result.body.data);
    }

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('MessageController.getByConversation:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener mensajes', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await messageService.getById(req.params.id, req.user.id);

    if (result.body.success && result.body.data) {
      result.body.data = MessageDTO.item(result.body.data);
    }

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('MessageController.getById:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener mensaje', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await messageService.create(req.params.conversationId, req.user.id, req.body);

    if (result.body.success && result.body.data) {
      result.body.data = MessageDTO.item(result.body.data);
    }

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('MessageController.create:', error);
    return res.status(500).json({ success: false, message: 'Error al enviar mensaje', error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const result = await messageService.markAsRead(req.params.id, req.user.id);

    if (result.body.success && result.body.data) {
      result.body.data = MessageDTO.item(result.body.data);
    }

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('MessageController.markAsRead:', error);
    return res.status(500).json({ success: false, message: 'Error al marcar mensaje', error: error.message });
  }
};

exports.markConversationAsRead = async (req, res) => {
  try {
    const result = await messageService.markConversationAsRead(req.params.conversationId, req.user.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('MessageController.markConversationAsRead:', error);
    return res.status(500).json({ success: false, message: 'Error al marcar conversación', error: error.message });
  }
};
