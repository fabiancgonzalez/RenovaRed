const { Exchange, User, Publication, Conversation, Message } = require('../models');
const { Op } = require('sequelize');

class ExchangeService {
  
  async getAll({ page = 1, limit = 20, estado, buyer_id, seller_id } = {}) {
    const where = {};
    if (estado)    where.estado = estado;
    if (buyer_id)  where.buyer_id = buyer_id;
    if (seller_id) where.seller_id = seller_id;

    const offset = (page - 1) * limit;
    const { count, rows } = await Exchange.findAndCountAll({
      where,
      include: [
        { model: Publication, attributes: ['id', 'titulo', 'imagenes'] },
        { model: User, as: 'comprador', foreignKey: 'buyer_id', attributes: ['id', 'nombre', 'avatar_url'] },
        { model: User, as: 'vendedor', foreignKey: 'seller_id', attributes: ['id', 'nombre', 'avatar_url'] }
      ],
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    return {
      status: 200,
      body: {
        success: true,
        data: rows,
        pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) }
      }
    };
  }

  async getById(id, userId, userTipo) {
    const exchange = await Exchange.findByPk(id, {
      include: [
        { model: Publication, attributes: ['id', 'titulo', 'imagenes', 'precio'] },
        { model: User, as: 'comprador', foreignKey: 'buyer_id', attributes: ['id', 'nombre', 'telefono', 'avatar_url'] },
        { model: User, as: 'vendedor', foreignKey: 'seller_id', attributes: ['id', 'nombre', 'telefono', 'avatar_url'] }
      ]
    });

    if (!exchange) return { status: 404, body: { success: false, message: 'Intercambio no encontrado' } };

    if (exchange.buyer_id !== userId && exchange.seller_id !== userId && userTipo !== 'Admin') {
      return { status: 403, body: { success: false, message: 'Sin acceso a este intercambio' } };
    }

    return { status: 200, body: { success: true, data: exchange } };
  }

  async create(buyerId, data) {
    const { publication_id, seller_id, cantidad, precio_final, kg_aproximados } = data;

    if (!publication_id || !seller_id) {
      return { status: 400, body: { success: false, message: 'publication_id y seller_id son obligatorios' } };
    }

    const pub = await Publication.findByPk(publication_id);
    if (!pub) return { status: 404, body: { success: false, message: 'Publicación no encontrada' } };
    if (pub.estado !== 'Disponible') {
      return { status: 409, body: { success: false, message: 'La publicación no está disponible' } };
    }

    const co2 = kg_aproximados ? parseFloat(kg_aproximados) * 2.5 : null;

    const exchange = await Exchange.create({
      publication_id, buyer_id: buyerId, seller_id,
      cantidad, precio_final, kg_aproximados, co2_ahorrado_kg: co2,
      estado: 'Pendiente'
    });

    return { status: 201, body: { success: true, message: 'Intercambio iniciado', data: exchange } };
  }

  async updateEstado(id, userId, userTipo, estado) {
    const validEstados = ['Pendiente', 'En proceso', 'Aceptado', 'Rechazado', 'Completado', 'Cancelado'];
    if (!validEstados.includes(estado)) {
      return { status: 400, body: { success: false, message: `Estado inválido. Valores: ${validEstados.join(', ')}` } };
    }

    const exchange = await Exchange.findByPk(id);
    if (!exchange) return { status: 404, body: { success: false, message: 'Intercambio no encontrado' } };

    if (exchange.buyer_id !== userId && exchange.seller_id !== userId && userTipo !== 'Admin') {
      return { status: 403, body: { success: false, message: 'Sin permiso' } };
    }

    const updates = { estado };
    if (estado === 'Completado') updates.completed_at = new Date();

    await exchange.update(updates);
    return { status: 200, body: { success: true, message: `Estado actualizado a ${estado}`, data: exchange } };
  }

  async getMyExchanges(userId) {
    const exchanges = await Exchange.findAll({
      where: { 
        [Op.or]: [{ buyer_id: userId }, { seller_id: userId }] 
      },
      include: [
        { model: Publication, attributes: ['id', 'titulo', 'imagenes'] },
        { model: User, as: 'comprador', attributes: ['id', 'nombre', 'avatar_url'] },
        { model: User, as: 'vendedor', attributes: ['id', 'nombre', 'avatar_url'] }
      ],
      order: [['created_at', 'DESC']]
    });
    return { status: 200, body: { success: true, data: exchanges } };
  }

