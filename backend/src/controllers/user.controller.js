const userService = require('../services/user.service');

// Obtener todos los usuarios (con paginación y filtros)
const getAllUsers = async (req, res) => {
  const { page, limit, tipo, is_active } = req.query;
  const result = await userService.getAll({ page, limit, tipo, is_active });
  res.status(result.status).json(result.body);
};

// Obtener usuario por ID (público - solo info básica)
const getUserById = async (req, res) => {
  const { id } = req.params;
  const result = await userService.getById(id);
  res.status(result.status).json(result.body);
};

// Obtener perfil público de usuario (para ver perfiles de otros)
const getPublicProfile = async (req, res) => {
  const { userId } = req.params;
  const result = await userService.getPublicProfile(userId);
  res.status(result.status).json(result.body);
};

// Obtener ubicaciones para el mapa
const getMapLocations = async (req, res) => {
  const result = await userService.getMapLocations();
  res.status(result.status).json(result.body);
};

// Actualizar usuario
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { body } = req;
  const result = await userService.update(id, req.user.id, req.user.tipo, body);
  res.status(result.status).json(result.body);
};

// Desactivar usuario
const deactivateUser = async (req, res) => {
  const { id } = req.params;
  const result = await userService.deactivate(id, req.user.id, req.user.tipo);
  res.status(result.status).json(result.body);
};

// Reactivar usuario (solo admin)
const reactivateUser = async (req, res) => {
  const { id } = req.params;
  const result = await userService.reactivate(id, req.user.tipo);
  res.status(result.status).json(result.body);
};

// Cambiar rol de usuario (solo admin)
const changeRole = async (req, res) => {
  const { id } = req.params;
  const { tipo } = req.body;
  const result = await userService.changeRole(id, req.user.tipo, tipo);
  res.status(result.status).json(result.body);
};

// Eliminar usuario permanentemente (solo admin)
const hardDeleteUser = async (req, res) => {
  const { id } = req.params;
  const result = await userService.hardDelete(id, req.user.tipo);
  res.status(result.status).json(result.body);
};

// Obtener estadísticas de usuarios (para gráficos)
const getUserStats = async (req, res) => {
  const result = await userService.getUserStats();
  res.status(result.status).json(result.body);
};

// Obtener estadísticas del usuario autenticado
const getMyStats = async (req, res) => {
  const result = await userService.getMyStats(req.user.id);
  res.status(result.status).json(result.body);
};

// Obtener actividad reciente del usuario autenticado
const getMyActivity = async (req, res) => {
  const result = await userService.getMyActivity(req.user.id);
  res.status(result.status).json(result.body);
};

// Obtener publicaciones del usuario autenticado
const getMyPublications = async (req, res) => {
  const { page, limit, categoria_id } = req.query;
  const result = await userService.getMyPublications(req.user.id, { page, limit, categoria_id });
  res.status(result.status).json(result.body);
};

module.exports = {
  getAllUsers,
  getUserById,
  getPublicProfile,
  getMapLocations,
  updateUser,
  deactivateUser,
  reactivateUser,
  changeRole,
  hardDeleteUser,
  getUserStats,
  getMyStats,
  getMyActivity,
  getMyPublications
};