const { body, param, query } = require('express-validator');
const { APPLICATION_STATUSES } = require('../models/Application');

const EMPLOYER_UPDATABLE_STATUSES = ['Review', 'Interview', 'Offer', 'Rejected'];

const urlOrLocalResume = (value) => {
  if (!value) return true;
  if (value.startsWith('/uploads/resumes/')) return true;
  return /^https?:\/\/.+/.test(value);
};

const applyToJobValidator = [
  param('jobId').isMongoId().withMessage('Invalid job ID format'),
  body('resumeUrl')
    .optional({ checkFalsy: true })
    .custom(urlOrLocalResume)
    .withMessage('resumeUrl must be a valid http(s) URL or uploaded resume path'),
  body('coverLetter')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 3000 })
    .withMessage('Cover letter cannot exceed 3000 characters'),
];

const applicationIdParamValidator = [
  param('id').isMongoId().withMessage('Invalid application ID format'),
];

const updateApplicationStatusValidator = [
  param('id').isMongoId().withMessage('Invalid application ID format'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(EMPLOYER_UPDATABLE_STATUSES)
    .withMessage(`Status must be one of: ${EMPLOYER_UPDATABLE_STATUSES.join(', ')}`),
  body('note')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Status note cannot exceed 500 characters'),
  body('employerNotes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Employer notes cannot exceed 2000 characters'),
  body('interviewDate')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('Interview date must be a valid ISO 8601 date'),
];

const listApplicationsQueryValidator = [
  query('status')
    .optional()
    .isIn(APPLICATION_STATUSES)
    .withMessage(`Status filter must be one of: ${APPLICATION_STATUSES.join(', ')}`),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

module.exports = {
  applyToJobValidator,
  applicationIdParamValidator,
  updateApplicationStatusValidator,
  listApplicationsQueryValidator,
};
