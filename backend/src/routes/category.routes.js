const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET  /api/categories          → Lista todas (público)
router.get('/', categoryController.getAll);

// GET  /api/categories/:id      → Detalle (público)
router.get('/:id', categoryController.getById);

// POST /api/categories          → Crear (solo admin)
router.post('/', authenticate, authorize('admin'), categoryController.create);

// PUT  /api/categories/:id      → Actualizar (solo admin)
router.put('/:id', authenticate, authorize('admin'), categoryController.update);

// DELETE /api/categories/:id    → Eliminar (solo admin)
router.delete('/:id', authenticate, authorize('admin'), categoryController.delete);

module.exports = router;
