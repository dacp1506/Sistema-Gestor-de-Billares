const express = require('express');
const controller = require('../controllers/sesionController');
const asyncHandler = require('../middlewares/async-handler');
const { validateId, validateStartSession } = require('../middlewares/validate');
const { requireBranchAccess, requireResourceBranch, requireTableBranchFromBody } = require('../middlewares/auth');

const router = express.Router();

router.use(requireBranchAccess);
router.get('/activas', asyncHandler(controller.listActive));
router.get('/', asyncHandler(controller.list));
router.post('/', requireTableBranchFromBody, validateStartSession, asyncHandler(controller.start));
router.get('/:id', validateId, requireResourceBranch('sesion'), asyncHandler(controller.get));
router.patch('/:id/pausar', validateId, requireResourceBranch('sesion'), asyncHandler(controller.pause));
router.patch('/:id/reanudar', validateId, requireResourceBranch('sesion'), asyncHandler(controller.resume));
router.patch('/:id/finalizar', validateId, requireResourceBranch('sesion'), asyncHandler(controller.finish));

module.exports = router;
