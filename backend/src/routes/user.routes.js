const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');

// AGREGADO
// GET  /api/users/stats   
router.get('/stats', userController.getUserStats);

// GET  /api/users              → Lista todos los usuarios (solo admin)
router.get('/', authMiddleware, authorize('Admin'), userController.getAll);

// GET  /api/users/me/publications → Mis publicaciones (usuario logueado)
router.get('/me/publications', authMiddleware, userController.getMyPublications);


// GET  /api/users/:id          → Perfil de un usuario
router.get('/:id', authMiddleware, userController.getById);

// PUT  /api/users/:id          → Actualizar perfil (propio o admin)
router.put('/:id', authMiddleware, userController.update);

// DELETE /api/users/:id        → Desactivar usuario (propio o admin)
router.delete('/:id', authMiddleware, userController.deactivate);

module.exports = router;
