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
    const existingSocket = onlineUsers.get(socket.userId);
    if (existingSocket) {
      const oldSocket = io.sockets.sockets.get(existingSocket);
      if (oldSocket) {
        oldSocket.leave(`user:${socket.userId}`);
      }
    }
    
    onlineUsers.set(socket.userId, socket.id);
    
    await User.update(
      { last_login: new Date() },
      { where: { id: socket.userId } }
    );
    
    io.emit('user-online', { userId: socket.userId });
    socket.join(`user:${socket.userId}`);

    socket.on('join-conversations', (conversationIds) => {
      conversationIds.forEach(id => {
        socket.join(`conv:${id}`);
      });
    });

    socket.on('send-message', async (data) => {
      try {
        const { conversationId, content } = data;
        
        const message = await Message.create({
          conversation_id: conversationId,
          sender_id: socket.userId,
          content,
          read: false
        });

        const messageWithUser = await Message.findByPk(message.id, {
          include: [{ model: User, as: 'remitente', attributes: ['id', 'nombre', 'avatar_url'] }]
        });

        const conversation = await Conversation.findByPk(conversationId, {
          attributes: ['buyer_id', 'seller_id']
        });

        if (!conversation) return;

        await Conversation.update(
          { updated_at: new Date() },
          { where: { id: conversationId } }
        );

        io.to(`user:${conversation.buyer_id}`).to(`user:${conversation.seller_id}`)
          .emit('new-message', {
            conversationId,
            message: {
              id: messageWithUser.id,
              content: messageWithUser.content,
              created_at: messageWithUser.created_at,
              remitente: messageWithUser.remitente.nombre,
              remitenteId: messageWithUser.remitente.id,
              avatar: messageWithUser.remitente.avatar_url,
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
        
        await Message.update(
          { read: true },
          {
            where: {
              id: { [Op.in]: messageIds },
              conversation_id: conversationId
            }
          }
        );
        
        const conversation = await Conversation.findByPk(conversationId, {
          attributes: ['buyer_id', 'seller_id']
        });
        
        if (conversation) {
          const otherUserId = conversation.buyer_id === socket.userId 
            ? conversation.seller_id 
            : conversation.buyer_id;
          
          io.to(`user:${otherUserId}`).emit('messages-read', {
            conversationId,
            messageIds,
            readerId: socket.userId
          });
        }
        
      } catch (error) {
        console.error('Error al marcar mensajes como leídos:', error);
      }
    });

    socket.on('get-online-users', () => {
      const onlineUserIds = Array.from(onlineUsers.keys());
      socket.emit('online-users', { userIds: onlineUserIds });
    });

    socket.on('disconnect', async () => {
      setTimeout(async () => {
        const stillConnected = onlineUsers.get(socket.userId) === socket.id;
        if (stillConnected) {
          onlineUsers.delete(socket.userId);
          io.emit('user-offline', { userId: socket.userId });
          
          await User.update(
            { last_login: new Date() },
            { where: { id: socket.userId } }
          );
        }
      }, 1000);
    });
  });

  function getOnlineUsers() {
    return Array.from(onlineUsers.keys());
  }

  return {
    getOnlineUsers
  };
};