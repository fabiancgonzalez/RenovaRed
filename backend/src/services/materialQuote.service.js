const fs = require('fs');
const path = require('path');
const { MercadoPagoConfig, Preference } = require('mercadopago');

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

  getMercadoPagoAccessToken() {
    return (
      process.env.ACCESS_TOKEN_MP ||
      process.env.MP_ACCESS_TOKEN ||
      process.env.MERCADOPAGO_ACCESS_TOKEN ||
      ''
    ).trim();
  }

  getMercadoPagoClient() {
    const token = this.getMercadoPagoAccessToken();

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

  async getMercadoPagoPaymentStatus({ preferenceId, externalReference }) {
    const token = this.getMercadoPagoAccessToken();
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

  async createMercadoPagoPreference({ material, quantity, total }) {
    const client = this.getMercadoPagoClient();
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

    const matches = rawPrice.match(/\$\s*([0-9]+(?:[\.,][0-9]+)?)/g);
    if (!matches || matches.length === 0) return null;

    const numericValues = matches
      .map((value) => value.replace(/\$/g, '').replace(',', '.').trim())
      .map((value) => parseFloat(value))
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

      const columns = trimmed.split('\t').map((col) => col.trim()).filter(Boolean);
      if (columns.length < 2) continue;

      const material = columns[0];
      const priceColumn = columns[2] || columns[1];
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

  loadQuotes() {
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

  async calculateQuote(materialName, ksOrKg) {
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
      total
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
        externalReference: mpPreference.data.externalReference
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

module.exports = new MaterialQuoteService();
