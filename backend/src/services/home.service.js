const { DailyStats, User, Category, Publication } = require('../models');
const { fn, col } = require('sequelize');

class HomeService {
  toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // Obtener métricas desde daily_stats (hoy y totales)
  async getMetrics() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [
        todayStats,
        totalsRow,
        latestStats
      ] = await Promise.all([
        DailyStats.findOne({ where: { fecha: today } }),
        DailyStats.findOne({
          raw: true,
          attributes: [
            [fn('COALESCE', fn('SUM', col('nuevos_usuarios')), 0), 'usuarios'],
            [fn('COALESCE', fn('SUM', col('intercambios_completados')), 0), 'intercambios'],
            [fn('COALESCE', fn('SUM', col('kg_reutilizados')), 0), 'reutilizados'],
            [fn('COALESCE', fn('SUM', col('co2_ahorrado_kg')), 0), 'co2']
          ]
        }),
        DailyStats.findOne({ order: [['fecha', 'DESC']] })
      ]);

      const todayData = {
        usuarios: this.toNumber(todayStats?.nuevos_usuarios),
        intercambios: this.toNumber(todayStats?.intercambios_completados),
        reutilizados: this.toNumber(todayStats?.kg_reutilizados),
        co2: this.toNumber(todayStats?.co2_ahorrado_kg),
      };

      const totalData = {
        usuarios: this.toNumber(totalsRow?.usuarios),
        intercambios: this.toNumber(totalsRow?.intercambios),
        reutilizados: this.toNumber(totalsRow?.reutilizados),
        co2: this.toNumber(totalsRow?.co2),
      };

      // Si existe historial pero los agregados llegan en 0/null, usar la fila mas reciente como respaldo
      if (
        latestStats &&
        totalData.usuarios === 0 &&
        totalData.intercambios === 0 &&
        totalData.reutilizados === 0 &&
        totalData.co2 === 0
      ) {
        totalData.usuarios = this.toNumber(latestStats.nuevos_usuarios);
        totalData.intercambios = this.toNumber(latestStats.intercambios_completados);
        totalData.reutilizados = this.toNumber(latestStats.kg_reutilizados);
        totalData.co2 = this.toNumber(latestStats.co2_ahorrado_kg);
      }

      return {
        today: todayData,
        total: totalData,
        actores: {
          cooperativas: this.toNumber(latestStats?.cooperativas_activas),
          recicladoras: this.toNumber(latestStats?.recicladoras_activas),
          emprendedores: this.toNumber(latestStats?.emprendedores_activos)
        }
      };
    } catch (error) {
      console.error('Error obteniendo metrics:', error);
      return {
        today: { usuarios: 0, intercambios: 0, reutilizados: 0, co2: 0 },
        total: { usuarios: 0, intercambios: 0, reutilizados: 0, co2: 0 },
        actores: { cooperativas: 0, recicladoras: 0, emprendedores: 0 }
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
        today: metrics.today,
        total: metrics.total
      },
      actors: metrics.actores,
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