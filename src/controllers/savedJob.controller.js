const SavedJob = require('../models/SavedJob');
const Job = require('../models/Job');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const saveJob = asyncHandler(async (req, res, next) => {
  const { jobId } = req.params;

  const job = await Job.findById(jobId);
  if (!job || job.status === 'draft') {
    return next(new AppError('Job posting not found.', 404));
  }

  const existing = await SavedJob.findOne({ user: req.user._id, job: jobId });
  if (existing) {
    return next(new AppError('Job is already in your saved list.', 409));
  }

  const savedJob = await SavedJob.create({ user: req.user._id, job: jobId });

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Job saved successfully',
    data: { savedJob },
  });
});

const unsaveJob = asyncHandler(async (req, res, next) => {
  const { jobId } = req.params;
  const deleted = await SavedJob.findOneAndDelete({
    user: req.user._id,
    job: jobId,
  });

  if (!deleted) {
    return next(new AppError('Saved job entry not found.', 404));
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Job removed from saved list',
  });
});

const getSavedJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 10, 50);

  const [savedJobs, total] = await Promise.all([
    SavedJob.find({ user: req.user._id })
      .populate({
        path: 'job',
        populate: {
          path: 'company',
          select: 'name location logoUrl isVerified',
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    SavedJob.countDocuments({ user: req.user._id }),
  ]);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Saved jobs fetched successfully',
    data: { savedJobs },
    meta: buildPaginationMeta({ page, limit, total }),
  });
});

module.exports = {
  saveJob,
  unsaveJob,
  getSavedJobs,
};
