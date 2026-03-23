const { User } = require('../models');
const bcrypt = require('bcryptjs');
const UserDTO = require('../dtos/user.dto');

const isValidCoordinate = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;

// Ver perfil propio (GET)
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

// Ver perfil de otro usuario (GET) - requiere autenticación
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    if (!user.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no disponible'
      });
    }
    
    res.json({
      success: true,
      data: UserDTO.publicView(user)
    });
  } catch (error) {
    console.error('Error obteniendo perfil de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil'
    });
  }
};

// Editar perfil (PUT)
const updateProfile = async (req, res) => {
  try {
    const { 
      nombre, telefono, avatar_url, ubicacion_texto, latitud, longitud,
      bio, website, instagram, facebook, linkedin, x_handle 
    } = req.body;
    
    const updateData = {};
    
    // Campos básicos
    if (nombre !== undefined) updateData.nombre = nombre;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (ubicacion_texto !== undefined) updateData.ubicacion_texto = ubicacion_texto;
    
    // Nuevos campos
    if (bio !== undefined) updateData.bio = bio;
    if (website !== undefined) updateData.website = website;
    if (instagram !== undefined) updateData.instagram = instagram;
    if (facebook !== undefined) updateData.facebook = facebook;
    if (linkedin !== undefined) updateData.linkedin = linkedin;
    if (x_handle !== undefined) updateData.x_handle = x_handle;

    // Coordenadas
    const parsedLat = latitud === null || latitud === '' || latitud === undefined ? null : Number(latitud);
    const parsedLng = longitud === null || longitud === '' || longitud === undefined ? null : Number(longitud);

    if ((parsedLat === null) !== (parsedLng === null)) {
      return res.status(400).json({
        success: false,
        message: 'Latitud y longitud deben enviarse juntas'
      });
    }

    if (parsedLat !== null && parsedLng !== null) {
      if (!isValidCoordinate(parsedLat, -90, 90) || !isValidCoordinate(parsedLng, -180, 180)) {
        return res.status(400).json({
          success: false,
          message: 'Latitud o longitud fuera de rango válido'
        });
      }

      updateData.ubicacion_geom = {
        type: 'Point',
        coordinates: [parsedLng, parsedLat]
      };
    }
    
    await req.user.update(updateData);
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

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual y nueva son obligatorias'
      });
    }

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
  getUserProfile,
  updateProfile,
  changePassword
};