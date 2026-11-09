const express = require('express');
const controller = require('../controllers/sucursalController');
const asyncHandler = require('../middlewares/async-handler');
const { validateId, validateBranch } = require('../middlewares/validate');
const { requireRole, requireResourceBranch } = require('../middlewares/auth');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.get('/:id', validateId, requireResourceBranch('sucursal'), asyncHandler(controller.get));
router.post('/', requireRole('admin_general'), validateBranch, asyncHandler(controller.create));
router.put('/:id', requireRole('admin_general'), validateId, validateBranch, asyncHandler(controller.update));
router.delete('/:id', requireRole('admin_general'), validateId, asyncHandler(controller.deactivate));

module.exports = router;