  async requestExchange(userId, data) {
    try {
      const { conversationId, publicationId, sellerId, kg, price, notes } = data;
      
      if (!kg || kg <= 0) {
        return { status: 400, body: { success: false, message: 'La cantidad debe ser mayor a 0' } };
      }
      
      const conversation = await Conversation.findByPk(conversationId, {
        include: [
          { model: User, as: 'comprador', attributes: ['id', 'nombre', 'avatar_url'] },
          { model: User, as: 'vendedor', attributes: ['id', 'nombre', 'avatar_url'] }
        ]
      });
      
      if (!conversation) {
        return { status: 404, body: { success: false, message: 'Conversación no encontrada' } };
      }
      
      if (conversation.buyer_id !== userId) {
        return { status: 403, body: { success: false, message: 'Solo el comprador puede solicitar un intercambio' } };
      }
      
      const pendingExchange = await Exchange.findOne({ 
        where: { 
          conversation_id: conversationId,
          estado: 'Pendiente'
        } 
      });
      
      if (pendingExchange) {
        return { status: 400, body: { success: false, message: 'Ya hay una solicitud de intercambio pendiente' } };
      }
      
      const publication = await Publication.findByPk(publicationId);
      if (!publication) {
        return { status: 404, body: { success: false, message: 'Publicación no encontrada' } };
      }
      
      const currentStock = parseFloat(publication.cantidad) || 0;
      if (kg > currentStock) {
        return { 
          status: 400, 
          body: { 
            success: false, 
            message: `Stock insuficiente. Solo hay ${currentStock}kg disponibles` 
          } 
        };
      }
      
      const exchange = await Exchange.create({
        conversation_id: conversationId,
        publication_id: publicationId,
        buyer_id: userId,
        seller_id: sellerId,
        cantidad: kg,
        precio_final: price,
        kg_aproximados: kg,
        notas: notes,
        estado: 'Pendiente'
      });
      
      const buyer = conversation.comprador;
      
      const systemMessage = await Message.create({
        conversation_id: conversationId,
        sender_id: userId,
        content: `📦 SOLICITUD DE INTERCAMBIO: ${kg}kg de "${publication.titulo}" por $${price || 'a convenir'}. Esperando confirmación del vendedor.`,
        read: false
      });
      
      const io = global.io;
      if (io) {
        const messageData = {
          id: systemMessage.id,
          content: systemMessage.content,
          created_at: systemMessage.created_at,
          remitente: buyer.nombre,
          remitenteId: buyer.id,
          avatar: buyer.avatar_url,
          read: false
        };
        
        io.to(`user:${userId}`).to(`user:${sellerId}`).emit('new-message', {
          conversationId,
          message: messageData
        });
        
        io.to(`user:${sellerId}`).emit('exchange-request', {
          conversationId,
          exchangeId: exchange.id,
          buyerName: buyer.nombre,
          kg,
          price
        });
      }
      
      return {
        status: 201,
        body: { 
          success: true, 
          message: 'Solicitud de intercambio enviada. Esperando confirmación del vendedor.',
          data: exchange 
        }
      };
      
    } catch (error) {
      console.error('Error requesting exchange:', error);
      return { status: 500, body: { success: false, message: error.message } };
    }
  }
  
