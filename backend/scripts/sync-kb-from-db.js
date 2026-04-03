const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');
const sequelize = require('../src/config/database');

const OUTPUT_PATH = path.resolve(__dirname, '../src/data/knowledge-base.json');
const TODAY = new Date().toISOString().slice(0, 10);

function safeText(value, fallback = '') {
  const text = String(value ?? fallback).trim();
  return text.length ? text : fallback;
}

function readExistingKnowledgeBase(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(`[KB] No se pudo leer JSON existente, se recreara: ${error.message}`);
    return [];
  }
}

async function fetchPublicationRows(limit) {
  return sequelize.query(
    `
      SELECT
        p.id,
        p.titulo,
        p.descripcion,
        p.ubicacion_texto,
        p.disponibilidad,
        p.cantidad,
        p.precio,
        p.estado,
        p.updated_at,
        c.nombre AS category_name
      FROM publications p
      LEFT JOIN categories c ON c.id = p.categoria_id
      ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC NULLS LAST
      LIMIT :limit
    `,
    {
      replacements: { limit },
      type: QueryTypes.SELECT
    }
  );
}

async function fetchMaterialQuoteRows(limit) {
  return sequelize.query(
    `
      SELECT
        mq.id,
        mq.category_name,
        mq.material_name,
        mq.unit_price_ars,
        mq.notes,
        mq.is_active,
        mq.updated_at
      FROM material_quotes mq
      WHERE mq.is_active = TRUE
      ORDER BY mq.updated_at DESC NULLS LAST, mq.created_at DESC NULLS LAST
      LIMIT :limit
    `,
    {
      replacements: { limit },
      type: QueryTypes.SELECT
    }
  );
}

function publicationToKbDoc(row) {
  const category = safeText(row.category_name, 'publicaciones');
  const city = safeText(row.ubicacion_texto, 'General');

  const pieces = [
    `Publicacion: ${safeText(row.titulo, 'Sin titulo')}`,
    safeText(row.descripcion, 'Sin descripcion disponible.'),
    `Categoria: ${category}.`,
    `Ubicacion: ${city}.`,
    `Disponibilidad: ${safeText(row.disponibilidad, 'No especificada')}.`,
    `Cantidad: ${safeText(row.cantidad, 'No especificada')}.`
  ];

  if (row.precio !== null && row.precio !== undefined && row.precio !== '') {
    pieces.push(`Precio publicado: ARS ${row.precio}.`);
  }

  pieces.push(`Estado: ${safeText(row.estado, 'No especificado')}.`);

  return {
    id: `db-publication-${row.id}`,
    titulo: safeText(row.titulo, 'Publicacion RenovaRed'),
    categoria: 'plataforma-publicaciones',
    contenido: pieces.join(' '),
    fuente: 'DB RenovaRed - publications',
    ciudad: city,
    fecha_actualizacion: row.updated_at ? new Date(row.updated_at).toISOString().slice(0, 10) : TODAY
  };
}

function quoteToKbDoc(row) {
  const category = safeText(row.category_name, 'materiales');
  const notes = safeText(row.notes, 'Sin notas adicionales.');

  return {
    id: `db-material-quote-${row.id}`,
    titulo: `Cotizacion de ${safeText(row.material_name, 'material')}`,
    categoria: 'material-quotes',
    contenido: `Material: ${safeText(row.material_name, 'No especificado')}. Categoria: ${category}. Precio de referencia: ARS ${safeText(row.unit_price_ars, '0')} por unidad. Notas: ${notes}`,
    fuente: 'DB RenovaRed - material_quotes',
    ciudad: 'General',
    fecha_actualizacion: row.updated_at ? new Date(row.updated_at).toISOString().slice(0, 10) : TODAY
  };
}

function mergeManualAndDynamic(existingDocs, dynamicDocs) {
  const manualDocs = existingDocs.filter((doc) => !String(doc.id || '').startsWith('db-'));
  const byId = new Map();

  [...manualDocs, ...dynamicDocs].forEach((doc) => {
    if (!doc || !doc.id || !doc.titulo || !doc.contenido) return;
    byId.set(doc.id, doc);
  });

  return Array.from(byId.values());
}

async function main() {
  const publicationLimit = Number(process.env.KB_SYNC_PUBLICATIONS_LIMIT || 150);
  const quoteLimit = Number(process.env.KB_SYNC_QUOTES_LIMIT || 150);

  if (!Number.isFinite(publicationLimit) || publicationLimit <= 0) {
    throw new Error('KB_SYNC_PUBLICATIONS_LIMIT debe ser un numero positivo.');
  }

  if (!Number.isFinite(quoteLimit) || quoteLimit <= 0) {
    throw new Error('KB_SYNC_QUOTES_LIMIT debe ser un numero positivo.');
  }

  await sequelize.authenticate();

  const [publicationRows, quoteRows] = await Promise.all([
    fetchPublicationRows(publicationLimit),
    fetchMaterialQuoteRows(quoteLimit)
  ]);

  const publicationDocs = publicationRows.map(publicationToKbDoc);
  const quoteDocs = quoteRows.map(quoteToKbDoc);
  const dynamicDocs = [...publicationDocs, ...quoteDocs];

  const existingDocs = readExistingKnowledgeBase(OUTPUT_PATH);
  const finalDocs = mergeManualAndDynamic(existingDocs, dynamicDocs);

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(finalDocs, null, 2)}\n`, 'utf8');

  console.log('[KB] Sincronizacion completada');
  console.log(`[KB] Archivo: ${OUTPUT_PATH}`);
  console.log(`[KB] Manuales conservados: ${existingDocs.filter((d) => !String(d.id || '').startsWith('db-')).length}`);
  console.log(`[KB] Dinamicos desde DB: ${dynamicDocs.length}`);
  console.log(`[KB] Total final: ${finalDocs.length}`);
}

main()
  .catch((error) => {
    console.error('[KB] Error en sincronizacion desde DB:');
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch (_) {
      // noop
    }
  });
