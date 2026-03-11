const { User } = require('../models');
const bcrypt = require('bcryptjs');
const UserDTO = require('../dtos/user.dto');

// Ver perfil (GET)
const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: UserDTO.publicProfile(req.user)
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil'
    });
  }
};

// Editar perfil (PUT)
const updateProfile = async (req, res) => {
  try {
    const { nombre, telefono, avatar_url, ubicacion_texto } = req.body;
    
    // Actualizar solo los campos proporcionados
    const updateData = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (ubicacion_texto !== undefined) updateData.ubicacion_texto = ubicacion_texto;
    
    await req.user.update(updateData);

    // Recargar usuario para obtener datos actualizados
    await req.user.reload();

    res.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      data: UserDTO.publicProfile(req.user)
    });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil'
    });
  }
};

// Cambiar contraseña (POST)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validar que llegaron los datos
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual y nueva son obligatorias'
      });
    }

    // Validar nueva contraseña
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, req.user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    // Hashear y guardar nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);
    await req.user.update({ password_hash });

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar contraseña'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword
};