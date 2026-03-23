const { Message, User, Conversation } = require('../models');
const { Op } = require('sequelize');

class MessageService {
  async create(conversationId, senderId, content, attachments = []) {
    // Verificar que la conversación existe
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      throw new Error('Conversación no encontrada');
    }

    // Crear mensaje
    const message = await Message.create({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      attachments,
      read: false
    });

    // Actualizar updated_at de la conversación
    await conversation.update({ updated_at: new Date() });

    // Obtener mensaje con datos del remitente
    const messageWithUser = await Message.findByPk(message.id, {
      include: [{ model: User, as: 'remitente', attributes: ['id', 'nombre', 'avatar_url'] }]
    });

    return messageWithUser;
  }

  async getByConversation(conversationId) {
    return await Message.findAll({
      where: { conversation_id: conversationId },
      include: [{ model: User, as: 'remitente', attributes: ['id', 'nombre', 'avatar_url'] }],
      order: [['created_at', 'ASC']]
    });
  }

  async markAsRead(messageId, userId) {
    const message = await Message.findByPk(messageId, {
      include: [{ model: Conversation, attributes: ['buyer_id', 'seller_id'] }]
    });

    if (!message) {
      throw new Error('Mensaje no encontrado');
    }

    const conversation = message.Conversation;
    if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
      throw new Error('Sin acceso');
    }

    if (message.sender_id !== userId && !message.read) {
      await message.update({ read: true });
    }

    return message;
  }

  async markConversationAsRead(conversationId, userId) {
    await Message.update(
      { read: true },
      {
        where: {
          conversation_id: conversationId,
          sender_id: { [Op.ne]: userId },
          read: false
        }
      }
    );
  }
}

module.exports = new MessageService();
