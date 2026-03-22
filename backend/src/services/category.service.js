const { Publication ,Category } = require('../models');

class CategoryService {
  // AGREGADO:
  async getCategoryStats() {

    const categories = await Category.findAll({ raw: true });
    const publications = await Publication.findAll({
      attributes: ['categoria_id'],
      raw: true
    });

    const stats = categories.map(cat => {
      const count = publications.filter(pub => 
        pub.categoria_id && pub.categoria_id.toString() === cat.id.toString()).length;
      return { nombre: cat.nombre, total: count};
  });
      return { status: 200, body: { success: true, data: stats } };
}
/////////////////////
  async getAll() {
    const categories = await Category.findAll({ order: [['nombre', 'ASC']] });
    return { status: 200, body: { success: true, data: categories } };
  }

  async getById(id) {
    const cat = await Category.findByPk(id);
    if (!cat) return { status: 404, body: { success: false, message: 'Categoría no encontrada' } };
    return { status: 200, body: { success: true, data: cat } };
  }

  async create(data) {
    const { nombre, descripcion, icono, color, parent_id, nivel } = data;
    if (!nombre?.trim()) {
      return { status: 400, body: { success: false, message: 'nombre es obligatorio' } };
    }
    const existing = await Category.findOne({ where: { nombre: nombre.trim() } });
    if (existing) {
      return { status: 409, body: { success: false, message: 'Ya existe una categoría con ese nombre' } };
    }
    const cat = await Category.create({ nombre: nombre.trim(), descripcion, icono, color, parent_id, nivel });
    return { status: 201, body: { success: true, message: 'Categoría creada', data: cat } };
  }

  async update(id, data) {
    const cat = await Category.findByPk(id);
    if (!cat) return { status: 404, body: { success: false, message: 'Categoría no encontrada' } };

    const allowed = ['nombre', 'descripcion', 'icono', 'color', 'parent_id', 'nivel'];
    const updates = {};
    allowed.forEach(f => { if (data[f] !== undefined) updates[f] = data[f]; });

    await cat.update(updates);
    return { status: 200, body: { success: true, message: 'Categoría actualizada', data: cat } };
  }

  async delete(id) {
    const cat = await Category.findByPk(id);
    if (!cat) return { status: 404, body: { success: false, message: 'Categoría no encontrada' } };
    await cat.destroy();
    return { status: 200, body: { success: true, message: 'Categoría eliminada' } };
  }
}

module.exports = new CategoryService();
