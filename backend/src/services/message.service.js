const { Op } = require('sequelize');
const { Message, Conversation, User } = require('../models');

class MessageService {
  async getByConversation(conversationId, userId) {
    const conv = await Conversation.findByPk(conversationId);

    if (!conv) {
      return { status: 404, body: { success: false, message: 'Conversación no encontrada' } };
    }

    if (conv.buyer_id !== userId && conv.seller_id !== userId) {
      return { status: 403, body: { success: false, message: 'Sin acceso a esta conversación' } };
    }

    const messages = await Message.findAll({
      where: { conversation_id: conversationId },
      include: [{ model: User, as: 'remitente', attributes: ['id', 'nombre', 'avatar_url'] }],
      order: [['created_at', 'ASC']]
    });

    return { status: 200, body: { success: true, data: messages } };
  }

  async getById(id, userId) {
    const msg = await Message.findByPk(id, {
      include: [
        { model: Conversation, attributes: ['id', 'buyer_id', 'seller_id'] },
        { model: User, as: 'remitente', attributes: ['id', 'nombre', 'avatar_url'] }
      ]
    });

    if (!msg) {
      return { status: 404, body: { success: false, message: 'Mensaje no encontrado' } };
    }

    const conv = msg.Conversation;
    if (!conv || (conv.buyer_id !== userId && conv.seller_id !== userId)) {
      return { status: 403, body: { success: false, message: 'Sin acceso a este mensaje' } };
    }

    return { status: 200, body: { success: true, data: msg } };
  }

  async create(conversationId, senderId, data) {
    const { content, attachments } = data;

    if (!content?.trim()) {
      return { status: 400, body: { success: false, message: 'content es obligatorio' } };
    }

    const conv = await Conversation.findByPk(conversationId);
    if (!conv) {
      return { status: 404, body: { success: false, message: 'Conversación no encontrada' } };
    }

    if (conv.buyer_id !== senderId && conv.seller_id !== senderId) {
      return { status: 403, body: { success: false, message: 'No sos participante de esta conversación' } };
    }

    const msg = await Message.create({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
      attachments: Array.isArray(attachments) ? attachments : []
    });

    await conv.update({ updated_at: new Date() });

    const created = await Message.findByPk(msg.id, {
      include: [{ model: User, as: 'remitente', attributes: ['id', 'nombre', 'avatar_url'] }]
    });

    return { status: 201, body: { success: true, message: 'Mensaje enviado', data: created } };
  }

  async markAsRead(id, userId) {
    const msg = await Message.findByPk(id, {
      include: [{ model: Conversation, attributes: ['id', 'buyer_id', 'seller_id'] }]
    });

    if (!msg) {
      return { status: 404, body: { success: false, message: 'Mensaje no encontrado' } };
    }

    const conv = msg.Conversation;
    if (!conv || (conv.buyer_id !== userId && conv.seller_id !== userId)) {
      return { status: 403, body: { success: false, message: 'Sin acceso a este mensaje' } };
    }

    if (msg.sender_id === userId) {
      return { status: 200, body: { success: true, message: 'Tu propio mensaje no requiere leído', data: msg } };
    }

    if (msg.read) {
      return { status: 200, body: { success: true, message: 'Mensaje ya estaba leído', data: msg } };
    }

    await msg.update({ read: true });
    return { status: 200, body: { success: true, message: 'Mensaje marcado como leído', data: msg } };
  }

  async markConversationAsRead(conversationId, userId) {
    const conv = await Conversation.findByPk(conversationId);

    if (!conv) {
      return { status: 404, body: { success: false, message: 'Conversación no encontrada' } };
    }

    if (conv.buyer_id !== userId && conv.seller_id !== userId) {
      return { status: 403, body: { success: false, message: 'Sin acceso a esta conversación' } };
    }

    const [updated] = await Message.update(
      { read: true },
      {
        where: {
          conversation_id: conversationId,
          sender_id: { [Op.ne]: userId },
          read: false
        }
      }
    );

    return {
      status: 200,
      body: { success: true, message: 'Mensajes marcados como leídos', data: { updated } }
    };
  }
}

module.exports = new MessageService();
