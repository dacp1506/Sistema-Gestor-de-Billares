const express = require('express');
const controller = require('../controllers/cajaController');
const asyncHandler = require('../middlewares/async-handler');
const { validateId, validateCashOpen, validateCashClose } = require('../middlewares/validate');
const { requireBranchAccess, requireResourceBranch } = require('../middlewares/auth');

const router = express.Router();

router.use(requireBranchAccess);
router.get('/', asyncHandler(controller.list));
router.post('/apertura', validateCashOpen, asyncHandler(controller.open));
router.patch('/:id/cerrar', validateId, requireResourceBranch('caja'), validateCashClose, asyncHandler(controller.close));

module.exports = router;
