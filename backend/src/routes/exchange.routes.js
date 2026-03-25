const express = require('express');
const router = express.Router();
const exchangeController = require('../controllers/exchange.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// ========== RUTAS EXISTENTES ==========

// GET  /api/exchanges             → Lista todos (admin) con filtros
router.get('/', authorize('Admin'), exchangeController.getAll);

// GET  /api/exchanges/me          → Mis intercambios (comprador o vendedor)
router.get('/me', exchangeController.getMyExchanges);

// GET  /api/exchanges/:id         → Detalle (participante o admin)
router.get('/:id', exchangeController.getById);

// POST /api/exchanges             → Iniciar intercambio (método original)
router.post('/', exchangeController.create);

// PATCH /api/exchanges/:id/estado → Cambiar estado
router.patch('/:id/estado', exchangeController.updateEstado);

// ========== NUEVAS RUTAS PARA EL SISTEMA DE INTERCAMBIOS EN CHAT ==========

router.get('/conversation/:conversationId/status', exchangeController.getExchangeStatus);
router.post('/quote', exchangeController.getQuote);
router.post('/payment-status', exchangeController.getPaymentStatus);
router.post('/request', exchangeController.requestExchange);
router.post('/:exchangeId/respond/:action', exchangeController.respondToExchange);

module.exports = router;
