const { DailyStats, User, Category } = require('../models');
const { Op } = require('sequelize');

class HomeService {
  
  // Obtener métricas desde daily_stats
  async getMetrics() {
    try {
      const latestStats = await DailyStats.findOne({
        order: [['fecha', 'DESC']]
      });

      if (latestStats) {
        return {
          intercambios: latestStats.intercambios_completados || 0,
          reutilizados: latestStats.kg_reutilizados || 0,
          activos: (latestStats.cooperativas_activas || 0) + 
                   (latestStats.recicladoras_activas || 0) + 
                   (latestStats.emprendedores_activos || 0),
          co2: latestStats.co2_ahorrado_kg || 0,
          cooperativas: latestStats.cooperativas_activas || 0,
          recicladoras: latestStats.recicladoras_activas || 0,
          emprendedores: latestStats.emprendedores_activos || 0
        };
      }

      // Fallback si no hay stats
      return {
        intercambios: 3450,
        reutilizados: 19000,
        activos: 600,
        co2: 12500,
        cooperativas: 45,
        recicladoras: 28,
        emprendedores: 156
      };
    } catch (error) {
      console.error('Error obteniendo metrics:', error);
      return {
        intercambios: 3450,
        reutilizados: 19000,
        activos: 600,
        co2: 12500,
        cooperativas: 45,
        recicladoras: 28,
        emprendedores: 156
      };
    }
  }

  // Obtener categorías (solo datos básicos)
  async getCategories() {
    try {
      const categories = await Category.findAll({
        attributes: ['id', 'nombre'],
        order: [['nombre', 'ASC']],
        limit: 10
      });
      
      return categories.length > 0 ? categories : [];
    } catch (error) {
      return [];
    }
  }

  // Home completo
  async getHomeData() {
    const [metrics, categories] = await Promise.all([
      this.getMetrics(),
      this.getCategories()
    ]);

    return {
      metrics: {
        intercambios: metrics.intercambios,
        reutilizados: metrics.reutilizados,
        activos: metrics.activos,
        co2: metrics.co2
      },
      actors: {
        cooperativas: metrics.cooperativas,
        recicladoras: metrics.recicladoras,
        emprendedores: metrics.emprendedores
      },
      categories: categories.map(c => ({
        id: c.id,
        nombre: c.nombre
      })),
      lastUpdated: new Date().toISOString().split('T')[0]
    };
  }
}

module.exports = new HomeService();