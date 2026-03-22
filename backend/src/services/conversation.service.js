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

      // Buscar conversación existente (INCLUYENDO LAS ELIMINADAS)
      const existing = await Conversation.findOne({
        where: {
          publication_id,
          buyer_id: userId,
          seller_id
        }
      });

      if (existing) {
        // Verificar si la conversación está eliminada por ALGUNO de los dos
        const estaEliminadaPorActual = existing.buyer_id === userId 
          ? existing.deleted_by_buyer 
          : existing.deleted_by_seller;
        
        const estaEliminadaPorOtro = existing.buyer_id === userId 
          ? existing.deleted_by_seller 
          : existing.deleted_by_buyer;

        // Si está eliminada por el actual, el otro, o ambos, reactivar
        if (estaEliminadaPorActual || estaEliminadaPorOtro) {
          console.log(`🔄 Reactivando conversación ${existing.id} para usuario ${userId}`);
          
          // Resetear ambos flags (reactivar completamente)
          await existing.update({ 
            deleted_by_buyer: false,
            deleted_by_seller: false
          });
          
          // Obtener la conversación actualizada
          const conversation = await this.getConversationWithUsers(existing.id);
          
          // Notificar al otro usuario que la conversación fue reactivada
          const otroUsuarioId = existing.buyer_id === userId ? existing.seller_id : existing.buyer_id;
          
          // 🔥 USAR GLOBAL.IO
          const io = global.io;
          
          if (io) {
            console.log(`📢 Emitiendo conversation-reactivated a usuario: ${otroUsuarioId}`);
            console.log(`📢 Sala: user:${otroUsuarioId}`);
            
            io.to(`user:${otroUsuarioId}`).emit('conversation-reactivated', {
              conversationId: existing.id,
              message: 'El otro usuario ha reactivado la conversación',
              reactivatedBy: userId,
              timestamp: new Date().toISOString()
            });
            
            console.log(`✅ Evento conversation-reactivated emitido correctamente`);
          } else {
            console.error(`❌ Socket.io NO disponible en conversation.service`);
          }
          
          return {
            status: 200,
            body: { success: true, message: 'Conversación reactivada', data: conversation }
          };
        }
        
        // Si no está eliminada por nadie, devolver la existente
        const conversation = await this.getConversationWithUsers(existing.id);
        return {
          status: 200,
          body: { success: true, message: 'Conversación existente', data: conversation }
        };
      }

      // No existe, crear nueva
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

      // Si el usuario actual eliminó, no mostrar
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

      // Verificar si el otro usuario eliminó (para mostrar warning en frontend)
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
      conversationData.deleted_by_other = otroUsuarioDeleted; // Flag para el frontend

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
      
      // Guardar quién es el otro usuario antes de modificar
      const otroUsuarioId = conversation.buyer_id === userId 
        ? conversation.seller_id 
        : conversation.buyer_id;
      
      // Verificar si la conversación tiene mensajes
      const messagesCount = await Message.count({
        where: { conversation_id: conversationId }
      });
      
      // Si no tiene mensajes, eliminar directamente (sin notificar al otro)
      if (messagesCount === 0) {
        console.log(`🗑️ Eliminando conversación sin mensajes: ${conversationId}`);
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
      
      // Si tiene mensajes, marcar como eliminado para el usuario
      if (conversation.buyer_id === userId) {
        await conversation.update({ deleted_by_buyer: true });
      } else {
        await conversation.update({ deleted_by_seller: true });
      }
      
      const updated = await Conversation.findByPk(conversationId);
      let permanentlyDeleted = false;
      
      // Si ambos borraron, eliminar permanentemente
      if (updated.deleted_by_buyer && updated.deleted_by_seller) {
        await Message.destroy({ where: { conversation_id: conversationId } });
        await updated.destroy();
        permanentlyDeleted = true;
      }
      
      // Notificar al otro usuario que esta conversación fue eliminada
      const io = global.io;
      if (io) {
        console.log(`📢 Emitiendo conversation-deleted a usuario: ${otroUsuarioId}`);
        io.to(`user:${otroUsuarioId}`).emit('conversation-deleted', {
          conversationId,
          deletedBy: userId,
          permanentlyDeleted: permanentlyDeleted,
          message: 'La conversación fue eliminada por el otro usuario',
          timestamp: new Date().toISOString()
        });
        console.log(`✅ Evento conversation-deleted emitido correctamente`);
      } else {
        console.error(`❌ Socket.io NO disponible para emitir conversation-deleted`);
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