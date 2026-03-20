const userService = require('../services/user.service');

exports.getAll = async (req, res) => {
  try {
    const result = await userService.getAll(req.query);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('UserController.getAll:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener usuarios', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await userService.getById(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('UserController.getById:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener usuario', error: error.message });
  }
};

exports.getMapLocations = async (req, res) => {
  try {
    const result = await userService.getMapLocations();
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('UserController.getMapLocations:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener ubicaciones de usuarios', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const result = await userService.update(req.params.id, req.user.id, req.user.tipo, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('UserController.update:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar usuario', error: error.message });
  }
};

exports.deactivate = async (req, res) => {
  try {
    const result = await userService.deactivate(req.params.id, req.user.id, req.user.tipo);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('UserController.deactivate:', error);
    return res.status(500).json({ success: false, message: 'Error al desactivar usuario', error: error.message });
  }
};

exports.getMyPublications = async (req, res) => {
  try {
    const result = await userService.getMyPublications(req.user.id, req.query);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('UserController.getMyPublications:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener publicaciones', error: error.message });
  }
};

// AGREGADO
exports.getUserStats = async (req, res) => {
  try {
    const result = await userService.getUserStats();
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('UserController.getUserStats:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener estadísticas de usuarios', error: error.message });
  }
};