const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  conversation_id: { type: DataTypes.UUID, allowNull: false },
  sender_id: { type: DataTypes.UUID, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  attachments: { type: DataTypes.ARRAY(DataTypes.TEXT) },
  read: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'messages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false // No tiene updated_at segun diagrama
});

module.exports = Message;