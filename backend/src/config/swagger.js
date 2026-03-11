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
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
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
                              tipo: { type: 'string', example: 'Cooperativa' },
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
                              tipo: { type: 'string', example: 'Recicladora' },
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
                              tipo: { type: 'string', example: 'Emprendedor' },
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
        },
        RegisterRequest: {
          type: 'object',
          required: ['nombre', 'email', 'password', 'tipo'],
          properties: {
            nombre: { type: 'string', example: 'Cooperativa Norte' },
            email: { type: 'string', format: 'email', example: 'coop@test.com' },
            password: { type: 'string', format: 'password', minLength: 6, example: '123456' },
            tipo: { 
              type: 'string', 
              enum: ['Cooperativa', 'Recicladora', 'Emprendedor', 'Persona', 'Admin'], 
              example: 'Cooperativa' 
            },
            telefono: { type: 'string', example: '123456789' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'coop@test.com' },
            password: { type: 'string', format: 'password', example: '123456' }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login exitoso' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
                    nombre: { type: 'string', example: 'Cooperativa Norte' },
                    email: { type: 'string', example: 'coop@test.com' },
                    tipo: { type: 'string', example: 'Cooperativa' },
                    telefono: { type: 'string', example: '123456789' },
                    avatar_url: { type: 'string', example: null },
                    is_active: { type: 'boolean', example: true },
                    created_at: { type: 'string', format: 'date-time', example: '2026-03-11T12:00:00Z' }
                  }
                },
                token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
              }
            }
          }
        },
        ProfileResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
                nombre: { type: 'string', example: 'Cooperativa Norte' },
                email: { type: 'string', example: 'coop@test.com' },
                tipo: { type: 'string', example: 'Cooperativa' },
                telefono: { type: 'string', example: '123456789' },
                avatar_url: { type: 'string', example: null },
                ubicacion_texto: { type: 'string', example: 'Zona Norte' },
                is_active: { type: 'boolean', example: true },
                last_login: { type: 'string', format: 'date-time', example: '2026-03-11T12:00:00Z' },
                created_at: { type: 'string', format: 'date-time', example: '2026-03-10T10:00:00Z' },
                updated_at: { type: 'string', format: 'date-time', example: '2026-03-11T12:00:00Z' }
              }
            }
          }
        },
        ProfileUpdateRequest: {
          type: 'object',
          properties: {
            nombre: { type: 'string', example: 'Nuevo Nombre' },
            telefono: { type: 'string', example: '987654321' },
            avatar_url: { type: 'string', example: 'https://ejemplo.com/avatar.jpg' },
            ubicacion_texto: { type: 'string', example: 'Nueva dirección' }
          }
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string', format: 'password', example: '123456' },
            newPassword: { type: 'string', format: 'password', minLength: 6, example: 'nueva123' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error al registrar usuario' },
            error: { type: 'string', example: 'El email ya está registrado' }
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
      },
      {
        name: 'Auth',
        description: 'Endpoints de autenticación (públicos)'
      },
      {
        name: 'Profile',
        description: 'Endpoints de perfil de usuario (requieren token)'
      }
    ]
  },
  apis: ['./src/routes/*.js'],
};

const specs = swaggerJsdoc(options);
module.exports = specs;