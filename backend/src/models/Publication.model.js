const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Publication = sequelize.define('Publication', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  titulo: { type: DataTypes.STRING(255), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  user_id: { type: DataTypes.UUID, allowNull: false },
  tipo_usuario: { type: DataTypes.STRING(50) },
  categories: { type: DataTypes.ARRAY(DataTypes.INTEGER) },
  ubicacion_geom: { type: DataTypes.GEOMETRY('POINT', 4326) },
  place_id: { type: DataTypes.STRING(255) },
  google_places_data: { type: DataTypes.JSONB },
  imagenes: { type: DataTypes.ARRAY(DataTypes.TEXT) },
  disponibilidad: { type: DataTypes.BOOLEAN, defaultValue: true },
  cantidad: { type: DataTypes.DECIMAL },
  precio: { type: DataTypes.DECIMAL },
  estado: { type: DataTypes.STRING(50) },
  vistas: { type: DataTypes.INTEGER, defaultValue: 0 },
  published_at: { type: DataTypes.DATE }
}, {
  tableName: 'publications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Publication;