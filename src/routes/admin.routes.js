const express = require('express');
const adminController = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  updateUserValidator,
  verifyCompanyValidator,
} = require('../validators/admin.validator');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/stats', adminController.getDashboardStats);
router.get('/users', adminController.listUsers);
router.patch('/users/:id', updateUserValidator, validate, adminController.updateUser);
router.patch(
  '/companies/:id/verify',
  verifyCompanyValidator,
  validate,
  adminController.verifyCompany
);

module.exports = router;
