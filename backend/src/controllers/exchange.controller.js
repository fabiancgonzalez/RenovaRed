const exchangeService = require('../services/exchange.service');

exports.getAll = async (req, res) => {
  try {
    const result = await exchangeService.getAll(req.query);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('ExchangeController.getAll:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener intercambios', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await exchangeService.getById(req.params.id, req.user.id, req.user.tipo);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('ExchangeController.getById:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener intercambio', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await exchangeService.create(req.user.id, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('ExchangeController.create:', error);
    return res.status(500).json({ success: false, message: 'Error al crear intercambio', error: error.message });
  }
};

exports.updateEstado = async (req, res) => {
  try {
    const { estado } = req.body;
    const result = await exchangeService.updateEstado(req.params.id, req.user.id, req.user.tipo, estado);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('ExchangeController.updateEstado:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar estado', error: error.message });
  }
};

exports.getMyExchanges = async (req, res) => {
  try {
    const result = await exchangeService.getMyExchanges(req.user.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('ExchangeController.getMyExchanges:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener mis intercambios', error: error.message });
  }
};

exports.requestExchange = async (req, res) => {
  try {
    const result = await exchangeService.requestExchange(req.user.id, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('ExchangeController.requestExchange:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.respondToExchange = async (req, res) => {
  try {
    const { exchangeId, action } = req.params;
    const result = await exchangeService.respondToExchange(req.user.id, exchangeId, action);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('ExchangeController.respondToExchange:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExchangeStatus = async (req, res) => {
  try {
    const result = await exchangeService.getExchangeStatus(req.params.conversationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('ExchangeController.getExchangeStatus:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getQuote = async (req, res) => {
  try {
    const payload = { ...req.query, ...req.body };
    const result = await exchangeService.getQuote(req.user.id, payload);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('ExchangeController.getQuote:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPaymentStatus = async (req, res) => {
  try {
    const payload = { ...req.query, ...req.body };
    const result = await exchangeService.getPaymentStatus(payload);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('ExchangeController.getPaymentStatus:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
