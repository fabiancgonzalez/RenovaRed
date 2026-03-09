const express = require('express');
const cors = require('cors');
require('dotenv').config(); 
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./src/config/swagger');

const app = express();

// Middlewares 
app.use(cors()); // Habilita CORS para todas las rutas
app.use(express.json()); // Para parsear JSON
app.use(express.urlencoded({ extended: true })); // Para formularios

// ========== DOCUMENTACION SWAGGER ==========
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'RenovaRed API Docs'
}));

// Ruta para obtener la especificacion JSON (para exportar)
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpecs);
});

// == RUTAS DE LA API ==
const homeRoutes = require('./src/routes/home.routes');
app.use('/api/home', homeRoutes);

// Health check
const healthRoutes = require('./src/routes/health.routes');
app.use('/api/health', healthRoutes);

// 404 para rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Puerto
const PORT = process.env.PORT || 3000;

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`==========RenovaRed==========`);
    console.log(` - RenovaRed activo en: http://localhost:${PORT}`);
    console.log(` - Health check: http://localhost:${PORT}/api/health`);
    console.log(` - Swagger: http://localhost:${PORT}/api-docs`);
    console.log(` - Swagger JSON: http://localhost:${PORT}/api-docs.json`);
    console.log(`============================`);
});