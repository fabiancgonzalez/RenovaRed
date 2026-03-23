const { Conversation, User, Message, Publication, Category } = require('../models');
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
        const estaEliminadaPorActual = existing.buyer_id === userId 
          ? existing.deleted_by_buyer 
          : existing.deleted_by_seller;
        
        const estaEliminadaPorOtro = existing.buyer_id === userId 
          ? existing.deleted_by_seller 
          : existing.deleted_by_buyer;

        if (estaEliminadaPorActual || estaEliminadaPorOtro) {
          await existing.update({ 
            deleted_by_buyer: false,
            deleted_by_seller: false
          });
          
          const conversation = await this.getConversationWithUsers(existing.id);
          
          const otroUsuarioId = existing.buyer_id === userId ? existing.seller_id : existing.buyer_id;
          const io = global.io;
          
          if (io) {
            io.to(`user:${otroUsuarioId}`).emit('conversation-reactivated', {
              conversationId: existing.id,
              message: 'El otro usuario ha reactivado la conversación',
              reactivatedBy: userId,
              timestamp: new Date().toISOString()
            });
          }
          
          return {
            status: 200,
            body: { success: true, message: 'Conversación reactivada', data: conversation }
          };
        }
        
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
        attributes: ['id', 'nombre', 'email', 'telefono', 'avatar_url', 'last_login', 'tipo', 'ubicacion_texto']
      }),
      User.findByPk(conversation.seller_id, {
        attributes: ['id', 'nombre', 'email', 'telefono', 'avatar_url', 'last_login', 'tipo', 'ubicacion_texto']
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
            attributes: ['id', 'nombre', 'email', 'telefono', 'avatar_url', 'last_login', 'tipo', 'ubicacion_texto']
          },
          { 
            model: User, 
            as: 'vendedor', 
            attributes: ['id', 'nombre', 'email', 'telefono', 'avatar_url', 'last_login', 'tipo', 'ubicacion_texto']
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
        
        const comprador = convPlain.comprador || { id: null, nombre: null, email: null, telefono: null, avatar_url: null, last_login: null, tipo: null, ubicacion_texto: null };
        const vendedor = convPlain.vendedor || { id: null, nombre: null, email: null, telefono: null, avatar_url: null, last_login: null, tipo: null, ubicacion_texto: null };
        
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
            attributes: ['id', 'nombre', 'email', 'telefono', 'avatar_url', 'last_login', 'tipo', 'ubicacion_texto']
          },
          { 
            model: User, 
            as: 'vendedor', 
            attributes: ['id', 'nombre', 'email', 'telefono', 'avatar_url', 'last_login', 'tipo', 'ubicacion_texto']
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

      const otroUsuarioDeleted = conversation.buyer_id === userId 
        ? conversation.deleted_by_seller 
        : conversation.deleted_by_buyer;

      const publication = await Publication.findByPk(conversation.publication_id, {
        attributes: ['id', 'titulo', 'descripcion', 'imagenes', 'precio', 'cantidad', 'estado'],
        include: [{
          model: Category,
          as: 'categoria',
          attributes: ['id', 'nombre', 'color']
        }]
      });

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
      conversationData.publication = publication;
      conversationData.deleted_by_other = otroUsuarioDeleted;

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
      
      const otroUsuarioId = conversation.buyer_id === userId 
        ? conversation.seller_id 
        : conversation.buyer_id;
      
      const messagesCount = await Message.count({
        where: { conversation_id: conversationId }
      });
      
      if (messagesCount === 0) {
        await conversation.destroy();
        
        return {
          status: 200,
          body: { 
            success: true, 
            message: 'Conversación eliminada (no tenía mensajes)',
            permanentlyDeleted: true
          }
        };
      }
      
      if (conversation.buyer_id === userId) {
        await conversation.update({ deleted_by_buyer: true });
      } else {
        await conversation.update({ deleted_by_seller: true });
      }
      
      const updated = await Conversation.findByPk(conversationId);
      let permanentlyDeleted = false;
      
      if (updated.deleted_by_buyer && updated.deleted_by_seller) {
        await Message.destroy({ where: { conversation_id: conversationId } });
        await updated.destroy();
        permanentlyDeleted = true;
      }
      
      const io = global.io;
      if (io) {
        io.to(`user:${otroUsuarioId}`).emit('conversation-deleted', {
          conversationId,
          deletedBy: userId,
          permanentlyDeleted: permanentlyDeleted,
          message: 'La conversación fue eliminada por el otro usuario',
          timestamp: new Date().toISOString()
        });
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

  async getAllConversationsForAdmin(page = 1, limit = 6, filter = 'all', search = '') {
    try {
      const offset = (page - 1) * limit;
      
      let estadoFilter = {};
      if (filter === 'activas') {
        estadoFilter = { estado: 'pendiente' };
      } else if (filter === 'completadas') {
        estadoFilter = { estado: 'completado' };
      } else if (filter === 'eliminadas') {
        estadoFilter = {
          [Op.or]: [
            { deleted_by_buyer: true },
            { deleted_by_seller: true }
          ]
        };
      }
      
      let searchFilter = {};
      if (search && search.trim()) {
        searchFilter = {
          [Op.or]: [
            { '$comprador.nombre$': { [Op.iLike]: `%${search}%` } },
            { '$vendedor.nombre$': { [Op.iLike]: `%${search}%` } },
            { '$comprador.email$': { [Op.iLike]: `%${search}%` } },
            { '$vendedor.email$': { [Op.iLike]: `%${search}%` } }
          ]
        };
      }
      
      const { count, rows } = await Conversation.findAndCountAll({
        where: {
          ...estadoFilter,
          ...searchFilter
        },
        include: [
          { 
            model: User, 
            as: 'comprador', 
            attributes: ['id', 'nombre', 'email', 'tipo', 'avatar_url']
          },
          { 
            model: User, 
            as: 'vendedor', 
            attributes: ['id', 'nombre', 'email', 'tipo', 'avatar_url']
          },
          {
            model: Publication,
            attributes: ['id', 'titulo']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [['updated_at', 'DESC']],
        subQuery: false
      });
      
      const conversationsWithStats = await Promise.all(rows.map(async (conv) => {
        const messageCount = await Message.count({
          where: { conversation_id: conv.id }
        });
        
        const lastMessage = await Message.findOne({
          where: { conversation_id: conv.id },
          order: [['created_at', 'DESC']]
        });
        
        const convPlain = conv.get({ plain: true });
        
        return {
          id: convPlain.id,
          comprador: convPlain.comprador,
          vendedor: convPlain.vendedor,
          publication: convPlain.Publication,
          estado: convPlain.estado,
          deleted_by_buyer: convPlain.deleted_by_buyer,
          deleted_by_seller: convPlain.deleted_by_seller,
          created_at: convPlain.created_at,
          updated_at: convPlain.updated_at,
          messageCount,
          lastMessageAt: lastMessage?.created_at || convPlain.created_at
        };
      }));
      
      const allConversations = await Conversation.findAll({
        include: [
          { model: User, as: 'comprador', attributes: ['id'] },
          { model: User, as: 'vendedor', attributes: ['id'] }
        ]
      });
      
      let totalMessages = 0;
      let activeCount = 0;
      let noResponseCount = 0;
      
      for (const conv of allConversations) {
        const msgCount = await Message.count({ where: { conversation_id: conv.id } });
        totalMessages += msgCount;
        
        if (conv.estado === 'pendiente') activeCount++;
        
        if (msgCount === 1) noResponseCount++;
      }
      
      return {
        status: 200,
        body: {
          success: true,
          data: {
            conversations: conversationsWithStats,
            pagination: {
              total: count,
              page: parseInt(page),
              limit: parseInt(limit),
              pages: Math.ceil(count / limit)
            },
            stats: {
              totalMessages,
              totalConversations: allConversations.length,
              activeConversations: activeCount,
              noResponseConversations: noResponseCount
            }
          }
        }
      };
    } catch (error) {
      console.error('Error en getAllConversationsForAdmin:', error);
      return { status: 500, body: { success: false, message: error.message } };
    }
  }

  async deleteConversationPermanently(conversationId) {
    try {
      const conversation = await Conversation.findByPk(conversationId);
      
      if (!conversation) {
        return { status: 404, body: { success: false, message: 'Conversación no encontrada' } };
      }
      
      const buyerId = conversation.buyer_id;
      const sellerId = conversation.seller_id;
      
      await Message.destroy({ where: { conversation_id: conversationId } });
      await conversation.destroy();
      
      const io = global.io;
      if (io) {
        io.to(`user:${buyerId}`).to(`user:${sellerId}`).emit('conversation-deleted-by-admin', {
          conversationId,
          message: 'Un administrador ha eliminado esta conversación'
        });
      }
      
      return {
        status: 200,
        body: { success: true, message: 'Conversación eliminada permanentemente' }
      };
    } catch (error) {
      console.error('Error en deleteConversationPermanently:', error);
      return { status: 500, body: { success: false, message: error.message } };
    }
  }
}

module.exports = new ConversationService();