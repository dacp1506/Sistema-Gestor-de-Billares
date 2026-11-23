const express = require('express');
const controller = require('../controllers/solicitudController');
const asyncHandler = require('../middlewares/async-handler');
const {
  validateId,
  validateSolicitudCreate,
  validateSolicitudUpdate,
  validateSolicitudStatus
} = require('../middlewares/validate');
const { requireBranchAccess, requireResourceBranch, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.use(requireBranchAccess);
router.get('/', asyncHandler(controller.list));
router.post('/', validateSolicitudCreate, asyncHandler(controller.create));
router.get('/:id', validateId, requireResourceBranch('solicitud'), asyncHandler(controller.get));
router.put(
  '/:id',
  requireRole('admin_general', 'admin_sucursal'),
  validateId,
  requireResourceBranch('solicitud'),
  validateSolicitudUpdate,
  asyncHandler(controller.update)
);
router.patch(
  '/:id/estado',
  requireRole('admin_general', 'admin_sucursal'),
  validateId,
  requireResourceBranch('solicitud'),
  validateSolicitudStatus,
  asyncHandler(controller.changeState)
);
router.delete(
  '/:id',
  requireRole('admin_general', 'admin_sucursal'),
  validateId,
  requireResourceBranch('solicitud'),
  asyncHandler(controller.logicalDelete)
);

module.exports = router;
