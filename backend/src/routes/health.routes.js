const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verifica el estado del servidor
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'RenovaRed funcionando correctamente',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        endpoints: {
            home: '/api/home',
            health: '/api/health',
            docs: '/api-docs'
        }
    });
});

module.exports = router;