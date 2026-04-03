const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./src/config/swagger');
////
const path = require('path');
////
const app = express();
const server = http.createServer(app);
////
// Load env from backend/.env first, then fallback to project root .env.
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
////

//const GEMINI_MODELS = (process.env.GEMINI_MODELS || 'gemini-2.0-flash,gemini-1.5-flash-latest,gemini-1.5-flash')

const DEEPSEEK_MODELS = (process.env.DEEPSEEK_MODELS || 'deepseek-chat,deepseek-coder').split(',')
  .map((model) => model.trim())
  .filter(Boolean);

// ========== CONFIGURACIÓN CORS PARA PRODUCCIÓN ==========
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// ========== EXPORTAR IO ==========
global.io = io;
module.exports.io = io;

// ========== WEBSOCKET ==========
require('./src/websocket')(io);

// ========== MIDDLEWARES ==========
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// REDIRECCION DE RAIZ A HOME
app.get('/', (req, res) => {
  res.redirect('/api/home');
});

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

// ========== RUTAS ==========
const homeRoutes = require('./src/routes/home.routes');
app.use('/api/home', homeRoutes);

const authRoutes = require('./src/routes/auth.routes');
app.use('/api/auth', authRoutes);

const profileRoutes = require('./src/routes/profile.routes');
app.use('/api/profile', profileRoutes);

const userRoutes = require('./src/routes/user.routes');
app.use('/api/users', userRoutes);

const categoryRoutes = require('./src/routes/category.routes');
app.use('/api/categories', categoryRoutes);

const publicationRoutes = require('./src/routes/publication.routes');
app.use('/api/publications', publicationRoutes);

const conversationRoutes = require('./src/routes/conversation.routes');
app.use('/api/conversations', conversationRoutes);

const exchangeRoutes = require('./src/routes/exchange.routes');
app.use('/api/exchanges', exchangeRoutes);

const favoriteRoutes = require('./src/routes/favorite.routes');
app.use('/api/favorites', favoriteRoutes);

const dailyStatsRoutes = require('./src/routes/dailyStats.routes');
app.use('/api/stats', dailyStatsRoutes);

const messageRoutes = require('./src/routes/message.routes');
app.use('/api/conversations/:conversationId/messages', messageRoutes);

const healthRoutes = require('./src/routes/health.routes');
app.use('/api/health', healthRoutes);

const materialQuoteRoutes = require('./src/routes/materialQuote.routes');
app.use('/api/material-quotes', materialQuoteRoutes);

const {
  loadKnowledgeBase,
  searchKnowledgeBase,
  hasLocalAnswer,
  formatKnowledgeContext,
  getKnowledgeBaseStats
} = require('./src/services/knowledgeBase.service');

////////////////////////////
const GEMINI_MODELS = (process.env.GEMINI_MODELS || 'gemini-2.5-flash,gemini-2.0-flash,gemini-flash-latest,gemini-2.0-flash-lite')
  .split(',').map(m => m.trim()).filter(Boolean);

app.get('/api/chat/kb/stats', (req, res) => {
  return res.json({
    ok: true,
    ...getKnowledgeBaseStats()
  });
});

app.post('/api/chat/kb/reload', (req, res) => {
  loadKnowledgeBase();
  return res.json({
    ok: true,
    message: 'Knowledge base recargada',
    ...getKnowledgeBaseStats()
  });
});

