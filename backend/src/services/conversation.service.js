const { Conversation, Message, User, Publication } = require('../models');

class ConversationService {
  async getMyConversations(userId) {
    // Conversaciones donde el usuario es buyer o seller
    const conversations = await Conversation.findAll({
      where: {
        $or: [{ buyer_id: userId }, { seller_id: userId }]
      },
      include: [
        { model: Publication, attributes: ['id', 'titulo', 'imagenes', 'estado'] },
        {
          model: Message,
          limit: 1,
          order: [['created_at', 'DESC']],
          attributes: ['content', 'created_at', 'read']
        }
      ],
      order: [['updated_at', 'DESC']]
    });
    return { status: 200, body: { success: true, data: conversations } };
  }

  async getById(id, userId) {
    const conv = await Conversation.findByPk(id, {
      include: [
        { model: Publication, attributes: ['id', 'titulo', 'imagenes', 'estado', 'precio'] },
        {
          model: Message,
          include: [{ model: User, as: 'remitente', attributes: ['id', 'nombre', 'avatar_url'] }],
          order: [['created_at', 'ASC']]
        }
      ]
    });

    if (!conv) return { status: 404, body: { success: false, message: 'Conversación no encontrada' } };

    // Solo los participantes pueden ver
    if (conv.buyer_id !== userId && conv.seller_id !== userId) {
      return { status: 403, body: { success: false, message: 'Sin acceso a esta conversación' } };
    }

    // Marcar mensajes como leídos
    await Message.update(
      { read: true },
      { where: { conversation_id: id, sender_id: { $ne: userId }, read: false } }
    );

    return { status: 200, body: { success: true, data: conv } };
  }

  async create(buyerId, data) {
    const { publication_id, seller_id } = data;
    if (!publication_id || !seller_id) {
      return { status: 400, body: { success: false, message: 'publication_id y seller_id son obligatorios' } };
    }
    if (buyerId === seller_id) {
      return { status: 400, body: { success: false, message: 'No podés iniciar una conversación con vos mismo' } };
    }

    // Verificar si ya existe conversación entre estos usuarios para esta publicación
    const existing = await Conversation.findOne({
      where: { publication_id, buyer_id: buyerId, seller_id }
    });
    if (existing) {
      return { status: 200, body: { success: true, message: 'Conversación existente', data: existing } };
    }

    const conv = await Conversation.create({ publication_id, buyer_id: buyerId, seller_id });
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
    if (conv.buyer_id !== senderId && conv.seller_id !== senderId) {
      return { status: 403, body: { success: false, message: 'No sos participante de esta conversación' } };
    }

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
