const express = require('express');
const profileController = require('../controllers/profile.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { uploadResume } = require('../middleware/upload.middleware');
const validate = require('../middleware/validate.middleware');
const {
  upsertProfileValidator,
  userIdParamValidator,
} = require('../validators/profile.validator');

const router = express.Router();

// Job seeker own profile & resume upload
router.get('/me', protect, authorize('job_seeker'), profileController.getMyProfile);
router.put(
  '/me',
  protect,
  authorize('job_seeker'),
  upsertProfileValidator,
  validate,
  profileController.upsertMyProfile
);
router.post(
  '/me/resume',
  protect,
  authorize('job_seeker'),
  uploadResume.single('resume'),
  profileController.uploadMyResume
);

// Employer & Admin candidate directory search
router.get(
  '/',
  protect,
  authorize('employer', 'admin'),
  profileController.searchCandidates
);

// View specific candidate profile (self, employer, or admin)
router.get(
  '/:userId',
  protect,
  userIdParamValidator,
  validate,
  profileController.getProfileByUserId
);

module.exports = router;
