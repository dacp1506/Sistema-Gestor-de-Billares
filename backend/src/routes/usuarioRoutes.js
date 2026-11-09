const express = require('express');
const controller = require('../controllers/usuarioController');
const asyncHandler = require('../middlewares/async-handler');
const { validateId, validateUser } = require('../middlewares/validate');
const { requireRole } = require('../middlewares/auth');

const router = express.Router();

router.use(requireRole('admin_general'));
router.get('/', asyncHandler(controller.list));
router.post('/', validateUser, asyncHandler(controller.create));
router.get('/:id', validateId, asyncHandler(controller.get));
router.put('/:id', validateId, validateUser, asyncHandler(controller.update));
router.delete('/:id', validateId, asyncHandler(controller.deactivate));

module.exports = router;
