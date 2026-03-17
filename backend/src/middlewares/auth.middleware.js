const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: 'Acceso denegado. Token no proporcionado' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Formato de token inválido' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    // Verificar si está activo
    if (!user.is_active) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario desactivado' 
      });
    }

    req.user = user; 
    req.userId = user.id;
    req.userTipo = user.tipo;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expirado' 
      });
    }
    
    console.error('Error en auth middleware:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error en autenticación' 
    });
  }
};

// Middleware para verificar roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'No autenticado' 
      });
    }
    
    const normalizedRoles = roles.map((role) => String(role).toLowerCase());
    const currentUserRole = String(req.user.tipo || '').toLowerCase();

    if (!normalizedRoles.includes(currentUserRole)) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tiene permisos para acceder a este recurso' 
      });
    }
    
    next();
  };
};

module.exports = {
  authMiddleware,
  authenticate: authMiddleware,
  authorize
};