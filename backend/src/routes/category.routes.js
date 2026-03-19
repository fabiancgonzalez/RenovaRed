const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');

// GET /api/stats
router.get('/stats', categoryController.getStats); 

// GET  /api/categories          → Lista todas (público)
router.get('/', categoryController.getAll);

// GET  /api/categories/:id      → Detalle (público)
router.get('/:id', categoryController.getById);

// POST /api/categories          → Crear (solo admin)
router.post('/', authMiddleware, authorize('Admin'), categoryController.create);

// PUT  /api/categories/:id      → Actualizar (solo admin)
router.put('/:id', authMiddleware, authorize('Admin'), categoryController.update);

// DELETE /api/categories/:id    → Eliminar (solo admin)
router.delete('/:id', authMiddleware, authorize('Admin'), categoryController.delete);

module.exports = router;
