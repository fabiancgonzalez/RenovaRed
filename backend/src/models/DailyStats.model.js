const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DailyStats = sequelize.define('DailyStats', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  fecha: { type: DataTypes.DATEONLY, allowNull: false, unique: true },
  nuevos_usuarios: { type: DataTypes.INTEGER, defaultValue: 0 },
  nuevas_publicaciones: { type: DataTypes.INTEGER, defaultValue: 0 },
  intercambios_completados: { type: DataTypes.INTEGER, defaultValue: 0 },
  kg_reutilizados: { type: DataTypes.DECIMAL, defaultValue: 0 },
  co2_ahorrado_kg: { type: DataTypes.DECIMAL, defaultValue: 0 },
  cooperativas_activas: { type: DataTypes.INTEGER, defaultValue: 0 },
  recicladoras_activas: { type: DataTypes.INTEGER, defaultValue: 0 },
  emprendedores_activos: { type: DataTypes.INTEGER, defaultValue: 0 },
  zonas_activas: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  tableName: 'daily_stats',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = DailyStats;