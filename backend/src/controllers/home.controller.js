const homeService = require('../services/home.service');

exports.getHomeData = async (req, res) => {
  try {
    const homeData = await homeService.getHomeData();
    
    res.json({
      success: true,
      data: homeData
    });
  } catch (error) {
    console.error('Error en home:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos del home',
      error: error.message
    });
  }
};