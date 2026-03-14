const CategoryDTO = require('./category.dto');
const UserDTO = require('./user.dto');

class PublicationDTO {
  // Para listados con paginación
  static list(pub) {
    return {
      id: pub.id,
      titulo: pub.titulo,
      imagenes: pub.imagenes,
      precio: pub.precio,
      cantidad: pub.cantidad,
      estado: pub.estado,
      tipo_usuario: pub.tipo_usuario,
      ubicacion_texto: pub.ubicacion_texto,
      vistas: pub.vistas,
      published_at: pub.published_at,
      usuario: pub.usuario ? UserDTO.list(pub.usuario) : null,
      categoria: pub.categoria ? CategoryDTO.list(pub.categoria) : null
    };
  }

  // Detalle completo de una publicación
  static detail(pub) {
    return {
      id: pub.id,
      titulo: pub.titulo,
      descripcion: pub.descripcion,
      imagenes: pub.imagenes,
      precio: pub.precio,
      cantidad: pub.cantidad,
      disponibilidad: pub.disponibilidad,
      estado: pub.estado,
      tipo_usuario: pub.tipo_usuario,
      ubicacion_texto: pub.ubicacion_texto,
      ubicacion_geom: pub.ubicacion_geom,
      place_id: pub.place_id,
      google_places_data: pub.google_places_data,
      vistas: pub.vistas,
      published_at: pub.published_at,
      created_at: pub.created_at,
      updated_at: pub.updated_at,
      usuario: pub.usuario ? UserDTO.publicProfile(pub.usuario) : null,
      categoria: pub.categoria ? CategoryDTO.base(pub.categoria) : null
    };
  }

  // Versión mínima para uso embebido (ej: en exchanges, favoritos)
  static summary(pub) {
    return {
      id: pub.id,
      titulo: pub.titulo,
      imagenes: pub.imagenes
    };
  }
}

module.exports = PublicationDTO;
