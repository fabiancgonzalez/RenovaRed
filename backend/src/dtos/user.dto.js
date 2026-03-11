class UserDTO {
  // Perfil público (sin password_hash, sin campos sensibles)
  static publicProfile(user) {
    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      tipo: user.tipo,
      telefono: user.telefono,
      avatar_url: user.avatar_url,
      ubicacion_texto: user.ubicacion_texto,
      is_active: user.is_active,
      last_login: user.last_login,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  }

  // Para respuestas que incluyen token (login/register)
  static withToken(user, token) {
    return {
      user: this.publicProfile(user),
      token
    };
  }

  // Para listados (menos información)
  static list(user) {
    return {
      id: user.id,
      nombre: user.nombre,
      tipo: user.tipo,
      avatar_url: user.avatar_url,
      ubicacion_texto: user.ubicacion_texto
    };
  }

  // Para el home (destacados)
  static forHome(user) {
    return {
      id: user.id,
      nombre: user.nombre,
      tipo: user.tipo,
      avatar_url: user.avatar_url,
      ubicacion_texto: user.ubicacion_texto
    };
  }
}

module.exports = UserDTO;