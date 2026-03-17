const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Publication = sequelize.define('Publication', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  titulo: { type: DataTypes.STRING(255), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  user_id: { type: DataTypes.UUID, allowNull: false },
  tipo_usuario: { type: DataTypes.STRING(50) },
  categoria_id: { type: DataTypes.UUID },
  ubicacion_texto: { type: DataTypes.STRING(255) },
  ubicacion_geom: { type: DataTypes.GEOMETRY('POINT', 4326) },
  place_id: { type: DataTypes.STRING(255) },
  google_places_data: { type: DataTypes.JSONB },
  imagenes: { type: DataTypes.ARRAY(DataTypes.TEXT) },
  disponibilidad: { type: DataTypes.STRING(100) },
  cantidad: { type: DataTypes.STRING(100) },
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