const { DailyStats, User, Category, Publication } = require('../models');
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
    const [metrics, categories, activity] = await Promise.all([
      this.getMetrics(),
      this.getCategories(),
      this.getRecentActivity()
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
      activity,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
  }

  // ACTIVIDAD RECIENTE -> AGREGADO
  async getRecentActivity() {
    try {
      // Ultimas publicaciones
      const publications = await Publication.findAll({
        attributes: ['id','titulo', 'published_at'],
        include:[{
          model: User,
          as: 'usuario',
          attributes: ['nombre']
        }],
        order: [['published_at', 'DESC']],
        limit: 5
      });
      // Ultimos usuarios registrados
      const users = await User.findAll({
        attributes: ['nombre', 'created_at'],
        order: [['created_at', 'DESC']],
        limit: 5
      });
      // Formatear actividades
      const activity = [];

      publications.forEach(pub => {
        activity.push({
          tipo: 'publicacion',
          texto: `${pub.usuario?.nombre} publicó: ${pub.titulo}`,
          fecha: pub.published_at
        });
      });
      users.forEach(user => {
        activity.push({
          tipo: 'usuario',
          texto: `${user.nombre} se registró`,
          fecha: user.createdAt
        });
      });
      // Ordenar por fecha
      activity.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      return activity.slice(0, 5);
    } catch (error) {
      console.error('Error obteniendo actividad reciente:', error);
      return [];
    }
  }
}

module.exports = new HomeService();