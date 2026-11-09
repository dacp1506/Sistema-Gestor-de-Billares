const express = require('express');
const controller = require('../controllers/sucursalController');
const asyncHandler = require('../middlewares/async-handler');
const { validateId, validateBranch } = require('../middlewares/validate');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', validateBranch, asyncHandler(controller.create));
router.get('/:id', validateId, asyncHandler(controller.get));
router.put('/:id', validateId, validateBranch, asyncHandler(controller.update));
router.delete('/:id', validateId, asyncHandler(controller.deactivate));

module.exports = router;
