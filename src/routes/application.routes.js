const express = require('express');
const applicationController = require('../controllers/application.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  applicationIdParamValidator,
  updateApplicationStatusValidator,
  listApplicationsQueryValidator,
} = require('../validators/application.validator');

const router = express.Router();

// Job seeker views their own applications
router.get(
  '/me',
  protect,
  authorize('job_seeker'),
  listApplicationsQueryValidator,
  validate,
  applicationController.getMyApplications
);

// Employer views all applications across all their posted jobs
router.get(
  '/employer',
  protect,
  authorize('employer'),
  listApplicationsQueryValidator,
  validate,
  applicationController.getEmployerApplications
);

// Single application view (applicant, owning employer, or admin)
router.get(
  '/:id',
  protect,
  applicationIdParamValidator,
  validate,
  applicationController.getApplicationById
);

// Employer or Admin updates application status (Applied -> Review -> Interview -> Offer/Rejected)
router.patch(
  '/:id/status',
  protect,
  authorize('employer', 'admin'),
  updateApplicationStatusValidator,
  validate,
  applicationController.updateApplicationStatus
);

// Job seeker withdraws their own application
router.patch(
  '/:id/withdraw',
  protect,
  authorize('job_seeker'),
  applicationIdParamValidator,
  validate,
  applicationController.withdrawApplication
);

module.exports = router;