app.post('/api/chat', async (req, res) => {
  const { userMessage } = req.body;

  try {
    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ error: 'El campo userMessage es obligatorio' });
    }

    const kbHits = searchKnowledgeBase(userMessage, Number(process.env.KB_TOP_K || 4));
    const localMinScore = Number(process.env.KB_LOCAL_MIN_SCORE || 4);

    if (hasLocalAnswer(kbHits, localMinScore)) {
      const publicationHits = kbHits.filter((h) => h.categoria === 'plataforma-publicaciones').slice(0, 3);
      const nonContactHits = kbHits.filter((h) => h.id !== 'contacto-001').slice(0, 3);
      const contactHit = kbHits.find((h) => h.id === 'contacto-001');

      const topSources = (publicationHits.length > 0 ? publicationHits : nonContactHits)
        .map((hit) => `- ${hit.titulo}: ${hit.contenido}`)
        .join('\n');

      const contactSuffix = contactHit
        ? `\n\n**¿Cómo contactar al vendedor?**\n${contactHit.contenido}`
        : '';

      return res.json({
        reply: `Encontre esta informacion en la base de conocimientos de RenovaRed:\n${topSources}${contactSuffix}`,
        model: 'local-kb-pdf',
        usedLocalKnowledge: true,
        sources: kbHits.map((hit) => ({
          id: hit.id,
          titulo: hit.titulo,
          fuente: hit.fuente,
          sourceType: hit.sourceType
        }))
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        reply: 'No encontre respuesta suficiente en la base de conocimientos local .',
        model: 'fallback-no-gemini',
        usedLocalKnowledge: false,
        sources: kbHits.map((hit) => ({
          id: hit.id,
          titulo: hit.titulo,
          fuente: hit.fuente,
          sourceType: hit.sourceType
        }))
      });
    }

    let data = null;
    let selectedModel = null;
    let lastError = null;
    const knowledgeContext = formatKnowledgeContext(kbHits);

    const promptText = `Eres un asistente experto en economia circular y sustentabilidad para RenovaRed.

Reglas obligatorias:
- Responde solo con la informacion de CONTEXTO_KB cuando sea relevante.
- Si CONTEXTO_KB no trae informacion suficiente, dilo explicitamente.
- No inventes datos, direcciones, horarios ni precios.
- Responde en espanol, tono amable, claro y conciso.
- Si el usuario pide una accion fuera de tu alcance, sugiere un siguiente paso concreto.

CONTEXTO_KB:
${knowledgeContext}

PREGUNTA_USUARIO:
${userMessage}`;

    for (const modelName of GEMINI_MODELS) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: promptText
              }]
            }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 500, topP: 0.8, topK: 10 }
          })
        }
      );

      const modelResponse = await response.json().catch(() => ({}));

      if (response.ok) {
        data = modelResponse;
        selectedModel = modelName;
        break;
      }

      const errorMsg = modelResponse?.error?.message || 'Respuesta no valida de Gemini';
      lastError = { status: response.status, model: modelName, details: errorMsg };

      // Solo sigue al siguiente modelo si es un 404 de modelo no encontrado
      const isModelNotFound = response.status === 404 && /not found|models\//i.test(errorMsg);
      if (!isModelNotFound) break;
    }

    if (!data) {
      console.error('Gemini API error:', lastError);
      // Si todos los modelos fallaron, devolver respuesta util en lugar de error
      return res.json({
        reply: 'El servicio de IA esta temporalmente no disponible. Mientras se restablece: separa papel, plastico, vidrio y metales; limpia y seca envases antes de reciclar; prioriza reutilizar antes de desechar; y lleva materiales a puntos de acopio habilitados en tu ciudad.',
        model: 'fallback-static',
        usedLocalKnowledge: false,
        sources: kbHits.map((hit) => ({
          id: hit.id,
          titulo: hit.titulo,
          fuente: hit.fuente,
          sourceType: hit.sourceType
        }))
      });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      console.error('Gemini response without text:', data);
      return res.status(502).json({
        error: 'Gemini no devolvio texto utilizable',
        details: data?.promptFeedback || data
      });
    }

    res.json({
      reply,
      model: selectedModel,
      usedLocalKnowledge: false,
      sources: kbHits.map((hit) => ({
        id: hit.id,
        titulo: hit.titulo,
        fuente: hit.fuente,
        sourceType: hit.sourceType
      }))
    });

  } catch (error) {
    console.error('Error en /api/chat:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud con Gemini', details: error.message });
  }
});
////////////////////////////////



// 404 para rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});






// Puerto
const PORT = process.env.PORT || 3000;

// Configuración adicional del servidor
server.maxHeadersCount = 2000;
server.timeout = 120000;

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`==========RenovaRed==========`);
    console.log(` - RenovaRed activo en: http://localhost:${PORT}`);
    console.log(` - Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(` - Health check: http://localhost:${PORT}/api/health`);
    console.log(` - Swagger: http://localhost:${PORT}/api-docs`);
    console.log(` - Swagger JSON: http://localhost:${PORT}/api-docs.json`);
    console.log(`============================`);
});
