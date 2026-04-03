import fs from 'node:fs';
import path from 'node:path';

const GEMINI_MODELS = (process.env.GEMINI_MODELS || 'gemini-2.5-flash,gemini-2.0-flash,gemini-flash-latest,gemini-2.0-flash-lite')
  .split(',').map(m => m.trim()).filter(Boolean);

const KB_FILE_PATH = path.resolve(process.cwd(), 'backend', 'src', 'data', 'knowledge-base.json');

let kbDocs = [];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  const stopwords = new Set([
    'de', 'la', 'el', 'los', 'las', 'y', 'o', 'en', 'para', 'con', 'sin', 'un', 'una',
    'que', 'por', 'del', 'al', 'se', 'como', 'mas', 'menos', 'mi', 'tu', 'su', 'es', 'son'
  ]);

  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !stopwords.has(token));
}

function loadKnowledgeBase() {
  try {
    const raw = fs.readFileSync(KB_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      kbDocs = [];
      return;
    }

    kbDocs = parsed
      .filter((doc) => doc && doc.id && doc.titulo && doc.contenido)
      .map((doc) => ({
        ...doc,
        _tokens: tokenize(`${doc.titulo} ${doc.categoria || ''} ${doc.contenido}`)
      }));
  } catch (error) {
    kbDocs = [];
    console.error('[KB] Error cargando knowledge-base.json:', error.message);
  }
}

function scoreDocument(queryTokens, doc) {
  if (!queryTokens.length) return 0;

  const title = normalizeText(doc.titulo);
  const category = normalizeText(doc.categoria);
  const tokenSet = new Set(doc._tokens);

  let score = 0;
  for (const token of queryTokens) {
    if (tokenSet.has(token)) score += 2;
    if (title.includes(token)) score += 3;
    if (category.includes(token)) score += 2;
  }

  return score;
}

function searchKnowledgeBase(userMessage, topK = 4) {
  const queryTokens = tokenize(userMessage);

  return kbDocs
    .map((doc) => ({ doc, score: scoreDocument(queryTokens, doc) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((entry) => ({
      id: entry.doc.id,
      titulo: entry.doc.titulo,
      categoria: entry.doc.categoria,
      contenido: entry.doc.contenido,
      fuente: entry.doc.fuente,
      ciudad: entry.doc.ciudad,
      fecha_actualizacion: entry.doc.fecha_actualizacion,
      score: entry.score
    }));
}

function formatKnowledgeContext(hits) {
  if (!Array.isArray(hits) || hits.length === 0) {
    return 'SIN_CONTEXTO_RELEVANTE';
  }

  return hits
    .map((hit, index) => [
      `[DOC ${index + 1}]`,
      `titulo: ${hit.titulo}`,
      `categoria: ${hit.categoria || 'general'}`,
      `contenido: ${hit.contenido}`,
      `fuente: ${hit.fuente || 'sin fuente'}`,
      `ciudad: ${hit.ciudad || 'General'}`,
      `fecha_actualizacion: ${hit.fecha_actualizacion || 'sin fecha'}`
    ].join('\n'))
    .join('\n\n');
}

loadKnowledgeBase();

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const { userMessage } = req.body;

  if (!userMessage || typeof userMessage !== 'string') {
    return res.status(400).json({ error: 'El campo userMessage es obligatorio' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en el servidor' });
  }

  try {
    let data = null;
    let selectedModel = null;
    let lastError = null;
    const kbHits = searchKnowledgeBase(userMessage, Number(process.env.KB_TOP_K || 4));
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

      const errorMsg = modelResponse?.error?.message || 'Error desconocido';
      lastError = { status: response.status, model: modelName, details: errorMsg };

      const isModelNotFound = response.status === 404 && /not found|models\//i.test(errorMsg);
      if (!isModelNotFound) break;
    }

    if (!data) {
      console.error('Gemini error:', lastError);
      return res.status(200).json({
        reply: 'El servicio de IA esta temporalmente no disponible. Mientras se restablece: separa papel, plastico, vidrio y metales; limpia envases antes de reciclar; prioriza reutilizar antes de desechar.',
        model: 'fallback-static',
        sources: kbHits.map((hit) => ({ id: hit.id, titulo: hit.titulo, fuente: hit.fuente }))
      });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      return res.status(200).json({
        reply: 'No pude generar una respuesta en este momento. Intenta de nuevo.',
        model: 'fallback-empty'
      });
    }

    return res.status(200).json({
      reply,
      model: selectedModel,
      sources: kbHits.map((hit) => ({ id: hit.id, titulo: hit.titulo, fuente: hit.fuente }))
    });
  } catch (error) {
    console.error('Error en /api/chat:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
}
