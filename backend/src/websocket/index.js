const jwt = require('jsonwebtoken');
const { User, Conversation, Message } = require('../models');
const { Op } = require('sequelize');

const onlineUsers = new Map();

module.exports = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Autenticación requerida'));
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`🟢 Usuario conectado: ${socket.userId}`);

    onlineUsers.set(socket.userId, socket.id);

    // fire & forget (no bloquea)
    User.update(
      { last_login: new Date() },
      { where: { id: socket.userId } }
    ).catch(console.error);

    socket.join(`user:${socket.userId}`);

    // enviar usuarios online al conectar
    socket.emit('online-users', {
      userIds: Array.from(onlineUsers.keys())
    });

    io.emit('user-online', { userId: socket.userId });

    socket.on('join-conversations', (conversationIds) => {
      conversationIds.forEach(id => {
        socket.join(`conv:${id}`);
      });
    });

    socket.on('send-message', async (data) => {
      try {
        const { conversationId, content } = data;

        // validaciones
        if (!content || content.trim() === '') return;
        if (content.length > 1000) return;

        const conversation = await Conversation.findByPk(conversationId, {
          attributes: ['buyer_id', 'seller_id', 'deleted_by_buyer', 'deleted_by_seller']
        });

        if (!conversation) return;

        // seguridad
        if (
          conversation.buyer_id !== socket.userId &&
          conversation.seller_id !== socket.userId
        ) {
          return socket.emit('error', { message: 'No autorizado' });
        }

        // 🔥 Verificar si el otro usuario eliminó la conversación
        const otherUserId = conversation.buyer_id === socket.userId 
          ? conversation.seller_id 
          : conversation.buyer_id;
        
        const otherUserDeleted = conversation.buyer_id === otherUserId 
          ? conversation.deleted_by_buyer 
          : conversation.deleted_by_seller;

        if (otherUserDeleted) {
          console.log(`⚠️ El usuario ${otherUserId} eliminó la conversación ${conversationId}`);
          return socket.emit('error', { 
            message: 'No puedes enviar mensajes. El otro usuario eliminó esta conversación.',
            type: 'CONVERSATION_DELETED_BY_OTHER'
          });
        }

        // crear mensaje
        const message = await Message.create({
          conversation_id: conversationId,
          sender_id: socket.userId,
          content,
          read: false
        });

        // evitar query extra
        const user = await User.findByPk(socket.userId, {
          attributes: ['id', 'nombre', 'avatar_url']
        });

        // update async (no bloquea)
        Conversation.update(
          { updated_at: new Date() },
          { where: { id: conversationId } }
        ).catch(console.error);

        io.to(`user:${conversation.buyer_id}`)
          .to(`user:${conversation.seller_id}`)
          .emit('new-message', {
            conversationId,
            message: {
              id: message.id,
              content,
              created_at: message.created_at,
              remitente: user.nombre,
              remitenteId: user.id,
              avatar: user.avatar_url,
              read: false
            }
          });

      } catch (error) {
        console.error('Error al enviar mensaje:', error);
        socket.emit('error', { message: 'Error al enviar mensaje' });
      }
    });

    socket.on('mark-read', async (data) => {
      try {
        const { conversationId, messageIds } = data;

        console.log('📥 mark-read recibido:', { conversationId, messageIds });

        if (!messageIds || messageIds.length === 0) return;

        // Actualizar mensajes como leídos
        const [updatedCount] = await Message.update(
          { read: true },
          {
            where: {
              id: { [Op.in]: messageIds },
              conversation_id: conversationId,
              read: false
            }
          }
        );

        console.log(`✅ ${updatedCount} mensajes marcados como leídos`);

        if (updatedCount === 0) return;

        const conversation = await Conversation.findByPk(conversationId, {
          attributes: ['buyer_id', 'seller_id']
        });

        if (!conversation) return;

        const otherUserId =
          conversation.buyer_id === socket.userId
            ? conversation.seller_id
            : conversation.buyer_id;

        io.to(`user:${otherUserId}`).emit('messages-read', {
          conversationId,
          messageIds,
          readerId: socket.userId
        });

        console.log(`📤 Emitiendo messages-read a usuario: ${otherUserId}`);

      } catch (error) {
        console.error('Error al marcar mensajes como leídos:', error);
      }
    });

    socket.on('disconnect', () => {
      setTimeout(() => {
        const stillConnected = onlineUsers.get(socket.userId) === socket.id;

        if (stillConnected) {
          onlineUsers.delete(socket.userId);

          io.emit('user-offline', { userId: socket.userId });

          User.update(
            { last_login: new Date() },
            { where: { id: socket.userId } }
          ).catch(console.error);
        }
      }, 1000);
    });
  });

  return {
    getOnlineUsers: () => Array.from(onlineUsers.keys())
  };
};