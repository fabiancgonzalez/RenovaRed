const materialQuoteService = require('../services/materialQuote.service');

exports.getAll = async (req, res) => {
  try {
    const result = await materialQuoteService.getAdminQuotes();
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('MaterialQuoteController.getAll:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener cotizaciones', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await materialQuoteService.createQuote(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('MaterialQuoteController.create:', error);
    return res.status(500).json({ success: false, message: 'Error al crear cotizacion', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const result = await materialQuoteService.updateQuote(req.params.id, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('MaterialQuoteController.update:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar cotizacion', error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const result = await materialQuoteService.deleteQuote(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('MaterialQuoteController.delete:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar cotizacion', error: error.message });
  }
};
