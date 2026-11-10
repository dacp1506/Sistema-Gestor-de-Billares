const express = require('express');
const controller = require('../controllers/authController');
const asyncHandler = require('../middlewares/async-handler');
const { validateLogin, validateRegistration } = require('../middlewares/validate');

const router = express.Router();

router.post('/login', validateLogin, asyncHandler(controller.login));
router.post('/register', validateRegistration, asyncHandler(controller.register));

module.exports = router;
