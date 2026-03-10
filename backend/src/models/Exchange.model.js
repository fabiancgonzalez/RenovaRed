const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Exchange = sequelize.define('Exchange', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  publication_id: { type: DataTypes.INTEGER, allowNull: false },
  buyer_id: { type: DataTypes.UUID, allowNull: false },
  seller_id: { type: DataTypes.UUID, allowNull: false },
  cantidad: { type: DataTypes.DECIMAL },
  precio_final: { type: DataTypes.DECIMAL },
  estado: { type: DataTypes.STRING(50), defaultValue: 'completado' },
  kg_aproximados: { type: DataTypes.DECIMAL },
  co2_ahorrado_kg: { type: DataTypes.DECIMAL },
  completed_at: { type: DataTypes.DATE }
}, {
  tableName: 'exchanges',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Exchange;