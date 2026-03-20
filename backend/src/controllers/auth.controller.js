const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const UserDTO = require('../dtos/user.dto');

const GOOGLE_DEFAULT_USER_TYPE = 'Persona';

const getGoogleClient = () => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return null;
  }

  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
};

const generateToken = (user) => jwt.sign(
  {
    id: user.id,
    email: user.email,
    tipo: user.tipo
  },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Registro de usuario
const register = async (req, res) => {
  try {
    const { nombre, email, password, tipo, telefono } = req.body;

    // Validar campos obligatorios
    if (!nombre || !email || !password || !tipo) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: nombre, email, password, tipo'
      });
    }

    // Validar tipo de usuario (actualizado con los valores de la BD)
    const tiposValidos = ['Cooperativa', 'Recicladora', 'Emprendedor', 'Persona', 'Admin'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de usuario no válido. Debe ser: Cooperativa, Recicladora, Emprendedor, Persona o Admin'
      });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
      });
    }

    // Validar password mínimo 6 caracteres
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Verificar si el email ya existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Crear usuario
    const user = await User.create({
      nombre,
      email,
      password_hash,
      tipo,
      telefono: telefono || null,
      is_active: true
    });

    // Generar token JWT
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado correctamente',
      data: UserDTO.withToken(user, token)
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario',
      error: error.message
    });
  }
};

// Login de usuario
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar campos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son obligatorios'
      });
    }

    // Buscar usuario por email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar si está activo
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Usuario desactivado. Contacte al administrador'
      });
    }

    // Comparar contraseñas
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Actualizar last_login
    await user.update({ last_login: new Date() });

    // Generar token
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login exitoso',
      data: UserDTO.withToken(user, token)
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
      error: error.message
    });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'El token de Google es obligatorio'
      });
    }

    const googleClient = getGoogleClient();
    if (!googleClient) {
      return res.status(500).json({
        success: false,
        message: 'GOOGLE_CLIENT_ID no está configurado en el servidor'
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({
        success: false,
        message: 'La cuenta de Google no tiene un email verificado'
      });
    }

    const normalizedEmail = payload.email.toLowerCase();
    let user = await User.findOne({ where: { email: normalizedEmail } });

    if (!user) {
      const randomPassword = crypto.randomUUID();
      const password_hash = await bcrypt.hash(randomPassword, 10);

      user = await User.create({
        nombre: payload.name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password_hash,
        tipo: GOOGLE_DEFAULT_USER_TYPE,
        avatar_url: payload.picture || null,
        is_active: true,
        last_login: new Date()
      });
    } else {
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Usuario desactivado. Contacte al administrador'
        });
      }

      const updates = { last_login: new Date() };

      if ((!user.nombre || user.nombre.trim() === '') && payload.name) {
        updates.nombre = payload.name;
      }

      if (!user.avatar_url && payload.picture) {
        updates.avatar_url = payload.picture;
      }

      await user.update(updates);
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login con Google exitoso',
      data: UserDTO.withToken(user, token)
    });

  } catch (error) {
    console.error('Error en login con Google:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión con Google',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  googleLogin
};
