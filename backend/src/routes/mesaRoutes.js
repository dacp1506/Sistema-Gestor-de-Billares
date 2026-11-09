const express = require('express');
const controller = require('../controllers/mesaController');
const asyncHandler = require('../middlewares/async-handler');
const { validateId, validateTable } = require('../middlewares/validate');
const { requireBranchAccess, requireResourceBranch, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.use(requireBranchAccess);
router.get('/sucursal/:id_sucursal', asyncHandler(controller.listByBranch));
router.get('/', asyncHandler(controller.listByBranch));
router.post('/', requireRole('admin_general', 'admin_sucursal'), validateTable, asyncHandler(controller.create));
router.get('/:id', validateId, requireResourceBranch('mesa'), asyncHandler(controller.get));
router.put('/:id', requireRole('admin_general', 'admin_sucursal'), validateId, requireResourceBranch('mesa'), validateTable, asyncHandler(controller.update));
router.delete('/:id', requireRole('admin_general', 'admin_sucursal'), validateId, requireResourceBranch('mesa'), asyncHandler(controller.deactivate));

module.exports = router;
