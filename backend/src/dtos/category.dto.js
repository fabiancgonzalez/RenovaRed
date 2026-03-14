class CategoryDTO {
  // Datos completos de una categoría
  static base(cat) {
    return {
      id: cat.id,
      nombre: cat.nombre,
      descripcion: cat.descripcion,
      icono: cat.icono,
      color: cat.color,
      parent_id: cat.parent_id,
      nivel: cat.nivel,
      created_at: cat.created_at,
      updated_at: cat.updated_at
    };
  }

  // Para listados o uso embebido (solo datos visuales)
  static list(cat) {
    return {
      id: cat.id,
      nombre: cat.nombre,
      icono: cat.icono,
      color: cat.color,
      nivel: cat.nivel
    };
  }
}

module.exports = CategoryDTO;
