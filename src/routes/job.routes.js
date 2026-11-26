const express = require('express');
const jobController = require('../controllers/job.controller');
const applicationController = require('../controllers/application.controller');
const { protect, optionalAuth, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createJobValidator,
  updateJobValidator,
  jobIdParamValidator,
  searchJobsValidator,
} = require('../validators/job.validator');
const {
  applyToJobValidator,
  listApplicationsQueryValidator,
} = require('../validators/application.validator');
const { param } = require('express-validator');

const router = express.Router();

// Employer's own posted jobs (must come before /:id)
router.get('/my-jobs', protect, authorize('employer'), jobController.getMyJobs);

// Public search & filter jobs
router.get('/', optionalAuth, searchJobsValidator, validate, jobController.listJobs);

// Employer/Admin create job
router.post(
  '/',
  protect,
  authorize('employer', 'admin'),
  createJobValidator,
  validate,
  jobController.createJob
);

// Nested application routes for a specific job
router.post(
  '/:jobId/applications',
  protect,
  authorize('job_seeker'),
  applyToJobValidator,
  validate,
  applicationController.applyToJob
);

router.get(
  '/:jobId/applications',
  protect,
  authorize('employer', 'admin'),
  [param('jobId').isMongoId().withMessage('Invalid job ID format')],
  listApplicationsQueryValidator,
  validate,
  applicationController.getJobApplicants
);

// Single job read/update/delete
router.get('/:id', optionalAuth, jobIdParamValidator, validate, jobController.getJobById);

router.patch(
  '/:id',
  protect,
  authorize('employer', 'admin'),
  updateJobValidator,
  validate,
  jobController.updateJob
);

router.delete(
  '/:id',
  protect,
  authorize('employer', 'admin'),
  jobIdParamValidator,
  validate,
  jobController.deleteJob
);

module.exports = router;
