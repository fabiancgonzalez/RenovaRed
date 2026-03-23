const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Exchange = sequelize.define('Exchange', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  conversation_id: { type: DataTypes.UUID, allowNull: false },
  publication_id: { type: DataTypes.UUID, allowNull: false },
  buyer_id: { type: DataTypes.UUID, allowNull: false },
  seller_id: { type: DataTypes.UUID, allowNull: false },
  cantidad: { type: DataTypes.DECIMAL, allowNull: false },
  precio_final: { type: DataTypes.DECIMAL },
  kg_aproximados: { type: DataTypes.DECIMAL },
  co2_ahorrado_kg: { type: DataTypes.DECIMAL },
  estado: { 
    type: DataTypes.STRING(50), 
    defaultValue: 'Pendiente',
    validate: { isIn: [['Pendiente', 'Aceptado', 'Rechazado', 'Cancelado']] }
  },
  notas: { type: DataTypes.TEXT },
  completed_at: { type: DataTypes.DATE }
}, {
  tableName: 'exchanges',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Exchange;