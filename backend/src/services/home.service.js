const { Op } = require('sequelize');
const { DailyStats, User, Category } = require('../models');
const UserDTO = require('../dtos/user.dto');

class HomeService {
  
  // UNA SOLA CONSULTA a daily_stats
async getMetrics() {
  try {
    const latestStats = await DailyStats.findOne({
      order: [['fecha', 'DESC']]
    });

    if (latestStats) {
      return {
        // Intercambios = intercambios_completados
        intercambios: latestStats.intercambios_completados || 0,
        
        // Materiales reutilizados = kg_reutilizados
        materialesReutilizados: latestStats.kg_reutilizados || 0,
        
        // Total actores = cooperativas_activas + recicladoras_activas + emprendedores_activos
        totalActores: (latestStats.cooperativas_activas || 0) + 
                     (latestStats.recicladoras_activas || 0) + 
                     (latestStats.emprendedores_activos || 0),
        
        // Valores individuales
        cooperativas: latestStats.cooperativas_activas || 0,
        recicladores: latestStats.recicladoras_activas || 0,
        emprendedores: latestStats.emprendedores_activos || 0,
        co2Ahorrado: latestStats.co2_ahorrado_kg || 0,
        fecha: latestStats.fecha
      };
    }

    // Fallback a mocks si no hay datos
    return {
      intercambios: 3450,
      materialesReutilizados: 19000,
      totalActores: 600,
      cooperativas: 45,
      recicladores: 28,
      emprendedores: 156,
      co2Ahorrado: 12500,
      fecha: new Date().toISOString().split('T')[0]
    };
  } catch (error) {
    console.error('Error obteniendo metrics:', error);
    // Fallback a mocks en caso de error
    return {
      intercambios: 3450,
      materialesReutilizados: 19000,
      totalActores: 600,
      cooperativas: 45,
      recicladores: 28,
      emprendedores: 156,
      co2Ahorrado: 12500
    };
  }
}

  // Categorías
  async getCategories() {
    try {
      const categories = await Category.findAll({
        attributes: ['id', 'nombre', 'icono', 'descripcion'],
        order: [['nombre', 'ASC']],
        limit: 10
      });
      
      return categories.length > 0 ? categories : [
        { id: 1, nombre: 'Plástico', icono: 'plastic-icon' },
        { id: 2, nombre: 'Papel/Cartón', icono: 'paper-icon' },
        { id: 3, nombre: 'Vidrio', icono: 'glass-icon' },
        { id: 4, nombre: 'Metales', icono: 'metal-icon' },
        { id: 5, nombre: 'Textiles', icono: 'textile-icon' },
        { id: 6, nombre: 'Orgánicos', icono: 'organic-icon' }
      ];
    } catch (error) {
      return [
        { id: 1, nombre: 'Plástico', icono: 'plastic-icon' },
        { id: 2, nombre: 'Papel/Cartón', icono: 'paper-icon' },
        { id: 3, nombre: 'Vidrio', icono: 'glass-icon' },
        { id: 4, nombre: 'Metales', icono: 'metal-icon' }
      ];
    }
  }

  // Usuarios destacados (últimos registrados)
  async getDestacados(limit = 6) {
  try {
    const destacados = await User.findAll({
      where: { is_active: true },
      attributes: ['id', 'nombre', 'tipo', 'avatar_url', 'ubicacion_texto'],
      order: [['created_at', 'DESC']],
      limit
    });
    
    return destacados.map(user => UserDTO.forHome(user));
  } catch (error) {
    return [];
  }
}

  // Home completo
  async getHomeData() {
    // Ejecutar consultas en paralelo
    const [metrics, categories, destacados] = await Promise.all([
      this.getMetrics(),
      this.getCategories(),
      this.getDestacados()
    ]);

    return {
      hero: {
        title: "Economía Circular Inteligente",
        subtitle: "Conectamos cooperativas, recicladoras y emprendedores para fortalecer el impacto ambiental local.",
        buttons: {
          explore: { text: "Explorar Materiales", url: "/explorar", primary: true },
          publish: { text: "Publicar Recursos", url: "/publicar", primary: false }
        }
      },
      metrics: {
        intercambios: { 
          value: metrics.intercambios, 
          label: "Intercambios", 
          unit: "", 
          icon: "exchange-icon",
          trend: "+12%"
        },
        reutilizados: { 
          value: metrics.materialesReutilizados, 
          label: "Reutilizados", 
          unit: "kg", 
          icon: "recycle-icon",
          trend: "+8%"
        },
        activos: { 
          value: metrics.totalActores, 
          label: "Activos", 
          unit: "", 
          icon: "users-icon",
          trend: "+15"
        },
        co2: {
          value: metrics.co2Ahorrado,
          label: "CO₂ Ahorrado",
          unit: "kg",
          icon: "co2-icon",
          trend: "+5%"
        }
      },
      actors: {
        cooperativas: { 
          count: metrics.cooperativas, 
          label: "Cooperativas", 
          icon: "coop-icon",
          description: "Organizaciones que gestionan reciclaje",
          recent: destacados.filter(u => u.tipo === 'cooperativa').slice(0, 3)
        },
        recicladoras: { 
          count: metrics.recicladores, 
          label: "Recicladoras", 
          icon: "recycler-icon",
          description: "Centros de acopio y reciclaje",
          recent: destacados.filter(u => u.tipo === 'reciclador').slice(0, 3)
        },
        emprendedores: { 
          count: metrics.emprendedores, 
          label: "Emprendedores", 
          icon: "entrepreneur-icon",
          description: "Proyectos de economía circular",
          recent: destacados.filter(u => u.tipo === 'emprendedor').slice(0, 3)
        }
      },
      categories: categories.map(c => ({
        id: c.id,
        nombre: c.nombre,
        icono: c.icono || 'default-icon'
      })),
      lastUpdated: metrics.fecha || new Date().toISOString().split('T')[0],
      footer: {
        quote: "Transformando residuos en oportunidades",
        stats: {
          totalCooperativas: metrics.cooperativas,
          totalRecicladoras: metrics.recicladores,
          totalEmprendedores: metrics.emprendedores,
          totalIntercambios: metrics.intercambios,
          totalCO2: metrics.co2Ahorrado
        }
      }
    };
  }
}

module.exports = new HomeService();