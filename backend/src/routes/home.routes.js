const express = require('express');
const router = express.Router();
const homeController = require('../controllers/home.controller');

/**
 * @swagger
 * /home:
 *   get:
 *     summary: Obtiene los datos de la página principal
 *     tags: [Home]
 *     responses:
 *       200:
 *         description: Datos del home obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HomeResponse'
 *       500:
 *         description: Error del servidor
 */
router.get('/', homeController.getHomeData);

module.exports = router;