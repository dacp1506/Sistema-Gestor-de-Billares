const express = require('express');
const controller = require('../controllers/sesionController');
const asyncHandler = require('../middlewares/async-handler');
const { validateId, validateStartSession } = require('../middlewares/validate');

const router = express.Router();

router.get('/activas', asyncHandler(controller.listActive));
router.get('/', asyncHandler(controller.list));
router.post('/', validateStartSession, asyncHandler(controller.start));
router.get('/:id', validateId, asyncHandler(controller.get));
router.patch('/:id/pausar', validateId, asyncHandler(controller.pause));
router.patch('/:id/reanudar', validateId, asyncHandler(controller.resume));
router.patch('/:id/finalizar', validateId, asyncHandler(controller.finish));

module.exports = router;
