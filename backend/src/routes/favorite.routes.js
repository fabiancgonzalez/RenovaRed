const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favorite.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);

// GET    /api/favorites                         → Mis favoritos
router.get('/', favoriteController.getMyFavorites);

// POST   /api/favorites/:publicationId/toggle   → Agregar/quitar (toggle)
router.post('/:publicationId/toggle', favoriteController.toggle);

// DELETE /api/favorites/:publicationId          → Quitar favorito explícitamente
router.delete('/:publicationId', favoriteController.remove);

module.exports = router;
