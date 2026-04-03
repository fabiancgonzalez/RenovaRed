const fs = require('fs');
const path = require('path');

const REQUIRED_HEADERS = [
  'id',
  'titulo',
  'categoria',
  'contenido',
  'fuente',
  'ciudad',
  'fecha_actualizacion'
];

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function readCsvRecords(csvFilePath) {
  const content = fs.readFileSync(csvFilePath, 'utf8');
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('El CSV debe contener encabezados y al menos una fila de datos.');
  }

  const headers = parseCsvLine(lines[0]);
  const missingHeaders = REQUIRED_HEADERS.filter((required) => !headers.includes(required));
  if (missingHeaders.length > 0) {
    throw new Error(`Faltan columnas obligatorias: ${missingHeaders.join(', ')}`);
  }

  const rows = lines.slice(1);
  return rows.map((row, index) => {
    const values = parseCsvLine(row);
    const record = {};

    headers.forEach((header, colIndex) => {
      record[header] = values[colIndex] || '';
    });

    const fallbackId = `${slugify(record.categoria || 'general')}-${slugify(record.titulo || `doc-${index + 1}`)}-${index + 1}`;

    return {
      id: record.id || fallbackId,
      titulo: record.titulo,
      categoria: record.categoria,
      contenido: record.contenido,
      fuente: record.fuente || 'Sin fuente',
      ciudad: record.ciudad || 'General',
      fecha_actualizacion: record.fecha_actualizacion || new Date().toISOString().slice(0, 10)
    };
  });
}

function validateRecords(records) {
  const ids = new Set();
  const errors = [];

  records.forEach((record, index) => {
    const row = index + 2;

    if (!record.id) errors.push(`Fila ${row}: id vacio`);
    if (!record.titulo) errors.push(`Fila ${row}: titulo vacio`);
    if (!record.contenido) errors.push(`Fila ${row}: contenido vacio`);

    if (record.id) {
      if (ids.has(record.id)) {
        errors.push(`Fila ${row}: id duplicado (${record.id})`);
      }
      ids.add(record.id);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Errores de validacion:\n- ${errors.join('\n- ')}`);
  }
}

function main() {
  const backendRoot = path.resolve(__dirname, '..');
  const inputArg = process.argv[2] || 'src/data/knowledge-base.template.csv';
  const outputArg = process.argv[3] || 'src/data/knowledge-base.json';

  const inputPath = path.resolve(backendRoot, inputArg);
  const outputPath = path.resolve(backendRoot, outputArg);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`No existe el CSV de entrada: ${inputPath}`);
  }

  const records = readCsvRecords(inputPath);
  validateRecords(records);

  fs.writeFileSync(outputPath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');

  console.log('Importacion completada');
  console.log(`- Entrada: ${inputPath}`);
  console.log(`- Salida: ${outputPath}`);
  console.log(`- Registros: ${records.length}`);
}

try {
  main();
} catch (error) {
  console.error('Error importando CSV de knowledge base:');
  console.error(error.message);
  process.exit(1);
}
