const { User, Publication, Favorite, Category } = require('../models');
const bcrypt = require('bcryptjs');

class UserService {
  // Campos seguros a devolver (sin password_hash)
  _safeFields() {
    return ['id', 'nombre', 'email', 'tipo', 'telefono', 'avatar_url',
      'ubicacion_texto', 'place_id', 'is_active', 'last_login',
      'created_at', 'updated_at'];
  }

  async getAll({ page = 1, limit = 20, tipo, is_active } = {}) {
    const where = {};
    if (tipo)      where.tipo = tipo;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const offset = (page - 1) * limit;
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: this._safeFields(),
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

  async getById(id) {
    const user = await User.findByPk(id, {
      attributes: this._safeFields()
    });
    if (!user) return { status: 404, body: { success: false, message: 'Usuario no encontrado' } };
    return { status: 200, body: { success: true, data: user } };
  }

  async update(id, requesterId, requesterTipo, data) {
    // Solo el propio usuario o un admin puede actualizar
    if (requesterId !== id && requesterTipo !== 'admin') {
      return { status: 403, body: { success: false, message: 'Sin permiso para modificar este usuario' } };
    }

    const user = await User.findByPk(id);
    if (!user) return { status: 404, body: { success: false, message: 'Usuario no encontrado' } };

    // Campos permitidos para actualización
    const allowed = ['nombre', 'telefono', 'avatar_url', 'ubicacion_texto', 'place_id', 'google_places_data'];
    const updates = {};
    allowed.forEach(f => { if (data[f] !== undefined) updates[f] = data[f]; });

    // Si envían nueva contraseña, hashearla
    if (data.password) {
      updates.password_hash = await bcrypt.hash(data.password, 12);
    }

    await user.update(updates);
    const fresh = await User.findByPk(id, { attributes: this._safeFields() });
    return { status: 200, body: { success: true, message: 'Usuario actualizado', data: fresh } };
  }

  async deactivate(id, requesterId, requesterTipo) {
    if (requesterId !== id && requesterTipo !== 'admin') {
      return { status: 403, body: { success: false, message: 'Sin permiso' } };
    }
    const user = await User.findByPk(id);
    if (!user) return { status: 404, body: { success: false, message: 'Usuario no encontrado' } };

    await user.update({ is_active: false });
    return { status: 200, body: { success: true, message: 'Usuario desactivado' } };
  }

  async getMyPublications(userId, { page = 1, limit = 10, categoria_id } = {}) {
    const offset = (page - 1) * limit;
    const where = { user_id: userId };

    if (categoria_id) {
      where.categoria_id = categoria_id;
    }

    const { count, rows } = await Publication.findAndCountAll({
      where,
      include: [
        { model: Category, as: 'categoria', attributes: ['id', 'nombre', 'icono', 'descripcion', 'color'], required: false }
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
}

module.exports = new UserService();
