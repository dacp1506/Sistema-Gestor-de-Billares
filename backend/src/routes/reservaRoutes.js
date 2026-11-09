const express = require('express');
const controller = require('../controllers/reservaController');
const asyncHandler = require('../middlewares/async-handler');
const { validateId, validateReservation, validateReservationStatus } = require('../middlewares/validate');
const { requireBranchAccess, requireResourceBranch, requireTableBranchFromBody } = require('../middlewares/auth');

const router = express.Router();

router.use(requireBranchAccess);
router.get('/', asyncHandler(controller.list));
router.get('/:id', validateId, requireResourceBranch('reserva'), asyncHandler(controller.get));
router.post('/', requireTableBranchFromBody, validateReservation, asyncHandler(controller.create));
router.patch('/:id/estado', validateId, requireResourceBranch('reserva'), validateReservationStatus, asyncHandler(controller.updateStatus));

module.exports = router;
