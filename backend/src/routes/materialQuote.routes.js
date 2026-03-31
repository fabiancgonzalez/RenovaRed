const express = require('express');
const router = express.Router();
const materialQuoteController = require('../controllers/materialQuote.controller');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');

router.use(authMiddleware, authorize('Admin'));

router.get('/', materialQuoteController.getAll);
router.post('/', materialQuoteController.create);
router.put('/:id', materialQuoteController.update);
router.delete('/:id', materialQuoteController.delete);

module.exports = router;
