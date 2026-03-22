const { User, Publication, Favorite, Category } = require('../models');
const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');
const UserDTO = require('../dtos/user.dto');

class UserService {
  async getUserStats() {
    const stats = await User.findAll({
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('created_at')), 'fecha'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total']
      ],
      group: [Sequelize.fn('DATE', Sequelize.col('created_at'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('created_at')), 'ASC']],
      raw: true
    });
    return { status: 200, body: { success: true, data: stats } };
  }

  // Campos seguros a devolver (sin password_hash)
  _safeFields() {
    return ['id', 'nombre', 'email', 'tipo', 'telefono', 'avatar_url',
      'ubicacion_texto', 'place_id', 'is_active', 'last_login',
      'created_at', 'updated_at'];
  }

  _isValidCoordinate(lat, lng) {
    return Number.isFinite(lat)
      && Number.isFinite(lng)
      && lat >= -90
      && lat <= 90
      && lng >= -180
      && lng <= 180;
  }

  _extractCoordinatesFromObject(value, depth = 0) {
    if (!value || depth > 5 || typeof value !== 'object') {
      return null;
    }

    const lat = Number(value.lat ?? value.latitude);
    const lng = Number(value.lng ?? value.lon ?? value.longitude);

    if (this._isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = this._extractCoordinatesFromObject(item, depth + 1);
        if (nested) {
          return nested;
        }
      }

      return null;
    }

    for (const nestedValue of Object.values(value)) {
      const nested = this._extractCoordinatesFromObject(nestedValue, depth + 1);
      if (nested) {
        return nested;
      }
    }

    return null;
  }

  _extractCoordinates(user) {
    const geometryCoordinates = user?.ubicacion_geom?.coordinates;

    if (Array.isArray(geometryCoordinates) && geometryCoordinates.length >= 2) {
      const [lng, lat] = geometryCoordinates;
      if (this._isValidCoordinate(lat, lng)) {
        return { lat, lng };
      }
    }

    const placesCoordinates = this._extractCoordinatesFromObject(user?.google_places_data);
    if (placesCoordinates) {
      return placesCoordinates;
    }

    return null;
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

  async getMapLocations() {
    const users = await User.findAll({
      where: { is_active: true },
      attributes: [
        'id',
        'nombre',
        'tipo',
        'avatar_url',
        'ubicacion_texto',
        'ubicacion_geom',
        'google_places_data'
      ],
      order: [['nombre', 'ASC']]
    });

    const locations = users
      .map((user) => {
        const coordinates = this._extractCoordinates(user);
        if (!coordinates) {
          return null;
        }

        return UserDTO.mapLocation(user, coordinates);
      })
      .filter(Boolean);

    return {
      status: 200,
      body: {
        success: true,
        data: locations
      }
    };
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

  async changeRole(id, requesterTipo, newTipo) {
    const VALID_ROLES = ['usuario', 'empresa', 'admin'];
    if (requesterTipo !== 'admin') {
      return { status: 403, body: { success: false, message: 'Solo un administrador puede cambiar roles' } };
    }
    if (!VALID_ROLES.includes(newTipo)) {
      return { status: 400, body: { success: false, message: `Rol inválido. Permitidos: ${VALID_ROLES.join(', ')}` } };
    }
    const user = await User.findByPk(id);
    if (!user) return { status: 404, body: { success: false, message: 'Usuario no encontrado' } };

    await user.update({ tipo: newTipo });
    const fresh = await User.findByPk(id, { attributes: this._safeFields() });
    return { status: 200, body: { success: true, message: `Rol actualizado a "${newTipo}"`, data: fresh } };
  }

  async reactivate(id, requesterTipo) {
    if (requesterTipo !== 'admin') {
      return { status: 403, body: { success: false, message: 'Solo un administrador puede reactivar usuarios' } };
    }
    const user = await User.findByPk(id);
    if (!user) return { status: 404, body: { success: false, message: 'Usuario no encontrado' } };

    await user.update({ is_active: true });
    return { status: 200, body: { success: true, message: 'Usuario reactivado' } };
  }

  async hardDelete(id, requesterTipo) {
    if (requesterTipo !== 'admin') {
      return { status: 403, body: { success: false, message: 'Solo un administrador puede eliminar usuarios' } };
    }
    const user = await User.findByPk(id);
    if (!user) return { status: 404, body: { success: false, message: 'Usuario no encontrado' } };

    await user.destroy();
    return { status: 200, body: { success: true, message: 'Usuario eliminado permanentemente' } };
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
