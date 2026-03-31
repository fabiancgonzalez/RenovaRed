const fs = require('fs');
const path = require('path');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const { MaterialQuote } = require('../models');

const QUOTE_FILE_PATH = path.resolve(__dirname, '../../../frontend/cotizacionmateriales.md');
/////  por las dudas de que el path pueda variar según dónde se ejecute el backend, se puede configurar la ruta del archivo de cotizaciones mediante una variable de entorno, por ejemplo: MATERIAL_QUOTE_FILE_PATH. Si no se configura, se usará el path relativo actual.
// const QUOTE_FILE_PATH = process.env.MATERIAL_QUOTE_FILE_PATH
//   ? path.resolve(process.env.MATERIAL_QUOTE_FILE_PATH)
//   : path.resolve(__dirname, '../../../frontend/cotizacionmateriales.md');    

const SUPPORTED_WALLETS = [
  { id: 'uala', name: 'Ualá', webUrl: 'https://www.uala.com.ar/' },
  { id: 'naranjax', name: 'Naranja X', webUrl: 'https://www.naranjax.com/' },
  { id: 'mercadopago', name: 'Mercado Pago', webUrl: 'https://www.mercadopago.com.ar/' },
  { id: 'modo', name: 'MODO', webUrl: 'https://www.modo.com.ar/' }
];

class MaterialQuoteService {
  constructor() {
    this.cache = {
      mtimeMs: null,
      quotes: []
    };
    this.mpClient = null;
    this.mpToken = '';
  }

  mapDbQuote(record) {
    return {
      id: record.id,
      categoryName: record.category_name || '',
      material: record.material_name,
      normalizedMaterial: this.normalizeText(record.material_name),
      unitPrice: Number(record.unit_price_ars),
      notes: record.notes || '',
      isActive: record.is_active !== false,
      source: 'database'
    };
  }

  getMercadoPagoAccessToken() {
    return (
      process.env.ACCESS_TOKEN_MP ||
      process.env.MP_ACCESS_TOKEN ||
      process.env.MERCADOPAGO_ACCESS_TOKEN ||
      ''
    ).trim();
  }

  getMercadoPagoAccessTokenForSeller(sellerId) {
    const normalizedSellerId = (sellerId || '').toString().trim();
    if (!normalizedSellerId) {
      return this.getMercadoPagoAccessToken();
    }

    const rawMap = (process.env.MP_ACCESS_TOKEN_BY_USER || '').trim();
    if (rawMap) {
      try {
        const parsedMap = JSON.parse(rawMap);
        if (parsedMap && typeof parsedMap === 'object') {
          const sellerToken = (parsedMap[normalizedSellerId] || '').toString().trim();
          if (sellerToken) {
            return sellerToken;
          }
        }
      } catch {
        // ignore invalid JSON map and fallback to global token
      }
    }

    return this.getMercadoPagoAccessToken();
  }

  getMercadoPagoClient(sellerId) {
    const token = this.getMercadoPagoAccessTokenForSeller(sellerId);

    if (!token) {
      return null;
    }

    if (this.mpClient && this.mpToken === token) {
      return this.mpClient;
    }

    this.mpClient = new MercadoPagoConfig({ accessToken: token });
    this.mpToken = token;
    return this.mpClient;
  }

