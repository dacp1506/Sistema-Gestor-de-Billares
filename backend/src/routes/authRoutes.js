const express = require('express');
const controller = require('../controllers/authController');
const asyncHandler = require('../middlewares/async-handler');
const { validateLogin } = require('../middlewares/validate');

const router = express.Router();

router.post('/login', validateLogin, asyncHandler(controller.login));

module.exports = router;
