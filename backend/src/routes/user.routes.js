const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');

// Para ver perfil público de usuario
router.get('/:userId/public', userController.getPublicProfile);

// GET  /api/users/stats   → Estadísticas de usuarios para gráficos
router.get('/stats', userController.getUserStats);

// GET  /api/users/map/locations  → Ubicaciones públicas para el mapa
router.get('/map/locations', userController.getMapLocations);

// ========== RUTAS PROTEGIDAS (requieren autenticación) ==========
// GET  /api/users              → Lista todos los usuarios (solo admin)
router.get('/', authMiddleware, authorize('Admin'), userController.getAllUsers);

// GET  /api/users/me/stats     → Estadísticas del usuario logueado
router.get('/me/stats', authMiddleware, userController.getMyStats);

// GET  /api/users/me/activity  → Actividad reciente del usuario logueado
router.get('/me/activity', authMiddleware, userController.getMyActivity);

// GET  /api/users/me/publications → Mis publicaciones (usuario logueado)
router.get('/me/publications', authMiddleware, userController.getMyPublications);

// GET  /api/users/:id          → Perfil de un usuario (requiere autenticación)
router.get('/:id', authMiddleware, userController.getUserById);

// PUT  /api/users/:id          → Actualizar perfil (propio o admin)
router.put('/:id', authMiddleware, userController.updateUser);

// PATCH /api/users/:id/role    → Cambiar rol (solo admin)
router.patch('/:id/role', authMiddleware, authorize('Admin'), userController.changeRole);

// PATCH /api/users/:id/reactivate → Reactivar usuario (solo admin)
router.patch('/:id/reactivate', authMiddleware, authorize('Admin'), userController.reactivateUser);

// PATCH /api/users/:id/deactivate → Desactivar usuario (propio o admin)
router.patch('/:id/deactivate', authMiddleware, userController.deactivateUser);

// DELETE /api/users/:id/hard   → Eliminar permanentemente (solo admin)
router.delete('/:id/hard', authMiddleware, authorize('Admin'), userController.hardDeleteUser);

module.exports = router;
