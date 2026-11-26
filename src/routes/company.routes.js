const express = require('express');
const companyController = require('../controllers/company.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  upsertCompanyValidator,
  companyIdParamValidator,
} = require('../validators/company.validator');

const router = express.Router();

// Employer own company profile endpoints (must come before /:id)
router.get('/me', protect, authorize('employer'), companyController.getMyCompany);
router.put(
  '/me',
  protect,
  authorize('employer'),
  upsertCompanyValidator,
  validate,
  companyController.upsertMyCompany
);

// Public company browsing endpoints
router.get('/', companyController.listCompanies);
router.get('/:id', companyIdParamValidator, validate, companyController.getCompanyById);

module.exports = router;
