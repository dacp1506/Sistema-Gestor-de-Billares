const express = require('express');
const controller = require('../controllers/mesaController');
const asyncHandler = require('../middlewares/async-handler');
const { validateId, validateTable } = require('../middlewares/validate');

const router = express.Router();

router.get('/sucursal/:id_sucursal', validateId, asyncHandler(controller.listByBranch));
router.get('/', asyncHandler(controller.listByBranch));
router.post('/', validateTable, asyncHandler(controller.create));
router.get('/:id', validateId, asyncHandler(controller.get));
router.put('/:id', validateId, validateTable, asyncHandler(controller.update));
router.delete('/:id', validateId, asyncHandler(controller.deactivate));

module.exports = router;
