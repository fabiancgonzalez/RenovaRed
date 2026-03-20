const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define('Category', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  icono: { type: DataTypes.STRING(100) },
  descripcion: { type: DataTypes.TEXT },
  color: { type: DataTypes.STRING(20) },
  parent_id: { type: DataTypes.UUID },
  nivel: { type: DataTypes.INTEGER }
}, {
  tableName: 'categories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Category;