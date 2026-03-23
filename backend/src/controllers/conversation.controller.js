const conversationService = require('../services/conversation.service');
const ConversationDTO = require('../dtos/conversation.dto');

exports.create = async (req, res) => {
  try {
    const result = await conversationService.create(req.user.id, req.body);
    
    if (result.body.success && result.body.data) {
      result.body.data = ConversationDTO.detail(result.body.data, req.user.id);
    }
    
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error en create conversation:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al crear conversación',
      error: error.message 
    });
  }
};

exports.getMyConversations = async (req, res) => {
  try {
    const result = await conversationService.getMyConversations(req.user.id);
    
    if (result.body.success && Array.isArray(result.body.data)) {
      const mappedData = result.body.data
        .map(conv => {
          try {
            return ConversationDTO.list(conv, req.user.id);
          } catch (err) {
            console.warn('Error al mapear conversación:', conv?.id, err.message);
            return null;
          }
        })
        .filter(conv => conv !== null);
      
      result.body.data = mappedData;
    }

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error en getMyConversations:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener conversaciones',
      error: error.message 
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await conversationService.getById(req.params.id, req.user.id);
    
    if (result.body.success && result.body.data) {
      result.body.data = ConversationDTO.detail(result.body.data, req.user.id);
    }
    
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error en get conversation by id:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener conversación',
      error: error.message 
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const result = await conversationService.updateStatus(req.params.id, req.user.id, req.body);
    
    if (result.body.success && result.body.data) {
      result.body.data = ConversationDTO.detail(result.body.data, req.user.id);
    }
    
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error en updateStatus:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar conversación',
      error: error.message 
    });
  }
};

exports.deleteForMe = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await conversationService.deleteForMe(id, userId);
    
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error en deleteForMe:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar conversación',
      error: error.message 
    });
  }
};

exports.getAllConversationsForAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 3, filter = 'all', search = '' } = req.query;
    const result = await conversationService.getAllConversationsForAdmin(page, limit, filter, search);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error en getAllConversationsForAdmin:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener conversaciones',
      error: error.message 
    });
  }
};

exports.deleteConversationPermanently = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await conversationService.deleteConversationPermanently(id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error en deleteConversationPermanently:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar conversación',
      error: error.message 
    });
  }
};