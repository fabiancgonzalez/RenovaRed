class UserDTO {
  static _coordinates(user) {
    const geometryCoordinates = user?.ubicacion_geom?.coordinates;
    if (Array.isArray(geometryCoordinates) && geometryCoordinates.length >= 2) {
      const [lng, lat] = geometryCoordinates;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }

    return null;
  }

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
      coordinates: this._coordinates(user),
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

  static mapLocation(user, coordinates) {
    return {
      id: user.id,
      nombre: user.nombre,
      tipo: user.tipo,
      avatar_url: user.avatar_url,
      ubicacion_texto: user.ubicacion_texto,
      coordinates
    };
  }
}

module.exports = UserDTO;