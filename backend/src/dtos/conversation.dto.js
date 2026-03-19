const MessageDTO = require('./message.dto');

class ConversationDTO {
  static list(conv, userId) {
    if (!conv) return null;
    
    try {
      let otroUsuario = null;
      
      if (conv.buyer_id === userId) {
        otroUsuario = conv.vendedor;
      } else if (conv.seller_id === userId) {
        otroUsuario = conv.comprador;
      }
      
      if (!otroUsuario && conv.comprador && conv.comprador.id !== userId) {
        otroUsuario = conv.comprador;
      } else if (!otroUsuario && conv.vendedor && conv.vendedor.id !== userId) {
        otroUsuario = conv.vendedor;
      }

      if (!otroUsuario) {
        return {
          id: conv.id,
          publication_id: conv.publication_id,
          otro_usuario: {
            id: 'unknown',
            nombre: 'Usuario',
            avatar: null,
            last_login: null
          },
          ultimo_mensaje: conv.ultimo_mensaje || '',
          ultimo_mensaje_at: conv.ultimo_mensaje_at || conv.updated_at,
          estado: conv.estado || 'pendiente',
          no_leidos: 0
        };
      }

      return {
        id: conv.id,
        publication_id: conv.publication_id,
        otro_usuario: {
          id: otroUsuario.id || '',
          nombre: otroUsuario.nombre || 'Usuario',
          avatar: otroUsuario.avatar_url || null,
          last_login: otroUsuario.last_login || null
        },
        ultimo_mensaje: conv.ultimo_mensaje || '',
        ultimo_mensaje_at: conv.ultimo_mensaje_at || conv.updated_at,
        estado: conv.estado || 'pendiente',
        no_leidos: 0
      };
    } catch (error) {
      console.error('Error en ConversationDTO.list:', error);
      return null;
    }
  }

  static detail(conv, userId) {
    if (!conv) return null;
    
    try {
      return {
        id: conv.id,
        publication_id: conv.publication_id,
        comprador: conv.comprador ? {
          id: conv.comprador.id || '',
          nombre: conv.comprador.nombre || 'Usuario',
          avatar: conv.comprador.avatar_url || null,
          last_login: conv.comprador.last_login || null
        } : null,
        vendedor: conv.vendedor ? {
          id: conv.vendedor.id || '',
          nombre: conv.vendedor.nombre || 'Usuario',
          avatar: conv.vendedor.avatar_url || null,
          last_login: conv.vendedor.last_login || null
        } : null,
        estado: conv.estado || 'pendiente',
        created_at: conv.created_at,
        mensajes: conv.mensajes ? MessageDTO.list(conv.mensajes) : []
      };
    } catch (error) {
      console.error('Error en ConversationDTO.detail:', error);
      return null;
    }
  }
}

module.exports = ConversationDTO;