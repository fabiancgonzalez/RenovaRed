const categoryService = require('../services/category.service');

exports.getAll = async (req, res) => {
  try {
    const result = await categoryService.getAll();
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('CategoryController.getAll:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener categorías', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await categoryService.getById(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('CategoryController.getById:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener categoría', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await categoryService.create(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('CategoryController.create:', error);
    return res.status(500).json({ success: false, message: 'Error al crear categoría', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const result = await categoryService.update(req.params.id, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('CategoryController.update:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar categoría', error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const result = await categoryService.delete(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('CategoryController.delete:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar categoría', error: error.message });
  }
};
