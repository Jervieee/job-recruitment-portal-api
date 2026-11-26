const { body, param } = require('express-validator');
const { ROLES } = require('../models/User');

const updateUserValidator = [
  param('id').isMongoId().withMessage('Invalid user ID format'),
  body('role')
    .optional()
    .isIn(ROLES)
    .withMessage(`Role must be one of: ${ROLES.join(', ')}`),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

const verifyCompanyValidator = [
  param('id').isMongoId().withMessage('Invalid company ID format'),
  body('isVerified')
    .isBoolean()
    .withMessage('isVerified must be a boolean'),
];

module.exports = {
  updateUserValidator,
  verifyCompanyValidator,
};
