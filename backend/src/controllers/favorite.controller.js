const favoriteService = require('../services/favorite.service');

exports.getMyFavorites = async (req, res) => {
  try {
    const result = await favoriteService.getMyFavorites(req.user.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('FavoriteController.getMyFavorites:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener favoritos', error: error.message });
  }
};

exports.toggle = async (req, res) => {
  try {
    const result = await favoriteService.toggle(req.user.id, req.params.publicationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('FavoriteController.toggle:', error);
    return res.status(500).json({ success: false, message: 'Error al procesar favorito', error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await favoriteService.remove(req.user.id, req.params.publicationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('FavoriteController.remove:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar favorito', error: error.message });
  }
};
