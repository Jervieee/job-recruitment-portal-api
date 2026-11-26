const Application = require('../models/Application');
const { ALLOWED_STATUS_TRANSITIONS } = require('../models/Application');
const Job = require('../models/Job');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const sanitizeForSeeker = (applicationDoc) => {
  const obj = applicationDoc.toObject ? applicationDoc.toObject() : { ...applicationDoc };
  delete obj.employerNotes;
  return obj;
};

const applyToJob = asyncHandler(async (req, res, next) => {
  const { jobId } = req.params;

  const job = await Job.findById(jobId);
  if (!job) {
    return next(new AppError('Job posting not found.', 404));
  }

  if (job.status !== 'open') {
    return next(new AppError('This job posting is no longer accepting applications.', 400));
  }

  if (job.applicationDeadline && new Date() > job.applicationDeadline) {
    return next(new AppError('The application deadline for this job has passed.', 400));
  }

  const existing = await Application.findOne({
    job: job._id,
    applicant: req.user._id,
  });

  if (existing) {
    return next(new AppError('You have already applied to this job.', 409));
  }

  const seekerProfile = await JobSeekerProfile.findOne({ user: req.user._id });

  const resolvedResumeUrl =
    req.body.resumeUrl ||
    seekerProfile?.resumeUrl ||
    seekerProfile?.resumeFile?.path ||
    '';

  if (!resolvedResumeUrl) {
    return next(
      new AppError(
        'A resumeUrl is required. Provide resumeUrl in the request body or save/upload a resume on your profile first.',
        400
      )
    );
  }

  const application = await Application.create({
    job: job._id,
    company: job.company,
    applicant: req.user._id,
    seekerProfile: seekerProfile ? seekerProfile._id : null,
    resumeUrl: resolvedResumeUrl,
    coverLetter: req.body.coverLetter || '',
    status: 'Applied',
    statusHistory: [
      {
        status: 'Applied',
        note: 'Application submitted',
        changedBy: req.user._id,
        changedAt: new Date(),
      },
    ],
  });

  await Job.updateOne({ _id: job._id }, { $inc: { applicantsCount: 1 } });

  const populated = await Application.findById(application._id)
    .populate('job', 'title location type workMode salary status')
    .populate('company', 'name location logoUrl');

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Application submitted successfully',
    data: { application: sanitizeForSeeker(populated) },
  });
});

const getMyApplications = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const { page, limit, skip } = getPagination(req.query, 10, 50);

  const filter = { applicant: req.user._id };
  if (status) {
    filter.status = status;
  }

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .select('-employerNotes')
      .populate('job', 'title location type workMode salary status applicationDeadline')
      .populate('company', 'name industry location logoUrl isVerified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Application.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Your applications fetched successfully',
    data: { applications },
    meta: buildPaginationMeta({ page, limit, total }),
  });
});

