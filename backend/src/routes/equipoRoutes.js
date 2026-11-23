const express = require('express');
const controller = require('../controllers/equipoController');
const asyncHandler = require('../middlewares/async-handler');
const { requireBranchAccess } = require('../middlewares/auth');

const router = express.Router();

router.use(requireBranchAccess);
router.get('/', asyncHandler(controller.list));

module.exports = router;
