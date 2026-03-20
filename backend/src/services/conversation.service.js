const { Op } = require('sequelize');
const { Conversation, Message, User, Publication } = require('../models');

class ConversationService {
  async getMyConversations(userId) {
    // Conversaciones donde el usuario es dueño de la publicación o ya participó con mensajes
    const conversations = await Conversation.findAll({
      include: [
        { model: Publication, attributes: ['id', 'titulo', 'imagenes', 'estado', 'user_id'] },
        {
          model: Message,
          where: { sender_id: userId },
          required: false,
          attributes: ['id', 'sender_id', 'created_at']
        }
      ],
      order: [['updated_at', 'DESC']]
    });

    const filtered = conversations.filter((conversation) => {
      const isPublicationOwner = conversation.Publication?.user_id === userId;
      const hasMessagesFromUser = (conversation.Messages || []).length > 0;
      return isPublicationOwner || hasMessagesFromUser;
    });

    return { status: 200, body: { success: true, data: filtered } };
  }

  async getById(id, userId) {
    const conv = await Conversation.findByPk(id, {
      include: [
        { model: Publication, attributes: ['id', 'titulo', 'imagenes', 'estado', 'precio', 'user_id'] },
        {
          model: Message,
          include: [{ model: User, as: 'remitente', attributes: ['id', 'nombre', 'avatar_url'] }],
          order: [['created_at', 'ASC']]
        }
      ]
    });

    if (!conv) return { status: 404, body: { success: false, message: 'Conversación no encontrada' } };

    // Marcar mensajes como leídos
    await Message.update(
      { read: true },
      { where: { conversation_id: id, sender_id: { [Op.ne]: userId }, read: false } }
    );

    return { status: 200, body: { success: true, data: conv } };
  }

  async create(userId, data) {
    const { publication_id } = data;
    if (!publication_id) {
      return { status: 400, body: { success: false, message: 'publication_id es obligatorio' } };
    }

    const publication = await Publication.findByPk(publication_id, { attributes: ['id', 'user_id'] });
    if (!publication) {
      return { status: 404, body: { success: false, message: 'Publicación no encontrada' } };
    }

    if (publication.user_id === userId) {
      return { status: 400, body: { success: false, message: 'No podés iniciar una conversación con tu propia publicación' } };
    }

    // Una conversación por publicación
    const existing = await Conversation.findOne({
      where: { publication_id }
    });
    if (existing) {
      return { status: 200, body: { success: true, message: 'Conversación existente', data: existing } };
    }

    const conv = await Conversation.create({ publication_id });
    return { status: 201, body: { success: true, message: 'Conversación iniciada', data: conv } };
  }

  // --- MESSAGES ---

  async sendMessage(conversationId, senderId, data) {
    const { content, attachments } = data;
    if (!content?.trim()) {
      return { status: 400, body: { success: false, message: 'content es obligatorio' } };
    }

    const conv = await Conversation.findByPk(conversationId);
    if (!conv) return { status: 404, body: { success: false, message: 'Conversación no encontrada' } };

    const msg = await Message.create({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
      attachments: attachments || []
    });

    // Actualizar updated_at de la conversación
    await conv.update({ updated_at: new Date() });

    return { status: 201, body: { success: true, message: 'Mensaje enviado', data: msg } };
  }
}

module.exports = new ConversationService();
