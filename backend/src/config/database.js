const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

// Verificar si estamos en producción con DATABASE_URL
if (process.env.DATABASE_URL) {
  // Modo producción
  console.log('Conectando a base de datos vía DATABASE_URL');
  
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Necesario para Supabase
      }
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 20,
      min: 2,
      acquire: 30000,
      idle: 10000
    }
  });
} else {
  // Modo desarrollo local
  console.log('Conectando a base de datos vía variables separadas (local)');
  
  sequelize = new Sequelize(
    process.env.DB_NAME || 'renovared',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: console.log,
      dialectOptions: {
        ssl: false // En local no SSL
      },
      pool: {
        max: 20,
        min: 2,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

module.exports = sequelize;