const fs = require('fs');
const path = require('path');

const KB_FILE_PATH = path.resolve(__dirname, '../data/knowledge-base.json');

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

  const ranked = kbDocs
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

  return ranked;
}

function formatKnowledgeContext(hits) {
  if (!Array.isArray(hits) || hits.length === 0) {
    return 'SIN_CONTEXTO_RELEVANTE';
  }

  return hits
    .map((hit, index) => {
      return [
        `[DOC ${index + 1}]`,
        `titulo: ${hit.titulo}`,
        `categoria: ${hit.categoria || 'general'}`,
        `contenido: ${hit.contenido}`,
        `fuente: ${hit.fuente || 'sin fuente'}`,
        `ciudad: ${hit.ciudad || 'General'}`,
        `fecha_actualizacion: ${hit.fecha_actualizacion || 'sin fecha'}`
      ].join('\n');
    })
    .join('\n\n');
}

function getKnowledgeBaseStats() {
  return {
    totalDocs: kbDocs.length,
    kbFilePath: KB_FILE_PATH
  };
}

loadKnowledgeBase();

module.exports = {
  loadKnowledgeBase,
  searchKnowledgeBase,
  formatKnowledgeContext,
  getKnowledgeBaseStats
};
