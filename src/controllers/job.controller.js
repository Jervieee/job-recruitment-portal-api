const Job = require('../models/Job');
const CompanyProfile = require('../models/CompanyProfile');
const Application = require('../models/Application');
const SavedJob = require('../models/SavedJob');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  salary_desc: { 'salary.max': -1, createdAt: -1 },
  salary_asc: { 'salary.min': 1, createdAt: -1 },
  most_applied: { applicantsCount: -1, createdAt: -1 },
};

const createJob = asyncHandler(async (req, res, next) => {
  let company;

  if (req.user.role === 'admin' && req.body.company) {
    company = await CompanyProfile.findById(req.body.company);
    if (!company) {
      return next(new AppError('Specified company profile not found.', 404));
    }
  } else {
    company = await CompanyProfile.findOne({ employer: req.user._id });
    if (!company) {
      return next(
        new AppError(
          'You must create a company profile (PUT /api/companies/me) before posting jobs.',
          400
        )
      );
    }
  }

  const job = await Job.create({
    title: req.body.title,
    description: req.body.description,
    requirements: req.body.requirements || [],
    responsibilities: req.body.responsibilities || [],
    skills: req.body.skills,
    location: req.body.location,
    workMode: req.body.workMode || 'onsite',
    type: req.body.type,
    experienceLevel: req.body.experienceLevel || 'mid',
    salary: {
      min: Number(req.body.salary.min),
      max: Number(req.body.salary.max),
      currency: req.body.salary.currency || 'PHP',
    },
    status: req.body.status || 'open',
    applicationDeadline: req.body.applicationDeadline || null,
    company: company._id,
    employer: company.employer,
  });

  const populatedJob = await job.populate('company', 'name industry location logoUrl isVerified');

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Job posting created successfully',
    data: { job: populatedJob },
  });
});

const listJobs = asyncHandler(async (req, res) => {
  const {
    keyword,
    location,
    type,
    workMode,
    experienceLevel,
    minSalary,
    maxSalary,
    skills,
    company,
    status,
    sort = 'newest',
  } = req.query;

  const { page, limit, skip } = getPagination(req.query, 10, 50);

  const filter = {};

  // Public users only see open jobs unless admin requests another status
  if (req.user && req.user.role === 'admin' && status) {
    if (status !== 'all') {
      filter.status = status;
    }
  } else {
    filter.status = 'open';
  }

  if (keyword) {
    const regex = new RegExp(escapeRegex(keyword), 'i');
    filter.$or = [
      { title: regex },
      { description: regex },
      { skills: regex },
      { location: regex },
    ];
  }

  if (location) {
    filter.location = new RegExp(escapeRegex(location), 'i');
  }

  if (type) {
    filter.type = type;
  }

  if (workMode) {
    filter.workMode = workMode;
  }

  if (experienceLevel) {
    filter.experienceLevel = experienceLevel;
  }

  if (company) {
    filter.company = company;
  }

  if (minSalary !== undefined && minSalary !== '') {
    filter['salary.max'] = { $gte: Number(minSalary) };
  }

  if (maxSalary !== undefined && maxSalary !== '') {
    filter['salary.min'] = { $lte: Number(maxSalary) };
  }

  if (skills) {
    const skillList = String(skills)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (skillList.length > 0) {
      filter.skills = {
        $in: skillList.map((s) => new RegExp(`^${escapeRegex(s)}$`, 'i')),
      };
    }
  }

  const sortOrder = SORT_OPTIONS[sort] || SORT_OPTIONS.newest;

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .populate('company', 'name industry location logoUrl isVerified size')
      .sort(sortOrder)
      .skip(skip)
      .limit(limit),
    Job.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Jobs fetched successfully',
    data: { jobs },
    meta: buildPaginationMeta({ page, limit, total }),
  });
});

const getJobById = asyncHandler(async (req, res, next) => {
  const job = await Job.findById(req.params.id)
    .populate('company', 'name industry description location website logoUrl size isVerified')
    .populate('employer', 'name email');

  if (!job) {
    return next(new AppError('Job posting not found.', 404));
  }

  const isOwner = req.user && job.employer._id.toString() === req.user._id.toString();
  const isAdmin = req.user && req.user.role === 'admin';

  // Draft jobs are only visible to the owning employer or an admin
  if (job.status === 'draft' && !isOwner && !isAdmin) {
    return next(new AppError('Job posting not found.', 404));
  }

  // Increment views count for non-owner viewers
  if (!isOwner) {
    job.viewsCount += 1;
    await Job.updateOne({ _id: job._id }, { $inc: { viewsCount: 1 } });
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Job details fetched successfully',
    data: { job },
  });
});

const getMyJobs = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const { page, limit, skip } = getPagination(req.query, 10, 50);

  const filter = { employer: req.user._id };
  if (status && status !== 'all') {
    filter.status = status;
  }

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .populate('company', 'name location logoUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Job.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Employer jobs fetched successfully',
    data: { jobs },
    meta: buildPaginationMeta({ page, limit, total }),
  });
});

const updateJob = asyncHandler(async (req, res, next) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    return next(new AppError('Job posting not found.', 404));
  }

  const isOwner = job.employer.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    return next(new AppError('You are not authorized to update this job posting.', 403));
  }

  const updatableFields = [
    'title',
    'description',
    'requirements',
    'responsibilities',
    'skills',
    'location',
    'workMode',
    'type',
    'experienceLevel',
    'status',
    'applicationDeadline',
  ];

  for (const field of updatableFields) {
    if (req.body[field] !== undefined) {
      job[field] = req.body[field];
    }
  }

  if (req.body.salary) {
    const newMin =
      req.body.salary.min !== undefined ? Number(req.body.salary.min) : job.salary.min;
    const newMax =
      req.body.salary.max !== undefined ? Number(req.body.salary.max) : job.salary.max;

    if (newMax < newMin) {
      return next(
        new AppError('Maximum salary must be greater than or equal to minimum salary.', 422)
      );
    }

    job.salary = {
      min: newMin,
      max: newMax,
      currency: req.body.salary.currency || job.salary.currency,
    };
  }

  await job.save();
  await job.populate('company', 'name industry location logoUrl isVerified');

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Job posting updated successfully',
    data: { job },
  });
});

const deleteJob = asyncHandler(async (req, res, next) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    return next(new AppError('Job posting not found.', 404));
  }

  const isOwner = job.employer.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    return next(new AppError('You are not authorized to delete this job posting.', 403));
  }

  await Promise.all([
    Application.deleteMany({ job: job._id }),
    SavedJob.deleteMany({ job: job._id }),
    job.deleteOne(),
  ]);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Job posting and related applications deleted successfully',
  });
});

module.exports = {
  createJob,
  listJobs,
  getJobById,
  getMyJobs,
  updateJob,
  deleteJob,
};
