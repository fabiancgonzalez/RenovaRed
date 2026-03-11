const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const ALLOWED_TIPOS = ['Cooperativa', 'Recicladora', 'Emprendedor', 'Persona', 'Admin'];
const TIPO_NORMALIZATION_MAP = {
  cooperativa: 'Cooperativa',
  recicladora: 'Recicladora',
  reciclador: 'Recicladora',
  emprendedor: 'Emprendedor',
  persona: 'Persona',
  admin: 'Admin'
};

class AuthService {
  getJwtSecret() {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no configurado');
    }
    return process.env.JWT_SECRET;
  }

  buildTokenPayload(user) {
    return {
      id: user.id,
      email: user.email,
      tipo: user.tipo
    };
  }

  buildUserResponse(user) {
    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      tipo: user.tipo,
      telefono: user.telefono,
      avatar_url: user.avatar_url,
      ubicacion_texto: user.ubicacion_texto,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: user.last_login
    };
  }

  async register(data) {
    const nombre = data?.nombre?.trim();
    const email = data?.email?.trim()?.toLowerCase();
    const password = data?.password;
    const tipoInput = data?.tipo?.trim();
    const tipo = tipoInput ? TIPO_NORMALIZATION_MAP[tipoInput.toLowerCase()] : null;

    if (!nombre || !email || !password || !tipo) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'nombre, email, password y tipo son obligatorios'
        }
      };
    }

    if (!ALLOWED_TIPOS.includes(tipo)) {
      return {
        status: 400,
        body: {
          success: false,
          message: `tipo invalido. Valores permitidos: ${ALLOWED_TIPOS.join(', ')}`
        }
      };
    }

    if (password.length < 6) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'La password debe tener al menos 6 caracteres'
        }
      };
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return {
        status: 409,
        body: {
          success: false,
          message: 'El email ya se encuentra registrado'
        }
      };
    }

    const password_hash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      nombre,
      email,
      password_hash,
      tipo,
      telefono: data.telefono || null,
      avatar_url: data.avatar_url || null,
      ubicacion_texto: data.ubicacion_texto || null
    });

    const token = jwt.sign(this.buildTokenPayload(newUser), this.getJwtSecret(), {
      expiresIn: '7d'
    });

    return {
      status: 201,
      body: {
        success: true,
        message: 'Usuario registrado correctamente',
        data: {
          user: this.buildUserResponse(newUser),
          token
        }
      }
    };
  }

  async login(data) {
    const email = data?.email?.trim()?.toLowerCase();
    const password = data?.password;

    if (!email || !password) {
      return {
        status: 400,
        body: {
          success: false,
          message: 'email y password son obligatorios'
        }
      };
    }

    const user = await User.findOne({ where: { email } });

    if (!user || !user.is_active) {
      return {
        status: 401,
        body: {
          success: false,
          message: 'Credenciales invalidas'
        }
      };
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return {
        status: 401,
        body: {
          success: false,
          message: 'Credenciales invalidas'
        }
      };
    }

    user.last_login = new Date();
    await user.save();

    const token = jwt.sign(this.buildTokenPayload(user), this.getJwtSecret(), {
      expiresIn: '7d'
    });

    return {
      status: 200,
      body: {
        success: true,
        message: 'Login exitoso',
        data: {
          user: this.buildUserResponse(user),
          token
        }
      }
    };
  }
}

module.exports = new AuthService();
