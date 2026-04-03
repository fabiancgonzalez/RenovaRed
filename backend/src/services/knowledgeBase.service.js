const fs = require('fs');
const path = require('path');
let pdfParse = null;

try {
  pdfParse = require('pdf-parse');
} catch (_) {
  pdfParse = null;
}

const KB_FILE_PATH = path.resolve(__dirname, '../data/knowledge-base.json');
const HELP_PDF_PATH = path.resolve(__dirname, '../../../frontend/public/assets/help/Ayuda RenovaRed.pdf');

let kbDocs = [];
let pdfDocs = [];
let pdfLoaded = false;
let pdfLoadError = null;
let pdfLoadingPromise = null;

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

function chunkTextByWords(text, wordsPerChunk = 120) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const chunks = [];

  for (let index = 0; index < words.length; index += wordsPerChunk) {
    const chunk = words.slice(index, index + wordsPerChunk).join(' ').trim();
    if (chunk.length >= 40) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

async function loadPdfKnowledge() {
  if (pdfLoadingPromise) {
    return pdfLoadingPromise;
  }

  pdfLoadingPromise = (async () => {
    try {
      if (!pdfParse) {
        pdfDocs = [];
        pdfLoaded = false;
        pdfLoadError = 'Dependencia pdf-parse no instalada';
        return;
      }

      if (!fs.existsSync(HELP_PDF_PATH)) {
        pdfDocs = [];
        pdfLoaded = false;
        pdfLoadError = `No existe PDF de ayuda en: ${HELP_PDF_PATH}`;
        return;
      }

      const buffer = fs.readFileSync(HELP_PDF_PATH);
      const parsed = await pdfParse(buffer);
      const text = String(parsed?.text || '').replace(/\s+/g, ' ').trim();

      if (!text) {
        pdfDocs = [];
        pdfLoaded = false;
        pdfLoadError = 'El PDF no contiene texto indexable';
        return;
      }

      pdfDocs = chunkTextByWords(text).map((chunk, index) => ({
        id: `pdf-ayuda-${index + 1}`,
        titulo: 'Ayuda RenovaRed (PDF)',
        categoria: 'ayuda-pdf',
        contenido: chunk,
        fuente: 'Ayuda RenovaRed.pdf',
        ciudad: 'General',
        fecha_actualizacion: null,
        _tokens: tokenize(`Ayuda RenovaRed ${chunk}`)
      }));

      pdfLoaded = true;
      pdfLoadError = null;
    } catch (error) {
      pdfDocs = [];
      pdfLoaded = false;
      pdfLoadError = error.message;
      console.error('[KB] Error cargando PDF de ayuda:', error.message);
    } finally {
      pdfLoadingPromise = null;
    }
  })();

  return pdfLoadingPromise;
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

  loadPdfKnowledge().catch((error) => {
    console.error('[KB] Error iniciando carga de PDF:', error.message);
  });
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

  const rankedKb = kbDocs
    .map((doc) => ({ doc, score: scoreDocument(queryTokens, doc) }))
    .filter((entry) => entry.score > 0)
    .map((entry) => ({ ...entry, sourceType: 'kb-json' }));

  const rankedPdf = pdfDocs
    .map((doc) => ({ doc, score: scoreDocument(queryTokens, doc) }))
    .filter((entry) => entry.score > 0)
    .map((entry) => ({ ...entry, sourceType: 'kb-pdf' }));

  const ranked = [...rankedKb, ...rankedPdf]
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
      score: entry.score,
      sourceType: entry.sourceType
    }));

  // Inject contacto-001 when query asks who sells/has something, or when publication results appear
  const queryNorm = normalizeText(userMessage);
  const contactIntent = /quien (vende|tiene|ofrece|publica|dispone|comercializa)|donde (consigo|comprar|adquirir|encontrar|conseguir)|como contactar/.test(queryNorm);
  const hasPublications = ranked.some((r) => r.categoria === 'plataforma-publicaciones');

  if ((contactIntent || hasPublications) && !ranked.some((r) => r.id === 'contacto-001')) {
    const contactDoc = kbDocs.find((doc) => doc.id === 'contacto-001');
    if (contactDoc) {
      ranked.push({
        id: contactDoc.id,
        titulo: contactDoc.titulo,
        categoria: contactDoc.categoria,
        contenido: contactDoc.contenido,
        fuente: contactDoc.fuente,
        ciudad: contactDoc.ciudad,
        fecha_actualizacion: contactDoc.fecha_actualizacion,
        score: 1,
        sourceType: 'kb-json'
      });
    }
  }

  return ranked;
}

function hasLocalAnswer(hits, minScore = 4) {
  if (!Array.isArray(hits) || hits.length === 0) {
    return false;
  }

  const topScore = Number(hits[0]?.score || 0);
  return topScore >= minScore;
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
        `sourceType: ${hit.sourceType || 'kb-json'}`,
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
    totalPdfChunks: pdfDocs.length,
    kbFilePath: KB_FILE_PATH,
    helpPdfPath: HELP_PDF_PATH,
    pdfLoaded,
    pdfLoadError
  };
}

loadKnowledgeBase();

module.exports = {
  loadKnowledgeBase,
  searchKnowledgeBase,
  hasLocalAnswer,
  formatKnowledgeContext,
  getKnowledgeBaseStats
};
