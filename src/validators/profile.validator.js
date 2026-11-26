const { body, param } = require('express-validator');

const urlOrLocalResume = (value) => {
  if (!value) return true;
  if (value.startsWith('/uploads/resumes/')) return true;
  return /^https?:\/\/.+/.test(value);
};

const upsertProfileValidator = [
  body('headline')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 160 })
    .withMessage('Headline cannot exceed 160 characters'),
  body('bio')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Bio cannot exceed 2000 characters'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array of strings'),
  body('skills.*')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Each skill must be a non-empty string'),
  body('resumeUrl')
    .optional({ checkFalsy: true })
    .custom(urlOrLocalResume)
    .withMessage('Resume URL must be a valid http(s) URL or uploaded resume path'),
  body('phone')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Phone cannot exceed 30 characters'),
  body('location')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Location cannot exceed 120 characters'),
  body('experienceYears')
    .optional()
    .isFloat({ min: 0, max: 60 })
    .withMessage('Experience years must be between 0 and 60'),
  body('expectedSalary')
    .optional({ values: 'null' })
    .isFloat({ min: 0 })
    .withMessage('Expected salary must be a positive number'),
  body('portfolioUrl')
    .optional({ checkFalsy: true })
    .isURL({ require_protocol: true })
    .withMessage('Portfolio URL must include http:// or https://'),
  body('linkedinUrl')
    .optional({ checkFalsy: true })
    .isURL({ require_protocol: true })
    .withMessage('LinkedIn URL must include http:// or https://'),
  body('githubUrl')
    .optional({ checkFalsy: true })
    .isURL({ require_protocol: true })
    .withMessage('GitHub URL must include http:// or https://'),
  body('education')
    .optional()
    .isArray()
    .withMessage('Education must be an array'),
  body('education.*.institution')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Education institution is required'),
  body('education.*.degree')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Education degree is required'),
  body('education.*.startYear')
    .optional()
    .isInt({ min: 1950, max: 2100 })
    .withMessage('Education start year must be valid'),
  body('experience')
    .optional()
    .isArray()
    .withMessage('Experience must be an array'),
  body('experience.*.company')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Experience company is required'),
  body('experience.*.title')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Experience title is required'),
  body('experience.*.startDate')
    .optional()
    .isISO8601()
    .withMessage('Experience start date must be a valid ISO date'),
  body('isOpenToWork')
    .optional()
    .isBoolean()
    .withMessage('isOpenToWork must be a boolean'),
];

const userIdParamValidator = [
  param('userId').isMongoId().withMessage('Invalid user ID format'),
];

module.exports = {
  upsertProfileValidator,
  userIdParamValidator,
};
