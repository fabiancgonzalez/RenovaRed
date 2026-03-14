const { DailyStats } = require('../models');
const { Op } = require('sequelize');

class DailyStatsService {
  async getAll({ desde, hasta, limit = 30 } = {}) {
    const where = {};
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha[Op.gte] = desde;
      if (hasta) where.fecha[Op.lte] = hasta;
    }

    const stats = await DailyStats.findAll({
      where,
      order: [['fecha', 'DESC']],
      limit: parseInt(limit)
    });

    return { status: 200, body: { success: true, data: stats } };
  }

  async getToday() {
    const today = new Date().toISOString().split('T')[0];
    const stat = await DailyStats.findOne({ where: { fecha: today } });
    if (!stat) return { status: 404, body: { success: false, message: 'No hay stats para hoy' } };
    return { status: 200, body: { success: true, data: stat } };
  }

  async upsert(fecha, data) {
    const allowed = ['nuevos_usuarios', 'nuevas_publicaciones', 'intercambios_completados',
      'kg_reutilizados', 'co2_ahorrado_kg', 'cooperativas_activas',
      'recicladoras_activas', 'emprendedores_activos', 'zonas_activas'];

    const values = { fecha };
    allowed.forEach(f => { if (data[f] !== undefined) values[f] = data[f]; });

    const [stat, created] = await DailyStats.findOrCreate({ where: { fecha }, defaults: values });
    if (!created) await stat.update(values);

    return {
      status: created ? 201 : 200,
      body: { success: true, message: created ? 'Stats creadas' : 'Stats actualizadas', data: stat }
    };
  }
}

module.exports = new DailyStatsService();
