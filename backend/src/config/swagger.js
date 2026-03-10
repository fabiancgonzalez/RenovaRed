const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API RenovaRed',
      version: '1.0.0',
      description: 'API para la plataforma de economía circular RenovaRed',
      contact: {
        name: 'Equipo RenovaRed',
        email: 'equipo@renovared.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Servidor de desarrollo',
      },
      {
        url: 'https://poner-despues',
        description: 'Servidor de producción (Vercel)',
      }
    ],
    components: {
      schemas: {
        HealthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Servidor de RenovaRed funcionando correctamente' },
            timestamp: { type: 'string', format: 'date-time' },
            version: { type: 'string', example: '1.0.0' },
            endpoints: {
              type: 'object',
              properties: {
                home: { type: 'string', example: '/api/home' },
                health: { type: 'string', example: '/api/health' }
              }
            }
          }
        },
        HomeResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                hero: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', example: 'Economía Circular Inteligente' },
                    subtitle: { type: 'string', example: 'Conectamos cooperativas, recicladoras y emprendedores para fortalecer el impacto ambiental local.' },
                    buttons: {
                      type: 'object',
                      properties: {
                        explore: {
                          type: 'object',
                          properties: {
                            text: { type: 'string', example: 'Explorar Materiales' },
                            url: { type: 'string', example: '/explorar' },
                            primary: { type: 'boolean', example: true }
                          }
                        },
                        publish: {
                          type: 'object',
                          properties: {
                            text: { type: 'string', example: 'Publicar Recursos' },
                            url: { type: 'string', example: '/publicar' },
                            primary: { type: 'boolean', example: false }
                          }
                        }
                      }
                    }
                  }
                },
                metrics: {
                  type: 'object',
                  properties: {
                    intercambios: {
                      type: 'object',
                      properties: {
                        value: { type: 'number', example: 3450 },
                        label: { type: 'string', example: 'Intercambios' },
                        unit: { type: 'string', example: '' },
                        icon: { type: 'string', example: 'exchange-icon' },
                        trend: { type: 'string', example: '+12%' }
                      }
                    },
                    reutilizados: {
                      type: 'object',
                      properties: {
                        value: { type: 'number', example: 19000 },
                        label: { type: 'string', example: 'Reutilizados' },
                        unit: { type: 'string', example: 'kg' },
                        icon: { type: 'string', example: 'recycle-icon' },
                        trend: { type: 'string', example: '+8%' }
                      }
                    },
                    activos: {
                      type: 'object',
                      properties: {
                        value: { type: 'number', example: 600 },
                        label: { type: 'string', example: 'Activos' },
                        unit: { type: 'string', example: '' },
                        icon: { type: 'string', example: 'users-icon' },
                        trend: { type: 'string', example: '+15' }
                      }
                    },
                    co2: {
                      type: 'object',
                      properties: {
                        value: { type: 'number', example: 12500 },
                        label: { type: 'string', example: 'CO₂ Ahorrado' },
                        unit: { type: 'string', example: 'kg' },
                        icon: { type: 'string', example: 'co2-icon' },
                        trend: { type: 'string', example: '+5%' }
                      }
                    }
                  }
                },
                actors: {
                  type: 'object',
                  properties: {
                    cooperativas: {
                      type: 'object',
                      properties: {
                        count: { type: 'number', example: 45 },
                        label: { type: 'string', example: 'Cooperativas' },
                        icon: { type: 'string', example: 'coop-icon' },
                        description: { type: 'string', example: 'Organizaciones que gestionan reciclaje' },
                        recent: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', example: 'uuid' },
                              nombre: { type: 'string', example: 'Recicla Sur' },
                              tipo: { type: 'string', example: 'cooperativa' },
                              avatar_url: { type: 'string', example: 'https://...' },
                              ubicacion_texto: { type: 'string', example: 'Zona Sur' }
                            }
                          }
                        }
                      }
                    },
                    recicladoras: {
                      type: 'object',
                      properties: {
                        count: { type: 'number', example: 28 },
                        label: { type: 'string', example: 'Recicladoras' },
                        icon: { type: 'string', example: 'recycler-icon' },
                        description: { type: 'string', example: 'Centros de acopio y reciclaje' },
                        recent: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', example: 'uuid' },
                              nombre: { type: 'string', example: 'Green Point' },
                              tipo: { type: 'string', example: 'reciclador' },
                              avatar_url: { type: 'string', example: 'https://...' },
                              ubicacion_texto: { type: 'string', example: 'Centro' }
                            }
                          }
                        }
                      }
                    },
                    emprendedores: {
                      type: 'object',
                      properties: {
                        count: { type: 'number', example: 156 },
                        label: { type: 'string', example: 'Emprendedores' },
                        icon: { type: 'string', example: 'entrepreneur-icon' },
                        description: { type: 'string', example: 'Proyectos de economía circular' },
                        recent: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', example: 'uuid' },
                              nombre: { type: 'string', example: 'EcoArte' },
                              tipo: { type: 'string', example: 'emprendedor' },
                              avatar_url: { type: 'string', example: 'https://...' },
                              ubicacion_texto: { type: 'string', example: 'Zona Oeste' }
                            }
                          }
                        }
                      }
                    }
                  }
                },
                categories: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'number', example: 1 },
                      nombre: { type: 'string', example: 'Plástico' },
                      icono: { type: 'string', example: 'plastic-icon' }
                    }
                  }
                },
                lastUpdated: { type: 'string', example: '2026-03-10' },
                footer: {
                  type: 'object',
                  properties: {
                    quote: { type: 'string', example: 'Transformando residuos en oportunidades' },
                    stats: {
                      type: 'object',
                      properties: {
                        totalCooperativas: { type: 'number', example: 45 },
                        totalRecicladoras: { type: 'number', example: 28 },
                        totalEmprendedores: { type: 'number', example: 156 },
                        totalIntercambios: { type: 'number', example: 3450 },
                        totalCO2: { type: 'number', example: 12500 }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'Endpoints de verificación del servidor'
      },
      {
        name: 'Home',
        description: 'Endpoints de la página principal'
      }
    ]
  },
  apis: ['./src/routes/*.js'],
};

const specs = swaggerJsdoc(options);
module.exports = specs;