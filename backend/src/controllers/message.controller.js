const messageService = require('../services/message.service');
const MessageDTO = require('../dtos/message.dto');

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, attachments } = req.body;
    
    const message = await messageService.create(
      conversationId, 
      req.user.id, 
      content, 
      attachments
    );

    return res.status(201).json({
      success: true,
      message: 'Mensaje enviado',
      data: MessageDTO.item(message)
    });
  } catch (error) {
    console.error('Error en sendMessage:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al enviar mensaje',
      error: error.message 
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await messageService.getByConversation(req.params.conversationId);
    
    return res.json({
      success: true,
      data: MessageDTO.list(messages)
    });
  } catch (error) {
    console.error('Error en getMessages:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener mensajes',
      error: error.message 
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await messageService.markAsRead(req.params.id, req.user.id);
    return res.json({
      success: true,
      message: 'Mensaje marcado como leído'
    });
  } catch (error) {
    console.error('Error en markAsRead:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al marcar mensaje',
      error: error.message 
    });
  }
};