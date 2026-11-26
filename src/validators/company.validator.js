const { body, param } = require('express-validator');
const { COMPANY_SIZES } = require('../models/CompanyProfile');

const upsertCompanyValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ min: 2, max: 120 })
    .withMessage('Company name must be between 2 and 120 characters'),
  body('industry')
    .trim()
    .notEmpty()
    .withMessage('Industry is required')
    .isLength({ max: 80 })
    .withMessage('Industry cannot exceed 80 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Company description is required')
    .isLength({ max: 2500 })
    .withMessage('Description cannot exceed 2500 characters'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Company location is required')
    .isLength({ max: 120 })
    .withMessage('Location cannot exceed 120 characters'),
  body('website')
    .optional({ checkFalsy: true })
    .isURL({ require_protocol: true })
    .withMessage('Website must be a valid URL including http:// or https://'),
  body('logoUrl')
    .optional({ checkFalsy: true })
    .isURL({ require_protocol: true })
    .withMessage('Logo URL must be a valid URL including http:// or https://'),
  body('size')
    .optional()
    .isIn(COMPANY_SIZES)
    .withMessage(`Company size must be one of: ${COMPANY_SIZES.join(', ')}`),
  body('foundedYear')
    .optional({ values: 'null' })
    .isInt({ min: 1800, max: new Date().getFullYear() + 1 })
    .withMessage('Founded year must be a valid year'),
  body('contactEmail')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Contact email must be valid')
    .normalizeEmail(),
];

const companyIdParamValidator = [
  param('id').isMongoId().withMessage('Invalid company ID format'),
];

module.exports = {
  upsertCompanyValidator,
  companyIdParamValidator,
};
