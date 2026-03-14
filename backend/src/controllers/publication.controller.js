const publicationService = require('../services/publication.service');

exports.getAll = async (req, res) => {
  try {
    const result = await publicationService.getAll(req.query);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('PublicationController.getAll:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener publicaciones', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await publicationService.getById(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('PublicationController.getById:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener publicación', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await publicationService.create(req.user.id, req.user.tipo, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('PublicationController.create:', error);
    return res.status(500).json({ success: false, message: 'Error al crear publicación', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const result = await publicationService.update(req.params.id, req.user.id, req.user.tipo, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('PublicationController.update:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar publicación', error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const result = await publicationService.delete(req.params.id, req.user.id, req.user.tipo);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('PublicationController.delete:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar publicación', error: error.message });
  }
};