const getJobApplicants = asyncHandler(async (req, res, next) => {
  const { jobId } = req.params;
  const { status, skill } = req.query;
  const { page, limit, skip } = getPagination(req.query, 10, 50);

  const job = await Job.findById(jobId);
  if (!job) {
    return next(new AppError('Job posting not found.', 404));
  }

  const isOwner = job.employer.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    return next(
      new AppError('You are not authorized to view applicants for this job.', 403)
    );
  }

  const filter = { job: job._id };
  if (status) {
    filter.status = status;
  }

  if (skill) {
    const escaped = String(skill).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matchingProfiles = await JobSeekerProfile.find({
      skills: { $regex: new RegExp(`^${escaped}$`, 'i') },
    }).select('_id');
    filter.seekerProfile = { $in: matchingProfiles.map((p) => p._id) };
  }

  const [applications, total, statusCounts] = await Promise.all([
    Application.find(filter)
      .populate('applicant', 'name email')
      .populate('seekerProfile', 'headline skills experienceYears location resumeUrl portfolioUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Application.countDocuments(filter),
    Application.aggregate([
      { $match: { job: job._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const statusSummary = statusCounts.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Job applicants fetched successfully',
    data: {
      job: {
        _id: job._id,
        title: job.title,
        status: job.status,
        applicantsCount: job.applicantsCount,
      },
      statusSummary,
      applicants: applications,
    },
    meta: buildPaginationMeta({ page, limit, total }),
  });
});

const getEmployerApplications = asyncHandler(async (req, res) => {
  const { status, jobId } = req.query;
  const { page, limit, skip } = getPagination(req.query, 10, 50);

  const employerJobs = await Job.find({ employer: req.user._id }).select('_id');
  const employerJobIds = employerJobs.map((j) => j._id);

  const filter = { job: { $in: employerJobIds } };
  if (jobId) {
    const ownsRequestedJob = employerJobIds.some((id) => id.toString() === jobId);
    filter.job = ownsRequestedJob ? jobId : { $in: [] };
  }
  if (status) {
    filter.status = status;
  }

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .populate('job', 'title location type status')
      .populate('applicant', 'name email')
      .populate('seekerProfile', 'headline skills experienceYears location resumeUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Application.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Employer applications fetched successfully',
    data: { applications },
    meta: buildPaginationMeta({ page, limit, total }),
  });
});

const getApplicationById = asyncHandler(async (req, res, next) => {
  const application = await Application.findById(req.params.id)
    .populate('job', 'title location type workMode salary employer status')
    .populate('company', 'name industry location logoUrl')
    .populate('applicant', 'name email')
    .populate('seekerProfile', 'headline bio skills experienceYears location resumeUrl portfolioUrl linkedinUrl')
    .populate('statusHistory.changedBy', 'name role');

  if (!application) {
    return next(new AppError('Application not found.', 404));
  }

  const isApplicant = application.applicant._id.toString() === req.user._id.toString();
  const isJobOwner =
    application.job && application.job.employer.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isApplicant && !isJobOwner && !isAdmin) {
    return next(new AppError('You are not authorized to view this application.', 403));
  }

  const responseApp =
    isApplicant && !isAdmin ? sanitizeForSeeker(application) : application;

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Application details fetched successfully',
    data: { application: responseApp },
  });
});

const updateApplicationStatus = asyncHandler(async (req, res, next) => {
  const { status, note = '', employerNotes, interviewDate } = req.body;

  const application = await Application.findById(req.params.id).populate(
    'job',
    'title employer'
  );

  if (!application) {
    return next(new AppError('Application not found.', 404));
  }

  const isOwner =
    application.job && application.job.employer.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    return next(
      new AppError('You are not authorized to update this application status.', 403)
    );
  }

  if (application.status === status) {
    return next(new AppError(`Application is already in '${status}' status.`, 400));
  }

  const allowedNext = ALLOWED_STATUS_TRANSITIONS[application.status] || [];
  if (!allowedNext.includes(status)) {
    return next(
      new AppError(
        `Cannot transition application from '${application.status}' to '${status}'. Allowed transitions: ${
          allowedNext.length ? allowedNext.join(', ') : 'none'
        }.`,
        400
      )
    );
  }

  application.status = status;
  if (employerNotes !== undefined) {
    application.employerNotes = employerNotes;
  }
  if (interviewDate !== undefined) {
    application.interviewDate = interviewDate;
  }

  application.statusHistory.push({
    status,
    note: note || `Status updated to ${status}`,
    changedBy: req.user._id,
    changedAt: new Date(),
  });

  await application.save();

  const updated = await Application.findById(application._id)
    .populate('job', 'title location type')
    .populate('applicant', 'name email')
    .populate('statusHistory.changedBy', 'name role');

  return sendSuccess(res, {
    statusCode: 200,
    message: `Application status updated to '${status}'`,
    data: { application: updated },
  });
});

const withdrawApplication = asyncHandler(async (req, res, next) => {
  const application = await Application.findById(req.params.id);
  if (!application) {
    return next(new AppError('Application not found.', 404));
  }

  if (application.applicant.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only withdraw your own applications.', 403));
  }

  if (['Withdrawn', 'Rejected'].includes(application.status)) {
    return next(
      new AppError(`Cannot withdraw an application that is already '${application.status}'.`, 400)
    );
  }

  application.status = 'Withdrawn';
  application.statusHistory.push({
    status: 'Withdrawn',
    note: req.body?.note || 'Withdrawn by applicant',
    changedBy: req.user._id,
    changedAt: new Date(),
  });

  await application.save();
  await Job.updateOne(
    { _id: application.job, applicantsCount: { $gt: 0 } },
    { $inc: { applicantsCount: -1 } }
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Application withdrawn successfully',
    data: { application: sanitizeForSeeker(application) },
  });
});

module.exports = {
  applyToJob,
  getMyApplications,
  getJobApplicants,
  getEmployerApplications,
  getApplicationById,
  updateApplicationStatus,
  withdrawApplication,
};
