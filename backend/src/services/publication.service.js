const { Publication, User, Category } = require('../models');
const { Op } = require('sequelize');
const dailyStatsService = require('./dailyStats.service');

class PublicationService {
  async getAll({ page = 1, limit = 20, estado, tipo_usuario, categoria_id, search, user_id, precio_min, precio_max, usuario_nombre, zona_geografica } = {}) {
    const where = {};
    const andConditions = [];

    if (estado)       where.estado = estado;
    if (tipo_usuario) where.tipo_usuario = tipo_usuario;
    if (categoria_id) where.categoria_id = categoria_id;
    if (user_id)      where.user_id = user_id;

    if (search) {
      andConditions.push({
        [Op.or]: [
          { titulo: { [Op.iLike]: `%${search}%` } },
          { descripcion: { [Op.iLike]: `%${search}%` } },
          { ubicacion_texto: { [Op.iLike]: `%${search}%` } }
        ]
      });
    }

    // Filtro por zona geográfica (ubicacion_texto)
    if (zona_geografica && zona_geografica.trim()) {
      andConditions.push({ ubicacion_texto: { [Op.iLike]: `%${zona_geografica.trim()}%` } });
    }

    const priceFilter = {};
    let hasPriceFilter = false;

    if (precio_min && precio_min !== '') {
      const minPrice = Number(precio_min);
      if (!Number.isNaN(minPrice)) {
        priceFilter[Op.gte] = minPrice;
        hasPriceFilter = true;
      }
    }

    if (precio_max && precio_max !== '') {
      const maxPrice = Number(precio_max);
      if (!Number.isNaN(maxPrice)) {
        priceFilter[Op.lte] = maxPrice;
        hasPriceFilter = true;
      }
    }

    if (hasPriceFilter) {
      andConditions.push({ precio: priceFilter });
    }

    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }

    // Filtro por nombre de usuario (join con User)
    const userInclude = {
      model: User,
      as: 'usuario',
      attributes: ['id', 'nombre', 'tipo', 'avatar_url', 'telefono'],
    };
    if (usuario_nombre && usuario_nombre.trim()) {
      userInclude.where = { nombre: { [Op.iLike]: `%${usuario_nombre.trim()}%` } };
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await Publication.findAndCountAll({
      where,
      include: [
        userInclude,
        { model: Category, as: 'categoria', attributes: ['id', 'nombre', 'icono', 'descripcion', 'color'], required: false }
      ],
      limit: parseInt(limit),
      offset,
      order: [['published_at', 'DESC']]
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

  async getById(id) {
    const pub = await Publication.findByPk(id, {
      include: [
        { model: User, as: 'usuario', attributes: ['id', 'nombre', 'tipo', 'avatar_url', 'telefono', 'ubicacion_texto'] },
        { model: Category, as: 'categoria', attributes: ['id', 'nombre', 'icono', 'descripcion', 'color'], required: false }
      ]
    });
    if (!pub) return { status: 404, body: { success: false, message: 'Publicación no encontrada' } };

    // Incrementar vistas
    await pub.increment('vistas');

    return { status: 200, body: { success: true, data: pub } };
  }

  async create(userId, tipoUsuario, data) {
    const { titulo, descripcion, categoria_id, ubicacion_texto, ubicacion_geom,
      place_id, google_places_data, imagenes, disponibilidad, cantidad, precio } = data;

    if (!titulo?.trim()) {
      return { status: 400, body: { success: false, message: 'titulo es obligatorio' } };
    }
    if (!ubicacion_texto?.trim()) {
      return { status: 400, body: { success: false, message: 'ubicacion_texto es obligatorio' } };
    }

    const safeGeom = ubicacion_geom && ubicacion_geom.type === 'Point'
      ? ubicacion_geom
      : { type: 'Point', coordinates: [0, 0] };

    const pub = await Publication.create({
      titulo: titulo.trim(),
      descripcion,
      user_id: userId,
      tipo_usuario: tipoUsuario,
      categoria_id,
      ubicacion_texto,
      ubicacion_geom: safeGeom,
      place_id,
      google_places_data,
      imagenes: imagenes || [],
      disponibilidad: disponibilidad !== undefined ? String(disponibilidad) : null,
      cantidad: cantidad !== undefined ? String(cantidad) : null,
      precio,
      estado: 'Disponible',
      published_at: new Date()
    });

    await dailyStatsService.registerNewPublication();

    return { status: 201, body: { success: true, message: 'Publicación creada', data: pub } };
  }

  async update(id, userId, userTipo, data) {
    const pub = await Publication.findByPk(id);
    if (!pub) return { status: 404, body: { success: false, message: 'Publicación no encontrada' } };

    // Solo el dueño o admin puede editar
    if (pub.user_id !== userId && String(userTipo).toLowerCase() !== 'admin') {
      return { status: 403, body: { success: false, message: 'Sin permiso para editar esta publicación' } };
    }

    const allowed = ['titulo', 'descripcion', 'categoria_id', 'ubicacion_texto', 'ubicacion_geom',
      'place_id', 'google_places_data', 'imagenes', 'disponibilidad', 'cantidad', 'precio', 'estado'];
    const updates = {};
    allowed.forEach(f => { if (data[f] !== undefined) updates[f] = data[f]; });

    await pub.update(updates);
    return { status: 200, body: { success: true, message: 'Publicación actualizada', data: pub } };
  }

  async delete(id, userId, userTipo) {
    const pub = await Publication.findByPk(id);
    if (!pub) return { status: 404, body: { success: false, message: 'Publicación no encontrada' } };

    if (pub.user_id !== userId && String(userTipo).toLowerCase() !== 'admin') {
      return { status: 403, body: { success: false, message: 'Sin permiso para eliminar esta publicación' } };
    }

    await pub.destroy();
    return { status: 200, body: { success: true, message: 'Publicación eliminada' } };
  }
}

module.exports = new PublicationService();
