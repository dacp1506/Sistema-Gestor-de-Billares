const express = require('express');
const controller = require('../controllers/reportController');
const asyncHandler = require('../middlewares/async-handler');
const { requireBranchAccess, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.use(requireBranchAccess, requireRole('admin_general', 'admin_sucursal'));
router.get('/', asyncHandler(controller.get));

module.exports = router;
