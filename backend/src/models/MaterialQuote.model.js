const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MaterialQuote = sequelize.define('MaterialQuote', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  category_name: { type: DataTypes.STRING(120), allowNull: true },
  material_name: { type: DataTypes.STRING(180), allowNull: false, unique: true },
  unit_price_ars: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  notes: { type: DataTypes.TEXT, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: 'material_quotes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = MaterialQuote;
