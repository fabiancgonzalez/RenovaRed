const { Conversation, User, Message } = require('../models');
const { Op } = require('sequelize');

class ConversationService {
  async create(userId, data) {
    try {
      const { publication_id, seller_id } = data;

      if (!publication_id || !seller_id) {
        return {
          status: 400,
          body: { success: false, message: 'publication_id y seller_id son obligatorios' }
        };
      }

      if (userId === seller_id) {
        return {
          status: 400,
          body: { success: false, message: 'No podés iniciar una conversación con vos mismo' }
        };
      }

      const existing = await Conversation.findOne({
        where: {
          publication_id,
          buyer_id: userId,
          seller_id
        }
      });

      if (existing) {
        const conversation = await this.getConversationWithUsers(existing.id);
        return {
          status: 200,
          body: { success: true, message: 'Conversación existente', data: conversation }
        };
      }

      const conversation = await Conversation.create({
        publication_id,
        buyer_id: userId,
        seller_id,
        estado: 'pendiente'
      });

      const conversationWithUsers = await this.getConversationWithUsers(conversation.id);

      return {
        status: 201,
        body: { success: true, message: 'Conversación iniciada', data: conversationWithUsers }
      };
    } catch (error) {
      console.error('Error en create:', error);
      return { status: 500, body: { success: false, message: error.message } };
    }
  }

  async getConversationWithUsers(conversationId) {
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) return null;

    const [comprador, vendedor] = await Promise.all([
      User.findByPk(conversation.buyer_id, {
        attributes: ['id', 'nombre', 'avatar_url', 'last_login']
      }),
      User.findByPk(conversation.seller_id, {
        attributes: ['id', 'nombre', 'avatar_url', 'last_login']
      })
    ]);

    const conversationData = conversation.get({ plain: true });
    conversationData.comprador = comprador;
    conversationData.vendedor = vendedor;

