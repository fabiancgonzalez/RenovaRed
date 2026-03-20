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

// DELETE /api/users/:id        → Desactivar usuario (propio o admin)
router.delete('/:id', authenticate, userController.deactivate);

module.exports = router;
