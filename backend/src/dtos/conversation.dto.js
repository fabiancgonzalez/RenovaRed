const PublicationDTO = require('./publication.dto');
const UserDTO = require('./user.dto');

class ConversationDTO {
  // Para listado de mis conversaciones (con último mensaje)
  static list(conv) {
    const lastMessage = conv.Messages && conv.Messages.length > 0 ? conv.Messages[0] : null;
    return {
      id: conv.id,
      buyer_id: conv.buyer_id,
      seller_id: conv.seller_id,
      updated_at: conv.updated_at,
      created_at: conv.created_at,
      publication: conv.Publication ? PublicationDTO.summary(conv.Publication) : null,
      ultimo_mensaje: lastMessage
        ? {
            content: lastMessage.content,
            created_at: lastMessage.created_at,
            read: lastMessage.read
          }
        : null
    };
  }

  // Detalle con todos los mensajes
  static detail(conv) {
    return {
      id: conv.id,
      buyer_id: conv.buyer_id,
      seller_id: conv.seller_id,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      publication: conv.Publication
        ? { ...PublicationDTO.summary(conv.Publication), estado: conv.Publication.estado, precio: conv.Publication.precio }
        : null,
      mensajes: conv.Messages ? conv.Messages.map(ConversationDTO.message) : []
    };
  }

  // Forma de un mensaje individual
  static message(msg) {
    return {
      id: msg.id,
      content: msg.content,
      attachments: msg.attachments,
      read: msg.read,
      created_at: msg.created_at,
      remitente: msg.remitente ? UserDTO.list(msg.remitente) : null
    };
  }
}

module.exports = ConversationDTO;
