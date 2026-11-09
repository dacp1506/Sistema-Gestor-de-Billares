const express = require('express');
const controller = require('../controllers/productoController');
const asyncHandler = require('../middlewares/async-handler');
const { validateId, validateProduct } = require('../middlewares/validate');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', validateProduct, asyncHandler(controller.create));
router.get('/:id', validateId, asyncHandler(controller.get));
router.put('/:id', validateId, validateProduct, asyncHandler(controller.update));
router.delete('/:id', validateId, asyncHandler(controller.deactivate));

module.exports = router;
