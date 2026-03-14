const express = require('express');
const router = express.Router();
const dailyStatsController = require('../controllers/dailyStats.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET  /api/stats                 → Historial (público) ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&limit=30
router.get('/', dailyStatsController.getAll);

// GET  /api/stats/today           → Stats del día actual (público)
router.get('/today', dailyStatsController.getToday);

// PUT  /api/stats/:fecha          → Crear o actualizar stats de una fecha (solo admin)
// Param: fecha = YYYY-MM-DD
router.put('/:fecha', authenticate, authorize('admin'), dailyStatsController.upsert);

module.exports = router;