    return conversationData;
  }

  async getMyConversations(userId) {
    try {
      const conversations = await Conversation.findAll({
        where: {
          [Op.or]: [
            { buyer_id: userId },
            { seller_id: userId }
          ]
        },
        include: [
          { 
            model: User, 
            as: 'comprador', 
            attributes: ['id', 'nombre', 'avatar_url', 'last_login'] 
          },
          { 
            model: User, 
            as: 'vendedor', 
            attributes: ['id', 'nombre', 'avatar_url', 'last_login'] 
          }
        ],
        order: [['updated_at', 'DESC']]
      });

      const filteredConversations = conversations.filter(conv => {
        if (conv.buyer_id === userId && conv.deleted_by_buyer) return false;
        if (conv.seller_id === userId && conv.deleted_by_seller) return false;
        return true;
      });

      if (!filteredConversations || filteredConversations.length === 0) {
        return {
          status: 200,
          body: { success: true, data: [] }
        };
      }

      const conversationIds = filteredConversations.map(c => c.id);
      const lastMessages = await Message.findAll({
        where: { conversation_id: { [Op.in]: conversationIds } },
        attributes: ['conversation_id', 'content', 'created_at'],
        order: [['created_at', 'DESC']]
      });

      const lastMessageMap = {};
      lastMessages.forEach(msg => {
        if (!lastMessageMap[msg.conversation_id]) {
          lastMessageMap[msg.conversation_id] = msg;
        }
      });

      const result = filteredConversations.map(conv => {
        const convPlain = conv.get({ plain: true });
        
        const comprador = convPlain.comprador || { id: null, nombre: null, avatar_url: null, last_login: null };
        const vendedor = convPlain.vendedor || { id: null, nombre: null, avatar_url: null, last_login: null };
        
        convPlain.ultimo_mensaje = lastMessageMap[convPlain.id]?.content || '';
        convPlain.ultimo_mensaje_at = lastMessageMap[convPlain.id]?.created_at || convPlain.updated_at;
        
        return {
          id: convPlain.id,
          publication_id: convPlain.publication_id,
          buyer_id: convPlain.buyer_id,
          seller_id: convPlain.seller_id,
          comprador: comprador,
          vendedor: vendedor,
          estado: convPlain.estado,
          created_at: convPlain.created_at,
          updated_at: convPlain.updated_at,
          ultimo_mensaje: convPlain.ultimo_mensaje,
          ultimo_mensaje_at: convPlain.ultimo_mensaje_at
        };
      });

      return {
        status: 200,
        body: { success: true, data: result }
      };

    } catch (error) {
      console.error('Error en getMyConversations:', error);
      return { 
        status: 500, 
        body: { 
          success: false, 
          message: 'Error al obtener conversaciones',
          error: error.message 
        } 
      };
    }
  }

  async getById(id, userId) {
    try {
      const conversation = await Conversation.findByPk(id, {
        include: [
          { 
            model: User, 
            as: 'comprador', 
            attributes: ['id', 'nombre', 'avatar_url', 'last_login'] 
          },
          { 
            model: User, 
            as: 'vendedor', 
            attributes: ['id', 'nombre', 'avatar_url', 'last_login'] 
          }
        ]
      });

      if (!conversation) {
        return { 
          status: 404, 
          body: { success: false, message: 'Conversación no encontrada' } 
        };
      }

      if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
        return { 
          status: 403, 
          body: { success: false, message: 'No tenés acceso' } 
        };
      }

      if (conversation.buyer_id === userId && conversation.deleted_by_buyer) {
        return { 
          status: 404, 
          body: { success: false, message: 'Conversación no encontrada' } 
        };
      }
      if (conversation.seller_id === userId && conversation.deleted_by_seller) {
        return { 
          status: 404, 
          body: { success: false, message: 'Conversación no encontrada' } 
        };
      }

      const mensajes = await Message.findAll({
        where: { conversation_id: id },
        include: [{ 
          model: User, 
          as: 'remitente', 
          attributes: ['id', 'nombre', 'avatar_url'] 
        }],
        order: [['created_at', 'ASC']]
      });

      const conversationData = conversation.get({ plain: true });
      conversationData.mensajes = mensajes;

      return {
        status: 200,
        body: { success: true, data: conversationData }
      };

    } catch (error) {
      console.error('Error en getById:', error);
      return { 
        status: 500, 
        body: { 
          success: false, 
          message: 'Error al obtener conversación',
          error: error.message 
        } 
      };
    }
  }

  async deleteForMe(conversationId, userId) {
    try {
      const conversation = await Conversation.findByPk(conversationId);
      
      if (!conversation) {
        return { 
          status: 404, 
          body: { success: false, message: 'Conversación no encontrada' } 
        };
      }
      
      if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
        return { 
          status: 403, 
          body: { success: false, message: 'No tenés permisos' } 
        };
      }
      
      if (conversation.buyer_id === userId) {
        await conversation.update({ deleted_by_buyer: true });
      } else {
        await conversation.update({ deleted_by_seller: true });
      }
      
      const updated = await Conversation.findByPk(conversationId);
      
      if (updated.deleted_by_buyer && updated.deleted_by_seller) {
        await Message.destroy({ where: { conversation_id: conversationId } });
        await updated.destroy();
        
        return {
          status: 200,
          body: { 
            success: true, 
            message: 'Conversación eliminada permanentemente',
            permanentlyDeleted: true
          }
        };
      }
      
      return {
        status: 200,
        body: { 
          success: true, 
          message: 'Conversación eliminada de tu lista',
          permanentlyDeleted: false
        }
      };
      
    } catch (error) {
      console.error('Error en deleteForMe:', error);
      return { 
        status: 500, 
        body: { 
          success: false, 
          message: 'Error al eliminar conversación',
          error: error.message 
        } 
      };
    }
  }

  async updateStatus(id, userId, data) {
    try {
      const { estado, cantidad, precio_final, kg_aproximados } = data;

      const conversation = await Conversation.findByPk(id);
      if (!conversation) {
        return { 
          status: 404, 
          body: { success: false, message: 'Conversación no encontrada' } 
        };
      }

      if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
        return { 
          status: 403, 
          body: { success: false, message: 'No tenés permisos' } 
        };
      }

      if (conversation.buyer_id === userId && conversation.deleted_by_buyer) {
        return { 
          status: 404, 
          body: { success: false, message: 'Conversación no encontrada' } 
        };
      }
      if (conversation.seller_id === userId && conversation.deleted_by_seller) {
        return { 
          status: 404, 
          body: { success: false, message: 'Conversación no encontrada' } 
        };
      }

      const updateData = {};
      if (estado) updateData.estado = estado;
      if (cantidad) updateData.cantidad = cantidad;
      if (precio_final) updateData.precio_final = precio_final;
      if (kg_aproximados) updateData.kg_aproximados = kg_aproximados;
      if (estado === 'completado') updateData.completed_at = new Date();

      await conversation.update(updateData);

      const updatedConversation = await this.getConversationWithUsers(id);

      return {
        status: 200,
        body: { success: true, message: 'Conversación actualizada', data: updatedConversation }
      };

    } catch (error) {
      console.error('Error en updateStatus:', error);
      return { 
        status: 500, 
        body: { 
          success: false, 
          message: 'Error al actualizar conversación',
          error: error.message 
        } 
      };
    }
  }
}

module.exports = new ConversationService();