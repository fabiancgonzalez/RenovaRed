const express = require('express');
const router = express.Router();
const homeController = require('../controllers/home.controller');

// Ruta GET para el home
router.get('/', homeController.getHomeData);

module.exports = router;