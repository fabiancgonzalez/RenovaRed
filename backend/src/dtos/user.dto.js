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
      updated_at: user.updated_at,
      bio: user.bio,
      website: user.website,
      instagram: user.instagram,
      facebook: user.facebook,
      linkedin: user.linkedin,
      x_handle: user.x_handle,
      puntos: user.puntos,
      reputacion: user.reputacion
    };
  }

  static publicView(user) {
    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      tipo: user.tipo,
      telefono: user.telefono,
      avatar_url: user.avatar_url,
      ubicacion_texto: user.ubicacion_texto,
      coordinates: this._coordinates(user),
      bio: user.bio,
      reputacion: user.reputacion,
      puntos: user.puntos,
      created_at: user.created_at,
      website: user.website,
      instagram: user.instagram,
      facebook: user.facebook,
      linkedin: user.linkedin,
      x_handle: user.x_handle
    };
  }

  static withToken(user, token) {
    return {
      user: this.publicProfile(user),
      token
    };
  }

  static list(user) {
    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      tipo: user.tipo,
      telefono: user.telefono,
      avatar_url: user.avatar_url,
      ubicacion_texto: user.ubicacion_texto,
      reputacion: user.reputacion
    };
  }

  static forHome(user) {
    return {
      id: user.id,
      nombre: user.nombre,
      tipo: user.tipo,
      avatar_url: user.avatar_url,
      ubicacion_texto: user.ubicacion_texto,
      reputacion: user.reputacion
    };
  }

  static mapLocation(user, coordinates) {
    return {
      id: user.id,
      nombre: user.nombre,
      tipo: user.tipo,
      avatar_url: user.avatar_url,
      ubicacion_texto: user.ubicacion_texto,
      coordinates,
      reputacion: user.reputacion
    };
  }
}

module.exports = UserDTO;