  async respondToExchange(userId, exchangeId, action) {
    try {
      const exchange = await Exchange.findByPk(exchangeId, {
        include: [
          { model: Conversation, as: 'conversation', include: [
            { model: User, as: 'comprador', attributes: ['id', 'nombre', 'avatar_url'] },
            { model: User, as: 'vendedor', attributes: ['id', 'nombre', 'avatar_url'] }
          ] },
          { model: Publication, as: 'publication' }
        ]
      });
      
      if (!exchange) {
        return { status: 404, body: { success: false, message: 'Solicitud no encontrada' } };
      }
      
      if (exchange.seller_id !== userId) {
        return { status: 403, body: { success: false, message: 'Solo el vendedor puede responder' } };
      }
      
      if (exchange.estado !== 'Pendiente') {
        return { status: 400, body: { success: false, message: 'Esta solicitud ya fue respondida' } };
      }
      
      const conversation = exchange.conversation;
      const publication = exchange.publication;
      const comprador = conversation?.comprador;
      const vendedor = conversation?.vendedor;
      
      if (action === 'aceptar') {
        const currentStock = parseFloat(publication.cantidad) || 0;
        const requestedKg = parseFloat(exchange.cantidad);
        
        if (requestedKg > currentStock) {
          return { 
            status: 400, 
            body: { 
              success: false, 
              message: `Stock insuficiente. Solo hay ${currentStock}kg disponibles` 
            } 
          };
        }
        
        const newStock = currentStock - requestedKg;
        await publication.update({ 
          cantidad: newStock.toString(),
          estado: newStock <= 0 ? 'Agotado' : publication.estado
        });
        
        const co2Saved = requestedKg * 2.5;
        
        await exchange.update({ 
          estado: 'Aceptado',
          co2_ahorrado_kg: co2Saved,
          completed_at: new Date()
        });
        
        const systemMessage = await Message.create({
          conversation_id: exchange.conversation_id,
          sender_id: userId,
          content: `✅ INTERCAMBIO ACEPTADO: ${requestedKg}kg de "${publication.titulo}". ¡Intercambio completado con éxito! 🌱 Se ahorraron ${co2Saved}kg de CO₂.`,
          read: false
        });
        
        const io = global.io;
        if (io) {
          const messageData = {
            id: systemMessage.id,
            content: systemMessage.content,
            created_at: systemMessage.created_at,
            remitente: vendedor?.nombre || 'Vendedor',
            remitenteId: userId,
            avatar: vendedor?.avatar_url,
            read: false
          };
          
          io.to(`user:${exchange.buyer_id}`).to(`user:${exchange.seller_id}`).emit('new-message', {
            conversationId: exchange.conversation_id,
            message: messageData
          });
          
          io.to(`user:${exchange.buyer_id}`).emit('exchange-accepted', {
            conversationId: exchange.conversation_id,
            exchangeId: exchange.id,
            kg: requestedKg,
            co2Saved
          });
        }
        
        return {
          status: 200,
          body: { 
            success: true, 
            message: `Intercambio aceptado. Se reservaron ${requestedKg}kg. ¡Gracias por contribuir!`,
            data: exchange,
            co2Saved
          }
        };
        
      } else if (action === 'rechazar') {
        await exchange.update({ estado: 'Rechazado' });
        
        const systemMessage = await Message.create({
          conversation_id: exchange.conversation_id,
          sender_id: userId,
          content: `❌ SOLICITUD RECHAZADA: El vendedor no pudo aceptar el intercambio en este momento.`,
          read: false
        });
        
        const io = global.io;
        if (io) {
          const messageData = {
            id: systemMessage.id,
            content: systemMessage.content,
            created_at: systemMessage.created_at,
            remitente: vendedor?.nombre || 'Vendedor',
            remitenteId: userId,
            avatar: vendedor?.avatar_url,
            read: false
          };
          
          io.to(`user:${exchange.buyer_id}`).to(`user:${exchange.seller_id}`).emit('new-message', {
            conversationId: exchange.conversation_id,
            message: messageData
          });
          
          io.to(`user:${exchange.buyer_id}`).emit('exchange-rejected', {
            conversationId: exchange.conversation_id,
            exchangeId: exchange.id
          });
        }
        
        return {
          status: 200,
          body: { success: true, message: 'Solicitud rechazada' }
        };
      }
      
    } catch (error) {
      console.error('Error responding to exchange:', error);
      return { status: 500, body: { success: false, message: error.message } };
    }
  }
  
  async getExchangeStatus(conversationId) {
    try {
      const pendingExchange = await Exchange.findOne({
        where: { 
          conversation_id: conversationId,
          estado: 'Pendiente'
        },
        order: [['created_at', 'DESC']]
      });
      
      const lastCompleted = await Exchange.findOne({
        where: { 
          conversation_id: conversationId,
          estado: 'Aceptado'
        },
        order: [['completed_at', 'DESC']]
      });
      
      return {
        status: 200,
        body: {
          success: true,
          hasRequest: !!pendingExchange,
          exchange: pendingExchange ? {
            id: pendingExchange.id,
            estado: pendingExchange.estado,
            cantidad: pendingExchange.cantidad,
            precio: pendingExchange.precio_final,
            notas: pendingExchange.notas,
            createdAt: pendingExchange.created_at
          } : null,
          lastCompleted: lastCompleted ? {
            cantidad: lastCompleted.cantidad,
            fecha: lastCompleted.completed_at,
            co2Ahorrado: lastCompleted.co2_ahorrado_kg
          } : null
        }
      };
      
    } catch (error) {
      console.error('Error getting exchange status:', error);
      return { status: 500, body: { success: false, message: error.message } };
    }
  }
}

module.exports = new ExchangeService();