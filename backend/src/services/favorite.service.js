const { Favorite, Publication, User } = require('../models');

class FavoriteService {
  async getMyFavorites(userId) {
    const favorites = await Favorite.findAll({
      where: { user_id: userId },
      include: [{
        model: Publication,
        attributes: ['id', 'titulo', 'descripcion', 'imagenes', 'precio', 'estado', 'ubicacion_texto'],
        include: [{ model: User, as: 'usuario', attributes: ['id', 'nombre', 'avatar_url'] }]
      }],
      order: [['created_at', 'DESC']]
    });
    return { status: 200, body: { success: true, data: favorites } };
  }

  async toggle(userId, publicationId) {
    const pub = await Publication.findByPk(publicationId);
    if (!pub) return { status: 404, body: { success: false, message: 'Publicación no encontrada' } };

    const existing = await Favorite.findOne({ where: { user_id: userId, publication_id: publicationId } });

    if (existing) {
      await existing.destroy();
      return { status: 200, body: { success: true, message: 'Eliminado de favoritos', favorito: false } };
    } else {
      await Favorite.create({ user_id: userId, publication_id: publicationId });
      return { status: 201, body: { success: true, message: 'Agregado a favoritos', favorito: true } };
    }
  }

  async remove(userId, publicationId) {
    const fav = await Favorite.findOne({ where: { user_id: userId, publication_id: publicationId } });
    if (!fav) return { status: 404, body: { success: false, message: 'Favorito no encontrado' } };
    await fav.destroy();
    return { status: 200, body: { success: true, message: 'Eliminado de favoritos' } };
  }
}

module.exports = new FavoriteService();
