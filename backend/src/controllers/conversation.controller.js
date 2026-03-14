const conversationService = require('../services/conversation.service');

exports.getMyConversations = async (req, res) => {
  try {
    const result = await conversationService.getMyConversations(req.user.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('ConversationController.getMyConversations:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener conversaciones', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await conversationService.getById(req.params.id, req.user.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('ConversationController.getById:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener conversación', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await conversationService.create(req.user.id, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('ConversationController.create:', error);
    return res.status(500).json({ success: false, message: 'Error al crear conversación', error: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const result = await conversationService.sendMessage(req.params.id, req.user.id, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('ConversationController.sendMessage:', error);
    return res.status(500).json({ success: false, message: 'Error al enviar mensaje', error: error.message });
  }
};
