const express = require('express');
const cors = require('cors');
require('dotenv').config(); 

const app = express();

// Middlewares 
app.use(cors()); // Habilita CORS para todas las rutas
app.use(express.json()); // Para parsear JSON
app.use(express.urlencoded({ extended: true })); // Para formularios

// == RUTAS ==
// aca van a ir las futuras rutas

// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'RenovaRed funcionando correctamente',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

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
    console.log(`============================`);
});