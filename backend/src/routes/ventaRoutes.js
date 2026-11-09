const express = require('express');
const controller = require('../controllers/finanzasController');
const asyncHandler = require('../middlewares/async-handler');
const { validateSale } = require('../middlewares/validate');
const { requireBranchAccess } = require('../middlewares/auth');

const router = express.Router();

router.use(requireBranchAccess);
router.post('/', validateSale, asyncHandler(controller.create));
router.get('/', asyncHandler(controller.list));

module.exports = router;
