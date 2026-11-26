const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const validate = require('../middleware/validate.middleware');
const {
  registerValidator,
  loginValidator,
  updatePasswordValidator,
} = require('../validators/auth.validator');

const router = express.Router();

router.post('/register', authLimiter, registerValidator, validate, authController.register);
router.post('/login', authLimiter, loginValidator, validate, authController.login);
router.get('/me', protect, authController.getMe);
router.patch(
  '/password',
  protect,
  updatePasswordValidator,
  validate,
  authController.updatePassword
);

module.exports = router;
