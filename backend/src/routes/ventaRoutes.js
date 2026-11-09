const express = require('express');
const controller = require('../controllers/finanzasController');
const asyncHandler = require('../middlewares/async-handler');
const { validateSale } = require('../middlewares/validate');

const router = express.Router();

router.post('/', validateSale, asyncHandler(controller.create));
router.get('/', asyncHandler(controller.list));

module.exports = router;
