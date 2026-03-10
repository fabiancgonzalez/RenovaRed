const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  tipo: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: { isIn: [['cooperativa', 'reciclador', 'emprendedor', 'admin']] }
  },
  telefono: { type: DataTypes.STRING(50) },
  avatar_url: { type: DataTypes.TEXT },
  ubicacion_texto: { type: DataTypes.STRING(255) },
  ubicacion_geom: { type: DataTypes.GEOMETRY('POINT', 4326) },
  place_id: { type: DataTypes.STRING(255) },
  google_places_data: { type: DataTypes.JSONB },
  last_login: { type: DataTypes.DATE },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password_hash);
};

module.exports = User;