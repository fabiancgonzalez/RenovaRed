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
            email: null,
            telefono: null,
            avatar: null,
            last_login: null,
            tipo: null,
            ubicacion_texto: null
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
          email: otroUsuario.email || null,
          telefono: otroUsuario.telefono || null,
          avatar: otroUsuario.avatar_url || null,
          last_login: otroUsuario.last_login || null,
          tipo: otroUsuario.tipo || null,
          ubicacion_texto: otroUsuario.ubicacion_texto || null
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
      // Crear objeto base
      const result = {
        id: conv.id,
        publication_id: conv.publication_id,
        comprador: conv.comprador ? {
          id: conv.comprador.id || '',
          nombre: conv.comprador.nombre || 'Usuario',
          email: conv.comprador.email || null,
          telefono: conv.comprador.telefono || null,
          avatar: conv.comprador.avatar_url || null,
          last_login: conv.comprador.last_login || null,
          tipo: conv.comprador.tipo || null,
          ubicacion_texto: conv.comprador.ubicacion_texto || null
        } : null,
        vendedor: conv.vendedor ? {
          id: conv.vendedor.id || '',
          nombre: conv.vendedor.nombre || 'Usuario',
          email: conv.vendedor.email || null,
          telefono: conv.vendedor.telefono || null,
          avatar: conv.vendedor.avatar_url || null,
          last_login: conv.vendedor.last_login || null,
          tipo: conv.vendedor.tipo || null,
          ubicacion_texto: conv.vendedor.ubicacion_texto || null
        } : null,
        estado: conv.estado || 'pendiente',
        created_at: conv.created_at,
        mensajes: conv.mensajes ? MessageDTO.list(conv.mensajes) : [],
        deleted_by_other: conv.deleted_by_other || false
      };

      // AGREGAR LA PUBLICACIÓN si existe
      if (conv.publication) {
        result.publication = {
          id: conv.publication.id,
          titulo: conv.publication.titulo,
          descripcion: conv.publication.descripcion,
          imagenes: conv.publication.imagenes || [],
          precio: conv.publication.precio,
          cantidad: conv.publication.cantidad,
          estado: conv.publication.estado,
          categoria: conv.publication.categoria ? {
            id: conv.publication.categoria.id,
            nombre: conv.publication.categoria.nombre,
            color: conv.publication.categoria.color
          } : null
        };
      }

      return result;
    } catch (error) {
      console.error('Error en ConversationDTO.detail:', error);
      return null;
    }
  }
}

module.exports = ConversationDTO;