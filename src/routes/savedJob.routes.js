const express = require('express');
const { param } = require('express-validator');
const savedJobController = require('../controllers/savedJob.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

const router = express.Router();

const jobIdValidator = [param('jobId').isMongoId().withMessage('Invalid job ID format')];

router.use(protect, authorize('job_seeker'));

router.get('/', savedJobController.getSavedJobs);
router.post('/:jobId', jobIdValidator, validate, savedJobController.saveJob);
router.delete('/:jobId', jobIdValidator, validate, savedJobController.unsaveJob);

module.exports = router;
