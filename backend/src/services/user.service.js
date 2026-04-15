const { User, Publication, Favorite, Category, Conversation, Message, Exchange } = require('../models');
const bcrypt = require('bcryptjs');
const { Sequelize, Op } = require('sequelize');
const UserDTO = require('../dtos/user.dto');

class UserService {
  // Obtener estadísticas de usuarios para gráficos
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

  _safeFields() {
    return ['id', 'nombre', 'email', 'tipo', 'telefono', 'avatar_url',
      'ubicacion_texto', 'place_id', 'is_active', 'last_login',
      'created_at', 'updated_at', 'bio', 'website', 'instagram', 
      'facebook', 'linkedin', 'x_handle', 'puntos', 'reputacion'];
  }

  _isValidCoordinate(lat, lng) {
    return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  _extractCoordinatesFromObject(value, depth = 0) {
    if (!value || depth > 5 || typeof value !== 'object') return null;

    const lat = Number(value.lat ?? value.latitude);
    const lng = Number(value.lng ?? value.lon ?? value.longitude);

    if (this._isValidCoordinate(lat, lng)) return { lat, lng };

    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = this._extractCoordinatesFromObject(item, depth + 1);
        if (nested) return nested;
      }
      return null;
    }

    for (const nestedValue of Object.values(value)) {
      const nested = this._extractCoordinatesFromObject(nestedValue, depth + 1);
      if (nested) return nested;
    }

