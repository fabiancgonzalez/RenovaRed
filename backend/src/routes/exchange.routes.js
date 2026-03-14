const express = require('express');
const router = express.Router();
const exchangeController = require('../controllers/exchange.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);

// GET  /api/exchanges             → Lista todos (admin) con filtros ?estado=&buyer_id=&seller_id=
router.get('/', authorize('admin'), exchangeController.getAll);

// GET  /api/exchanges/me          → Mis intercambios (comprador o vendedor)
router.get('/me', exchangeController.getMyExchanges);

// GET  /api/exchanges/:id         → Detalle (participante o admin)
router.get('/:id', exchangeController.getById);

// POST /api/exchanges             → Iniciar intercambio
// Body: { publication_id, seller_id, cantidad?, precio_final?, kg_aproximados? }
router.post('/', exchangeController.create);

// PATCH /api/exchanges/:id/estado → Cambiar estado
// Body: { estado: 'Pendiente' | 'En proceso' | 'Completado' | 'Cancelado' }
router.patch('/:id/estado', exchangeController.updateEstado);

module.exports = router;
