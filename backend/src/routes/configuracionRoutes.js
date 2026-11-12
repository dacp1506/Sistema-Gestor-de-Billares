const express = require('express');
const controller = require('../controllers/configuracionController');
const asyncHandler = require('../middlewares/async-handler');
const { validateSettings } = require('../middlewares/validate');

const router = express.Router();

router.get('/', asyncHandler(controller.get));
router.put('/', validateSettings, asyncHandler(controller.update));

module.exports = router;
