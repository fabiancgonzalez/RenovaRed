const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - email
 *               - password
 *               - tipo
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Cooperativa Norte"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "coop@test.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "123456"
 *               tipo:
 *                 type: string
 *                 enum: [Cooperativa, Recicladora, Emprendedor, Persona, Admin]
 *                 example: "Cooperativa"
 *               telefono:
 *                 type: string
 *                 example: "123456789"
 *     responses:
 *       201:
 *         description: Usuario registrado correctamente
 *       400:
 *         description: Error de validación
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "coop@test.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login exitoso
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Iniciar sesión con Google
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credential
 *             properties:
 *               credential:
 *                 type: string
 *                 description: ID token devuelto por Google Identity Services
 *     responses:
 *       200:
 *         description: Login con Google exitoso
 *       401:
 *         description: Token inválido o email no verificado
 */
router.post('/google', authController.googleLogin);

module.exports = router;
