const { body, param, query } = require('express-validator');
const {
  JOB_TYPES,
  WORK_MODES,
  EXPERIENCE_LEVELS,
  JOB_STATUSES,
} = require('../models/Job');

const createJobValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Job title is required')
    .isLength({ min: 3, max: 150 })
    .withMessage('Job title must be between 3 and 150 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Job description is required')
    .isLength({ min: 20, max: 5000 })
    .withMessage('Job description must be between 20 and 5000 characters'),
  body('skills')
    .isArray({ min: 1 })
    .withMessage('Skills must be a non-empty array of strings'),
  body('skills.*')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Each skill must be a non-empty string'),
  body('requirements')
    .optional()
    .isArray()
    .withMessage('Requirements must be an array of strings'),
  body('responsibilities')
    .optional()
    .isArray()
    .withMessage('Responsibilities must be an array of strings'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ max: 120 })
    .withMessage('Location cannot exceed 120 characters'),
  body('type')
    .notEmpty()
    .withMessage('Job type is required')
    .isIn(JOB_TYPES)
    .withMessage(`Job type must be one of: ${JOB_TYPES.join(', ')}`),
  body('workMode')
    .optional()
    .isIn(WORK_MODES)
    .withMessage(`Work mode must be one of: ${WORK_MODES.join(', ')}`),
  body('experienceLevel')
    .optional()
    .isIn(EXPERIENCE_LEVELS)
    .withMessage(`Experience level must be one of: ${EXPERIENCE_LEVELS.join(', ')}`),
  body('salary.min')
    .notEmpty()
    .withMessage('Minimum salary is required')
    .isFloat({ min: 0 })
    .withMessage('Minimum salary must be >= 0'),
  body('salary.max')
    .notEmpty()
    .withMessage('Maximum salary is required')
    .isFloat({ min: 0 })
    .withMessage('Maximum salary must be >= 0')
    .custom((val, { req }) => {
      const min = Number(req.body.salary?.min);
      if (!Number.isNaN(min) && Number(val) < min) {
        throw new Error('Maximum salary must be greater than or equal to minimum salary');
      }
      return true;
    }),
  body('salary.currency')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 5 })
    .withMessage('Currency must be 2 to 5 characters (e.g., USD, EUR, PHP)'),
  body('status')
    .optional()
    .isIn(JOB_STATUSES)
    .withMessage(`Status must be one of: ${JOB_STATUSES.join(', ')}`),
  body('applicationDeadline')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('Application deadline must be a valid ISO 8601 date'),
];

const updateJobValidator = [
  param('id').isMongoId().withMessage('Invalid job ID format'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage('Job title must be between 3 and 150 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 5000 })
    .withMessage('Job description must be between 20 and 5000 characters'),
  body('skills')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Skills must be a non-empty array'),
  body('location')
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 120 }),
  body('type')
    .optional()
    .isIn(JOB_TYPES)
    .withMessage(`Job type must be one of: ${JOB_TYPES.join(', ')}`),
  body('workMode')
    .optional()
    .isIn(WORK_MODES)
    .withMessage(`Work mode must be one of: ${WORK_MODES.join(', ')}`),
  body('experienceLevel')
    .optional()
    .isIn(EXPERIENCE_LEVELS)
    .withMessage(`Experience level must be one of: ${EXPERIENCE_LEVELS.join(', ')}`),
  body('salary.min')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum salary must be >= 0'),
  body('salary.max')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum salary must be >= 0'),
  body('status')
    .optional()
    .isIn(JOB_STATUSES)
    .withMessage(`Status must be one of: ${JOB_STATUSES.join(', ')}`),
  body('applicationDeadline')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('Application deadline must be a valid ISO 8601 date'),
];

const jobIdParamValidator = [
  param('id').isMongoId().withMessage('Invalid job ID format'),
];

const searchJobsValidator = [
  query('type')
    .optional()
    .isIn(JOB_TYPES)
    .withMessage(`Job type must be one of: ${JOB_TYPES.join(', ')}`),
  query('workMode')
    .optional()
    .isIn(WORK_MODES)
    .withMessage(`Work mode must be one of: ${WORK_MODES.join(', ')}`),
  query('experienceLevel')
    .optional()
    .isIn(EXPERIENCE_LEVELS)
    .withMessage(`Experience level must be one of: ${EXPERIENCE_LEVELS.join(', ')}`),
  query('minSalary')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('minSalary must be a non-negative number'),
  query('maxSalary')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('maxSalary must be a non-negative number'),
  query('company')
    .optional()
    .isMongoId()
    .withMessage('company filter must be a valid MongoDB ID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
];

module.exports = {
  createJobValidator,
  updateJobValidator,
  jobIdParamValidator,
  searchJobsValidator,
};
