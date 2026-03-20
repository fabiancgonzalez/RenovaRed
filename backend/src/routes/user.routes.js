const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET  /api/users/map/locations  → Ubicaciones públicas para el mapa
router.get('/map/locations', userController.getMapLocations);

// GET  /api/users              → Lista todos los usuarios (solo admin)
router.get('/', authenticate, authorize('admin'), userController.getAll);

// GET  /api/users/me/publications → Mis publicaciones (usuario logueado)
router.get('/me/publications', authenticate, userController.getMyPublications);

// GET  /api/users/:id          → Perfil de un usuario
router.get('/:id', authenticate, userController.getById);

// PUT  /api/users/:id          → Actualizar perfil (propio o admin)
router.put('/:id', authenticate, userController.update);

// PATCH /api/users/:id/role    → Cambiar rol (solo admin)
router.patch('/:id/role', authenticate, authorize('admin'), userController.changeRole);

// PATCH /api/users/:id/reactivate → Reactivar usuario (solo admin)
router.patch('/:id/reactivate', authenticate, authorize('admin'), userController.reactivate);

// DELETE /api/users/:id        → Desactivar usuario (propio o admin)
router.delete('/:id', authenticate, userController.deactivate);

// DELETE /api/users/:id/hard   → Eliminar permanentemente (solo admin)
router.delete('/:id/hard', authenticate, authorize('admin'), userController.hardDelete);

module.exports = router;
