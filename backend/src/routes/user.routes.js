const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authMiddleware, authorize } = require('../middlewares/auth.middleware');
 
// AGREGADO
// GET  /api/users/stats
router.get('/stats', userController.getUserStats);

// GET  /api/users/map/locations  → Ubicaciones públicas para el mapa
router.get('/map/locations', userController.getMapLocations);

// GET  /api/users              → Lista todos los usuarios (solo admin)
router.get('/', authMiddleware, authorize('Admin'), userController.getAll);

// GET  /api/users/me/publications → Mis publicaciones (usuario logueado)
router.get('/me/publications', authMiddleware, userController.getMyPublications);


// GET  /api/users/:id          → Perfil de un usuario
router.get('/:id', authMiddleware, userController.getById);

// PUT  /api/users/:id          → Actualizar perfil (propio o admin)
router.put('/:id', authMiddleware, userController.update);

// PATCH /api/users/:id/role    → Cambiar rol (solo admin)
router.patch('/:id/role', authMiddleware, authorize('Admin'), userController.changeRole);

// PATCH /api/users/:id/reactivate → Reactivar usuario (solo admin)
router.patch('/:id/reactivate', authMiddleware, authorize('Admin'), userController.reactivate);

// DELETE /api/users/:id        → Desactivar usuario (propio o admin)
router.delete('/:id', authMiddleware, userController.deactivate);

// DELETE /api/users/:id/hard   → Eliminar permanentemente (solo admin)
router.delete('/:id/hard', authMiddleware, authorize('Admin'), userController.hardDelete);

module.exports = router;
