const express = require('express');
const router = express.Router();
const publicationController = require('../controllers/publication.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// GET  /api/publications                → Lista (público, con filtros)
// Query params: ?page=1&limit=20&estado=Disponible&tipo_usuario=cooperativa&categoria_id=X&search=texto
router.get('/', publicationController.getAll);

// GET  /api/publications/:id            → Detalle (público, suma vista)
router.get('/:id', publicationController.getById);

// POST /api/publications                → Crear (autenticado)
router.post('/', authenticate, publicationController.create);

// PUT  /api/publications/:id            → Editar (dueño o admin)
router.put('/:id', authenticate, publicationController.update);

// DELETE /api/publications/:id          → Eliminar (dueño o admin)
router.delete('/:id', authenticate, publicationController.delete);

module.exports = router;
