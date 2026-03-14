const dailyStatsService = require('../services/dailyStats.service');

exports.getAll = async (req, res) => {
  try {
    const result = await dailyStatsService.getAll(req.query);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('DailyStatsController.getAll:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener stats', error: error.message });
  }
};

exports.getToday = async (req, res) => {
  try {
    const result = await dailyStatsService.getToday();
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('DailyStatsController.getToday:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener stats de hoy', error: error.message });
  }
};

exports.upsert = async (req, res) => {
  try {
    const { fecha } = req.params;
    const result = await dailyStatsService.upsert(fecha, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('DailyStatsController.upsert:', error);
    return res.status(500).json({ success: false, message: 'Error al guardar stats', error: error.message });
  }
};
