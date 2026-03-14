const { Exchange, User, Publication } = require('../models');

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

    // Solo participantes o admin pueden ver
    if (exchange.buyer_id !== userId && exchange.seller_id !== userId && userTipo !== 'admin') {
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

    // co2 estimado: ~2.5 kg CO2 por kg reciclado (configurable)
    const co2 = kg_aproximados ? parseFloat(kg_aproximados) * 2.5 : null;

    const exchange = await Exchange.create({
      publication_id, buyer_id: buyerId, seller_id,
      cantidad, precio_final, kg_aproximados, co2_ahorrado_kg: co2,
      estado: 'Pendiente'
    });

    return { status: 201, body: { success: true, message: 'Intercambio iniciado', data: exchange } };
  }

  async updateEstado(id, userId, userTipo, estado) {
    const validEstados = ['Pendiente', 'En proceso', 'Completado', 'Cancelado'];
    if (!validEstados.includes(estado)) {
      return { status: 400, body: { success: false, message: `Estado inválido. Valores: ${validEstados.join(', ')}` } };
    }

    const exchange = await Exchange.findByPk(id);
    if (!exchange) return { status: 404, body: { success: false, message: 'Intercambio no encontrado' } };

    if (exchange.buyer_id !== userId && exchange.seller_id !== userId && userTipo !== 'admin') {
      return { status: 403, body: { success: false, message: 'Sin permiso' } };
    }

    const updates = { estado };
    if (estado === 'Completado') updates.completed_at = new Date();

    await exchange.update(updates);
    return { status: 200, body: { success: true, message: `Estado actualizado a ${estado}`, data: exchange } };
  }

  async getMyExchanges(userId) {
    const exchanges = await Exchange.findAll({
      where: { $or: [{ buyer_id: userId }, { seller_id: userId }] },
      include: [{ model: Publication, attributes: ['id', 'titulo', 'imagenes'] }],
      order: [['created_at', 'DESC']]
    });
    return { status: 200, body: { success: true, data: exchanges } };
  }
}

module.exports = new ExchangeService();
