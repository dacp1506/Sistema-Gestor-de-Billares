const express = require('express');
const controller = require('../controllers/productoController');
const asyncHandler = require('../middlewares/async-handler');
const { validateId, validateProduct } = require('../middlewares/validate');
const { requireBranchAccess, requireResourceBranch, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.use(requireBranchAccess);
router.get('/', asyncHandler(controller.list));
router.post('/', requireRole('admin_general', 'admin_sucursal'), validateProduct, asyncHandler(controller.create));
router.get('/:id', validateId, requireResourceBranch('producto'), asyncHandler(controller.get));
router.put('/:id', requireRole('admin_general', 'admin_sucursal'), validateId, requireResourceBranch('producto'), validateProduct, asyncHandler(controller.update));
router.delete('/:id', requireRole('admin_general', 'admin_sucursal'), validateId, requireResourceBranch('producto'), asyncHandler(controller.deactivate));

module.exports = router;
