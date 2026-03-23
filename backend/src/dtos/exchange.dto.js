const PublicationDTO = require('./publication.dto');
const UserDTO = require('./user.dto');

class ExchangeDTO {
  static list(exchange) {
    return {
      id: exchange.id,
      estado: exchange.estado,
      cantidad: exchange.cantidad,
      precio_final: exchange.precio_final,
      kg_aproximados: exchange.kg_aproximados,
      co2_ahorrado_kg: exchange.co2_ahorrado_kg,
      created_at: exchange.created_at,
      publication: exchange.Publication ? PublicationDTO.summary(exchange.Publication) : null,
      comprador: exchange.comprador ? UserDTO.list(exchange.comprador) : null,
      vendedor: exchange.vendedor ? UserDTO.list(exchange.vendedor) : null
    };
  }

  static detail(exchange) {
    return {
      id: exchange.id,
      estado: exchange.estado,
      cantidad: exchange.cantidad,
      precio_final: exchange.precio_final,
      kg_aproximados: exchange.kg_aproximados,
      co2_ahorrado_kg: exchange.co2_ahorrado_kg,
      notas: exchange.notas,
      completed_at: exchange.completed_at,
      created_at: exchange.created_at,
      updated_at: exchange.updated_at,
      publication: exchange.Publication
        ? { ...PublicationDTO.summary(exchange.Publication), precio: exchange.Publication.precio }
        : null,
      comprador: exchange.comprador ? UserDTO.publicProfile(exchange.comprador) : null,
      vendedor: exchange.vendedor ? UserDTO.publicProfile(exchange.vendedor) : null
    };
  }
}

module.exports = ExchangeDTO; 