    return null;
  }

  _extractCoordinates(user) {
    const geometryCoordinates = user?.ubicacion_geom?.coordinates;
    if (Array.isArray(geometryCoordinates) && geometryCoordinates.length >= 2) {
      const [lng, lat] = geometryCoordinates;
      if (this._isValidCoordinate(lat, lng)) return { lat, lng };
    }

    const placesCoordinates = this._extractCoordinatesFromObject(user?.google_places_data);
    if (placesCoordinates) return placesCoordinates;

    return null;
  }

  // Obtener todos los usuarios con paginación y filtros
  async getAll({ page = 1, limit = 60, tipo, is_active } = {}) {
    const where = {};
    if (tipo) where.tipo = tipo;
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

  // Obtener usuario por ID (público)
  async getById(id) {
    const user = await User.findByPk(id, {
      attributes: this._safeFields()
    });
    if (!user) return { status: 404, body: { success: false, message: 'Usuario no encontrado' } };
    return { status: 200, body: { success: true, data: user } };
  }

  // Obtener perfil público de usuario (para ver perfiles de otros)
  async getPublicProfile(userId) {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'nombre', 'tipo', 'avatar_url', 'ubicacion_texto', 
                   'ubicacion_geom', 'bio', 'reputacion', 'puntos', 'created_at',
                   'website', 'instagram', 'facebook', 'linkedin', 'x_handle'],
      where: { is_active: true }
    });
    
    if (!user) {
      return { status: 404, body: { success: false, message: 'Usuario no encontrado' } };
    }
    
    const coordinates = this._extractCoordinates(user);
    
    return {
      status: 200,
      body: {
        success: true,
        data: {
          id: user.id,
          nombre: user.nombre,
          tipo: user.tipo,
          avatar_url: user.avatar_url,
          ubicacion_texto: user.ubicacion_texto,
          coordinates,
          bio: user.bio,
          reputacion: user.reputacion,
          puntos: user.puntos,
          created_at: user.created_at,
          website: user.website,
          instagram: user.instagram,
          facebook: user.facebook,
          linkedin: user.linkedin,
          x_handle: user.x_handle
        }
      }
    };
  }

  // Obtener ubicaciones para el mapa
  async getMapLocations() {
    const users = await User.findAll({
      where: { is_active: true },
      attributes: ['id', 'nombre', 'email', 'tipo', 'avatar_url', 'ubicacion_texto', 'ubicacion_geom', 'google_places_data', 'reputacion'],
      order: [['nombre', 'ASC']]
    });

    const locations = users
      .map((user) => {
        const coordinates = this._extractCoordinates(user);
        if (!coordinates) return null;
        return UserDTO.mapLocation(user, coordinates);
      })
      .filter(Boolean);

    return {
      status: 200,
      body: { success: true, data: locations }
    };
  }

  // Actualizar usuario
  async update(id, requesterId, requesterTipo, data) {
    if (requesterId !== id && requesterTipo !== 'Admin') {
      return { status: 403, body: { success: false, message: 'Sin permiso para modificar este usuario' } };
    }

    const user = await User.findByPk(id);
    if (!user) return { status: 404, body: { success: false, message: 'Usuario no encontrado' } };

    const allowed = ['nombre', 'telefono', 'avatar_url', 'ubicacion_texto', 'place_id', 'google_places_data',
                     'bio', 'website', 'instagram', 'facebook', 'linkedin', 'x_handle'];
    const updates = {};
    allowed.forEach(f => { if (data[f] !== undefined) updates[f] = data[f]; });

    if (data.password) {
      updates.password_hash = await bcrypt.hash(data.password, 12);
    }

    await user.update(updates);
    const fresh = await User.findByPk(id, { attributes: this._safeFields() });
    return { status: 200, body: { success: true, message: 'Usuario actualizado', data: fresh } };
  }

  // Desactivar usuario
  async deactivate(id, requesterId, requesterTipo) {
    if (requesterId !== id && requesterTipo !== 'Admin') {
      return { status: 403, body: { success: false, message: 'Sin permiso' } };
    }
    const user = await User.findByPk(id);
    if (!user) return { status: 404, body: { success: false, message: 'Usuario no encontrado' } };
    await user.update({ is_active: false });
    return { status: 200, body: { success: true, message: 'Usuario desactivado' } };
  }

  // Reactivar usuario (solo admin)
  async reactivate(id, requesterTipo) {
    if (requesterTipo !== 'Admin') {
      return { status: 403, body: { success: false, message: 'Solo un administrador puede reactivar usuarios' } };
    }
    const user = await User.findByPk(id);
    if (!user) return { status: 404, body: { success: false, message: 'Usuario no encontrado' } };
    await user.update({ is_active: true });
    return { status: 200, body: { success: true, message: 'Usuario reactivado' } };
  }

  // Cambiar rol de usuario (solo admin)
  async changeRole(id, requesterTipo, newTipo) {
    const VALID_ROLES = ['Persona', 'Cooperativa', 'Recicladora', 'Emprendedor', 'Admin'];
    if (requesterTipo !== 'Admin') {
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

  // Eliminar usuario permanentemente (solo admin)
  async hardDelete(id, requesterTipo) {
    if (requesterTipo !== 'Admin') {
      return { status: 403, body: { success: false, message: 'Solo un administrador puede eliminar usuarios' } };
    }
    const user = await User.findByPk(id);
    if (!user) return { status: 404, body: { success: false, message: 'Usuario no encontrado' } };
    await user.destroy();
    return { status: 200, body: { success: true, message: 'Usuario eliminado permanentemente' } };
  }

  // Obtener publicaciones del usuario autenticado
  async getMyPublications(userId, { page = 1, limit = 10, categoria_id } = {}) {
    const offset = (page - 1) * limit;
    const where = { user_id: userId };
    if (categoria_id) where.categoria_id = categoria_id;

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

  // Obtener estadísticas del usuario autenticado
  async getMyStats(userId) {
    try {
      const publications = await Publication.count({
        where: { user_id: userId }
      });

      const conversations = await Conversation.findAll({
        where: {
          [Op.or]: [
            { buyer_id: userId },
            { seller_id: userId }
          ]
        }
      });

      let messagesUnread = 0;
      for (const conv of conversations) {
        const unread = await Message.count({
          where: {
            conversation_id: conv.id,
            read: false,
            sender_id: { [Op.ne]: userId }
          }
        });
        messagesUnread += unread;
      }

      const exchangesCompleted = await Exchange.count({
        where: {
          [Op.or]: [
            { buyer_id: userId },
            { seller_id: userId }
          ],
          estado: 'Aceptado'
        }
      });

      const exchanges = await Exchange.findAll({
        where: {
          [Op.or]: [
            { buyer_id: userId },
            { seller_id: userId }
          ],
          estado: 'Aceptado'
        }
      });

      let materialsRecycled = 0;
      let co2Saved = 0;

      for (const exchange of exchanges) {
        let kg = 0;
        if (exchange.kg_aproximados) {
          kg = parseFloat(exchange.kg_aproximados);
        } else if (exchange.cantidad) {
          kg = parseFloat(exchange.cantidad);
        }
        
        materialsRecycled += kg;
        
        if (exchange.co2_ahorrado_kg) {
          co2Saved += parseFloat(exchange.co2_ahorrado_kg);
        } else {
          co2Saved += kg * 2.5;
        }
      }

      let respondedConversations = 0;
      for (const conv of conversations) {
        const userMessages = await Message.count({
          where: {
            conversation_id: conv.id,
            sender_id: userId
          }
        });
        if (userMessages > 0) respondedConversations++;
      }
      
      const totalConversations = conversations.length;
      const responseRate = totalConversations > 0 
        ? Math.round((respondedConversations / totalConversations) * 100)
        : 0;

      // Calcular puntos ECO (cada kg reciclado = 10 puntos, cada intercambio completado = 50 puntos)
      const puntos = (materialsRecycled * 10) + (exchangesCompleted * 50);

      // Calcular reputación (basada en intercambios completados y tasa de respuesta)
      let reputacion = 0;
      if (exchangesCompleted > 0) {
        reputacion = Math.min(5, (exchangesCompleted * 0.5) + (responseRate / 20));
      }

      // Actualizar puntos y reputación en la base de datos
      await User.update({ puntos, reputacion }, { where: { id: userId } });

      return {
        status: 200,
        body: {
          success: true,
          data: {
            publications,
            messagesUnread,
            exchangesCompleted,
            materialsRecycled: Math.round(materialsRecycled),
            co2Saved: Math.round(co2Saved),
            responseRate,
            puntos,
            reputacion
          }
        }
      };
    } catch (error) {
      console.error('Error en getMyStats:', error);
      return { status: 500, body: { success: false, message: error.message } };
    }
  }

  // Obtener actividad reciente del usuario autenticado
  async getMyActivity(userId) {
    try {
      const activities = [];
      
      // Publicaciones recientes
      const recentPublications = await Publication.findAll({
        where: { user_id: userId },
        limit: 5,
        order: [['created_at', 'DESC']]
      });
      
      for (const pub of recentPublications) {
        activities.push({
          id: pub.id,
          type: 'publication',
          title: 'Publicaste un material',
          description: pub.titulo,
          publication: { id: pub.id, titulo: pub.titulo },
          timestamp: pub.created_at,
          user: {
            id: userId,
            nombre: 'Tú',
            tipo: 'Propio'
          }
        });
      }
      
      // Mensajes recibidos
      const conversations = await Conversation.findAll({
        where: {
          [Op.or]: [
            { buyer_id: userId },
            { seller_id: userId }
          ]
        }
      });
      
      const conversationIds = conversations.map(c => c.id);
      
      if (conversationIds.length > 0) {
        const recentMessages = await Message.findAll({
          where: {
            conversation_id: { [Op.in]: conversationIds },
            sender_id: { [Op.ne]: userId }
          },
          include: [
            { model: User, as: 'remitente', attributes: ['id', 'nombre', 'tipo', 'avatar_url'] }
          ],
          limit: 10,
          order: [['created_at', 'DESC']]
        });
        
        for (const msg of recentMessages) {
          activities.push({
            id: msg.id,
            type: 'message',
            title: 'Nuevo mensaje',
            description: msg.content.substring(0, 100),
            timestamp: msg.created_at,
            user: {
              id: msg.remitente.id,
              nombre: msg.remitente.nombre,
              tipo: msg.remitente.tipo,
              avatar: msg.remitente.avatar_url
            }
          });
        }
      }
      
      // Intercambios completados
      const recentExchanges = await Exchange.findAll({
        where: {
          [Op.or]: [
            { buyer_id: userId },
            { seller_id: userId }
          ],
          estado: 'Aceptado'
        },
        include: [
          { model: Publication, as: 'publication', attributes: ['id', 'titulo'] }
        ],
        limit: 5,
        order: [['completed_at', 'DESC']]
      });
      
      for (const exchange of recentExchanges) {
        const otherUserId = exchange.buyer_id === userId ? exchange.seller_id : exchange.buyer_id;
        const otherUser = await User.findByPk(otherUserId, {
          attributes: ['id', 'nombre', 'tipo', 'avatar_url']
        });
        
        if (otherUser) {
          activities.push({
            id: exchange.id,
            type: 'exchange',
            title: 'Intercambio completado',
            description: `${exchange.kg_aproximados || 0}kg de ${exchange.publication?.titulo || 'materiales'}`,
            timestamp: exchange.completed_at || exchange.created_at,
            user: {
              id: otherUser.id,
              nombre: otherUser.nombre,
              tipo: otherUser.tipo,
              avatar: otherUser.avatar_url
            }
          });
        }
      }
      
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return {
        status: 200,
        body: {
          success: true,
          data: activities.slice(0, 10)
        }
      };
    } catch (error) {
      console.error('Error en getMyActivity:', error);
      return { status: 500, body: { success: false, message: error.message } };
    }
  }
}

module.exports = new UserService();