  async getMercadoPagoPaymentStatus({ preferenceId, externalReference, sellerId }) {
    const token = this.getMercadoPagoAccessTokenForSeller(sellerId);
    if (!token) {
      return {
        success: false,
        message: 'Mercado Pago no está configurado. Definí ACCESS_TOKEN_MP en backend/.env'
      };
    }

    if (!preferenceId && !externalReference) {
      return {
        success: false,
        message: 'Se requiere preferenceId o externalReference para consultar el pago'
      };
    }

    const params = new URLSearchParams({
      sort: 'date_created',
      criteria: 'desc',
      limit: '1'
    });

    if (preferenceId) params.set('preference_id', preferenceId);
    if (externalReference) params.set('external_reference', externalReference);

    try {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/search?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Error consultando pago en Mercado Pago (${response.status})`,
          details: errorText
        };
      }

      const payload = await response.json();
      const payment = Array.isArray(payload?.results) && payload.results.length > 0
        ? payload.results[0]
        : null;

      if (!payment) {
        return {
          success: true,
          data: {
            found: false,
            status: 'pending',
            statusDetail: 'Aún no se registró un pago para este link',
            approved: false
          }
        };
      }

      return {
        success: true,
        data: {
          found: true,
          status: payment.status || 'unknown',
          statusDetail: payment.status_detail || '',
          approved: payment.status === 'approved',
          paymentId: payment.id || null,
          amount: payment.transaction_amount || null,
          currency: payment.currency_id || 'ARS',
          dateApproved: payment.date_approved || null,
          dateCreated: payment.date_created || null
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error?.message || 'No se pudo consultar el estado del pago en Mercado Pago'
      };
    }
  }

  async createMercadoPagoPreference({ material, quantity, total, sellerId }) {
    const client = this.getMercadoPagoClient(sellerId);
    if (!client) {
      return {
        success: false,
        message: 'Mercado Pago no está configurado. Definí MP_ACCESS_TOKEN en backend/.env'
      };
    }

    const preference = new Preference(client);
    const externalReference = `renovared-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const notificationUrl = (process.env.MP_WEBHOOK_URL || '').trim();

    const body = {
      external_reference: externalReference,
      statement_descriptor: 'RENOVARED',
      items: [
        {
          title: `Intercambio de ${material}`,
          description: `${quantity} kg`,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: Number(total)
        }
      ],
      metadata: {
        material,
        quantityKg: quantity
      }
    };

    if (notificationUrl) {
      body.notification_url = notificationUrl;
    }

    try {
      const response = await preference.create({ body });
      const initPoint = response?.init_point || response?.sandbox_init_point;

      if (!initPoint) {
        return {
          success: false,
          message: 'Mercado Pago no devolvió una URL de pago para generar el QR dinámico'
        };
      }

      return {
        success: true,
        data: {
          preferenceId: response.id,
          initPoint,
          sandboxInitPoint: response?.sandbox_init_point || null,
          qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(initPoint)}`,
          externalReference
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error?.message || 'No se pudo crear la preferencia en Mercado Pago'
      };
    }
  }

  normalizeText(value = '') {
    return value
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  parsePrice(rawPrice) {
    if (!rawPrice) return null;

    const matches = Array.from(rawPrice.matchAll(/\$\s*([0-9][0-9.,]*)/g));
    if (matches.length === 0) return null;

    const numericValues = matches
      .map((match) => {
        const rawNumber = (match[1] || '').trim();
        if (!rawNumber) return NaN;

        // Si tiene coma y no punto, asumimos:
        // - "3,850" => separador de miles
        // - "18,20" => decimal
        if (rawNumber.includes(',') && !rawNumber.includes('.')) {
          const commaParts = rawNumber.split(',');
          if (commaParts.length === 2 && commaParts[1].length === 3) {
            return parseFloat(commaParts.join(''));
          }
          return parseFloat(rawNumber.replace(',', '.'));
        }

        return parseFloat(rawNumber.replace(/,/g, ''));
      })
      .filter((value) => Number.isFinite(value));

    if (numericValues.length === 0) return null;
    return Math.max(...numericValues);
  }

  parseFileContent(content) {
    const quotesMap = new Map();
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.includes('$')) continue;

      let columns = [];

      if (trimmed.includes('\t')) {
        columns = trimmed.split('\t').map((col) => col.trim()).filter(Boolean);
      } else if (trimmed.includes('|')) {
        columns = trimmed.split('|').map((col) => col.trim()).filter(Boolean);
      } else {
        const match = trimmed.match(/^(.+?)\s+(\$.*)$/);
        if (match) {
          columns = [match[1].trim(), match[2].trim()];
        }
      }

      if (columns.length < 2) continue;

      const material = columns.length >= 3 ? columns[1] : columns[0];
      const priceColumn = columns.length >= 3 ? columns[2] : columns[1];
      const unitPrice = this.parsePrice(priceColumn);

      if (!material || !Number.isFinite(unitPrice)) continue;

      const normalizedMaterial = this.normalizeText(material);
      const existing = quotesMap.get(normalizedMaterial);

      if (!existing || unitPrice > existing.unitPrice) {
        quotesMap.set(normalizedMaterial, {
          material,
          normalizedMaterial,
          unitPrice
        });
      }
    }

    return Array.from(quotesMap.values());
  }

  loadQuotesFromFile() {
    if (!fs.existsSync(QUOTE_FILE_PATH)) {
      throw new Error('No se encontró el archivo de cotizaciones de materiales');
    }

    const stats = fs.statSync(QUOTE_FILE_PATH);
    if (this.cache.mtimeMs === stats.mtimeMs && this.cache.quotes.length > 0) {
      return this.cache.quotes;
    }

    const content = fs.readFileSync(QUOTE_FILE_PATH, 'utf8');
    const quotes = this.parseFileContent(content);

    this.cache = {
      mtimeMs: stats.mtimeMs,
      quotes
    };

    return quotes;
  }

  getAllQuotes() {
    return this.loadQuotes();
  }

  findQuoteForMaterial(materialName = '') {
    const normalizedInput = this.normalizeText(materialName);
    if (!normalizedInput) return null;

    const quotes = this.loadQuotes();

    const exact = quotes.find((quote) => quote.normalizedMaterial === normalizedInput);
    if (exact) return exact;

    const partial = quotes.find((quote) =>
      normalizedInput.includes(quote.normalizedMaterial) || quote.normalizedMaterial.includes(normalizedInput)
    );

    if (partial) return partial;

    const tokens = normalizedInput.split(/[^a-z0-9]+/).filter(Boolean);
    if (tokens.length === 0) return null;

    const byToken = quotes.find((quote) =>
      tokens.some((token) => token.length > 2 && quote.normalizedMaterial.includes(token))
    );

    return byToken || null;
  }

  async calculateQuote(materialName, ksOrKg, options = {}) {
    const sellerId = options?.sellerId;
    const quantity = Number(ksOrKg);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return {
        success: false,
        message: 'La cantidad en ks/kg debe ser mayor a 0'
      };
    }

    const quote = this.findQuoteForMaterial(materialName);
    if (!quote) {
      return {
        success: false,
        message: 'No se encontró cotización para el material indicado'
      };
    }

    const total = Number((quote.unitPrice * quantity).toFixed(2));
    const paymentHolder = (process.env.PAYMENT_HOLDER || 'RenovaRed').trim();
    const receiver = {
      provider: 'Mercado Pago',
      titular: paymentHolder,
      alias: '',
      cvu: '',
      cbu: ''
    };
    const paymentIntent = {
      amountArs: total,
      currency: 'ARS',
      description: `Intercambio ${quantity} kg de ${quote.material}`,
      receiver,
      wallets: SUPPORTED_WALLETS.filter((wallet) => wallet.id === 'mercadopago')
    };

    const mpPreference = await this.createMercadoPagoPreference({
      material: quote.material,
      quantity,
      total,
      sellerId
    });

    let qrPayload, qrImageUrl, qrEsInteroperable, qrTipo, qrMensaje, mpPaymentData;

    if (mpPreference.success) {
      qrPayload = mpPreference.data.initPoint;
      qrImageUrl = mpPreference.data.qrImageUrl;
      qrEsInteroperable = true;
      qrTipo = 'mercadopago_dinamico';
      qrMensaje = 'QR dinámico de Mercado Pago. Escaneá con la app de Mercado Pago para pagar.';
      mpPaymentData = {
        provider: 'mercadopago',
        preferenceId: mpPreference.data.preferenceId,
        initPoint: mpPreference.data.initPoint,
        sandboxInitPoint: mpPreference.data.sandboxInitPoint,
        externalReference: mpPreference.data.externalReference,
        sellerId: sellerId || null
      };
    } else {
      // Fallback: QR informativo con los datos del pago
      qrPayload = `RENOVARED|ARS:${total}|${quote.material}|KG:${quantity}`;
      qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrPayload)}`;
      qrEsInteroperable = false;
      qrTipo = 'informativo';
      qrMensaje = `(Mercado Pago temporalmente no disponible) ${mpPreference.message}`;
      mpPaymentData = null;
    }

    return {
      success: true,
      data: {
        material: quote.material,
        inputMaterial: materialName,
        ks: quantity,
        precioUnitarioArs: quote.unitPrice,
        precioTotalArs: total,
        moneda: 'ARS',
        qrPayload,
        qrImageUrl,
        qrTipo,
        qrEsInteroperable,
        qrMensaje,
        paymentIntent,
        mpPayment: mpPaymentData,
        cotizacionFuente: 'frontend/cotizacionmateriales.md'
      }
    };
  }
}

MaterialQuoteService.prototype.loadQuotesFromDatabase = async function loadQuotesFromDatabase() {
  try {
    const rows = await MaterialQuote.findAll({
      where: { is_active: true },
      order: [['material_name', 'ASC']]
    });

    return rows.map((row) => this.mapDbQuote(row));
  } catch (error) {
    console.warn('MaterialQuoteService.loadQuotesFromDatabase fallback:', error.message);
    return [];
  }
};

MaterialQuoteService.prototype.loadQuotes = async function loadQuotes() {
  const databaseQuotes = await this.loadQuotesFromDatabase();
  if (databaseQuotes.length > 0) {
    return databaseQuotes;
  }

  if (typeof this.loadQuotesFromFile === 'function') {
    return this.loadQuotesFromFile();
  }

  return [];
};

MaterialQuoteService.prototype.getAllQuotes = async function getAllQuotes() {
  return this.loadQuotes();
};

MaterialQuoteService.prototype.getAdminQuotes = async function getAdminQuotes() {
  const rows = await MaterialQuote.findAll({
    order: [['material_name', 'ASC']]
  });

  return {
    status: 200,
    body: {
      success: true,
      data: rows
    }
  };
};

MaterialQuoteService.prototype.createQuote = async function createQuote(data) {
  const material_name = String(data.material_name || '').trim();
  const category_name = String(data.category_name || '').trim();
  const notes = String(data.notes || '').trim();
  const unit_price_ars = Number(data.unit_price_ars);
  const is_active = data.is_active !== false;

  if (!material_name) {
    return { status: 400, body: { success: false, message: 'material_name es obligatorio' } };
  }

  if (!Number.isFinite(unit_price_ars) || unit_price_ars <= 0) {
    return { status: 400, body: { success: false, message: 'unit_price_ars debe ser mayor a 0' } };
  }

  const existing = await MaterialQuote.findOne({ where: { material_name } });
  if (existing) {
    return { status: 409, body: { success: false, message: 'Ya existe una cotizacion para ese material' } };
  }

  const created = await MaterialQuote.create({
    material_name,
    category_name: category_name || null,
    unit_price_ars,
    notes: notes || null,
    is_active
  });

  return {
    status: 201,
    body: {
      success: true,
      message: 'Cotizacion creada correctamente',
      data: created
    }
  };
};

MaterialQuoteService.prototype.updateQuote = async function updateQuote(id, data) {
  const quote = await MaterialQuote.findByPk(id);
  if (!quote) {
    return { status: 404, body: { success: false, message: 'Cotizacion no encontrada' } };
  }

  const updates = {};

  if (data.material_name !== undefined) {
    const material_name = String(data.material_name || '').trim();
    if (!material_name) {
      return { status: 400, body: { success: false, message: 'material_name es obligatorio' } };
    }

    const existing = await MaterialQuote.findOne({ where: { material_name } });
    if (existing && existing.id !== id) {
      return { status: 409, body: { success: false, message: 'Ya existe una cotizacion para ese material' } };
    }

    updates.material_name = material_name;
  }

  if (data.category_name !== undefined) {
    const category_name = String(data.category_name || '').trim();
    updates.category_name = category_name || null;
  }

  if (data.notes !== undefined) {
    const notes = String(data.notes || '').trim();
    updates.notes = notes || null;
  }

  if (data.unit_price_ars !== undefined) {
    const unit_price_ars = Number(data.unit_price_ars);
    if (!Number.isFinite(unit_price_ars) || unit_price_ars <= 0) {
      return { status: 400, body: { success: false, message: 'unit_price_ars debe ser mayor a 0' } };
    }
    updates.unit_price_ars = unit_price_ars;
  }

  if (data.is_active !== undefined) {
    updates.is_active = Boolean(data.is_active);
  }

  await quote.update(updates);

  return {
    status: 200,
    body: {
      success: true,
      message: 'Cotizacion actualizada correctamente',
      data: quote
    }
  };
};

MaterialQuoteService.prototype.deleteQuote = async function deleteQuote(id) {
  const quote = await MaterialQuote.findByPk(id);
  if (!quote) {
    return { status: 404, body: { success: false, message: 'Cotizacion no encontrada' } };
  }

  await quote.destroy();

  return {
    status: 200,
    body: {
      success: true,
      message: 'Cotizacion eliminada correctamente'
    }
  };
};

MaterialQuoteService.prototype.findQuoteForMaterial = async function findQuoteForMaterial(materialName = '') {
  const normalizedInput = this.normalizeText(materialName);
  if (!normalizedInput) return null;

  const quotes = await this.loadQuotes();

  const exact = quotes.find((quote) => quote.normalizedMaterial === normalizedInput);
  if (exact) return exact;

  const partial = quotes.find((quote) =>
    normalizedInput.includes(quote.normalizedMaterial) || quote.normalizedMaterial.includes(normalizedInput)
  );

  if (partial) return partial;

  const tokens = normalizedInput.split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const byToken = quotes.find((quote) =>
    tokens.some((token) => token.length > 2 && quote.normalizedMaterial.includes(token))
  );

  return byToken || null;
};

MaterialQuoteService.prototype.calculateQuote = async function calculateQuote(materialName, ksOrKg, options = {}) {
  const sellerId = options?.sellerId;
  const quantity = Number(ksOrKg);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return {
      success: false,
      message: 'La cantidad en ks/kg debe ser mayor a 0'
    };
  }

  const quote = await this.findQuoteForMaterial(materialName);
  if (!quote) {
    return {
      success: false,
      message: 'No se encontró cotización para el material indicado'
    };
  }

  const total = Number((quote.unitPrice * quantity).toFixed(2));
  const paymentHolder = (process.env.PAYMENT_HOLDER || 'RenovaRed').trim();
  const receiver = {
    provider: 'Mercado Pago',
    titular: paymentHolder,
    alias: '',
    cvu: '',
    cbu: ''
  };
  const paymentIntent = {
    amountArs: total,
    currency: 'ARS',
    description: `Intercambio ${quantity} kg de ${quote.material}`,
    receiver,
    wallets: SUPPORTED_WALLETS.filter((wallet) => wallet.id === 'mercadopago')
  };

  const mpPreference = await this.createMercadoPagoPreference({
    material: quote.material,
    quantity,
    total,
    sellerId
  });

  let qrPayload;
  let qrImageUrl;
  let qrEsInteroperable;
  let qrTipo;
  let qrMensaje;
  let mpPaymentData;

  if (mpPreference.success) {
    qrPayload = mpPreference.data.initPoint;
    qrImageUrl = mpPreference.data.qrImageUrl;
    qrEsInteroperable = true;
    qrTipo = 'mercadopago_dinamico';
    qrMensaje = 'QR dinámico de Mercado Pago. Escaneá con la app de Mercado Pago para pagar.';
    mpPaymentData = {
      provider: 'mercadopago',
      preferenceId: mpPreference.data.preferenceId,
      initPoint: mpPreference.data.initPoint,
      sandboxInitPoint: mpPreference.data.sandboxInitPoint,
      externalReference: mpPreference.data.externalReference,
      sellerId: sellerId || null
    };
  } else {
    qrPayload = `RENOVARED|ARS:${total}|${quote.material}|KG:${quantity}`;
    qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrPayload)}`;
    qrEsInteroperable = false;
    qrTipo = 'informativo';
    qrMensaje = `(Mercado Pago temporalmente no disponible) ${mpPreference.message}`;
    mpPaymentData = null;
  }

  return {
    success: true,
    data: {
      material: quote.material,
      inputMaterial: materialName,
      ks: quantity,
      precioUnitarioArs: quote.unitPrice,
      precioTotalArs: total,
      moneda: 'ARS',
      qrPayload,
      qrImageUrl,
      qrTipo,
      qrEsInteroperable,
      qrMensaje,
      paymentIntent,
      mpPayment: mpPaymentData,
      cotizacionFuente: quote.source === 'database' ? 'database/material_quotes' : 'frontend/cotizacionmateriales.md'
    }
  };
};

module.exports = new MaterialQuoteService();
