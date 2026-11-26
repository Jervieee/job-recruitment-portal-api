const CompanyProfile = require('../models/CompanyProfile');
const Job = require('../models/Job');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const upsertMyCompany = asyncHandler(async (req, res) => {
  const allowedFields = [
    'name',
    'industry',
    'description',
    'location',
    'website',
    'logoUrl',
    'size',
    'foundedYear',
    'contactEmail',
  ];

  const payload = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      payload[field] = req.body[field];
    }
  }

  const existing = await CompanyProfile.findOne({ employer: req.user._id });

  let company;
  let statusCode = 200;
  let message = 'Company profile updated successfully';

  if (existing) {
    Object.assign(existing, payload);
    company = await existing.save();
  } else {
    company = await CompanyProfile.create({
      employer: req.user._id,
      ...payload,
    });
    statusCode = 201;
    message = 'Company profile created successfully';
  }

  return sendSuccess(res, {
    statusCode,
    message,
    data: { company },
  });
});

const getMyCompany = asyncHandler(async (req, res, next) => {
  const company = await CompanyProfile.findOne({ employer: req.user._id });
  if (!company) {
    return next(
      new AppError('Company profile not found. Please create your company profile first.', 404)
    );
  }

  const openJobsCount = await Job.countDocuments({
    company: company._id,
    status: 'open',
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Company profile fetched successfully',
    data: {
      company,
      openJobsCount,
    },
  });
});

const listCompanies = asyncHandler(async (req, res) => {
  const { keyword, industry, location, verified } = req.query;
  const { page, limit, skip } = getPagination(req.query, 10, 50);

  const filter = {};

  if (keyword) {
    const regex = new RegExp(escapeRegex(keyword), 'i');
    filter.$or = [{ name: regex }, { industry: regex }, { description: regex }];
  }
  if (industry) {
    filter.industry = new RegExp(escapeRegex(industry), 'i');
  }
  if (location) {
    filter.location = new RegExp(escapeRegex(location), 'i');
  }
  if (verified === 'true') {
    filter.isVerified = true;
  } else if (verified === 'false') {
    filter.isVerified = false;
  }

  const [companies, total] = await Promise.all([
    CompanyProfile.find(filter)
      .populate('employer', 'name email')
      .sort({ isVerified: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    CompanyProfile.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Companies fetched successfully',
    data: { companies },
    meta: buildPaginationMeta({ page, limit, total }),
  });
});

const getCompanyById = asyncHandler(async (req, res, next) => {
  const company = await CompanyProfile.findById(req.params.id).populate(
    'employer',
    'name email'
  );
  if (!company) {
    return next(new AppError('Company profile not found.', 404));
  }

  const openJobs = await Job.find({ company: company._id, status: 'open' })
    .select('title location type workMode salary skills createdAt applicationDeadline')
    .sort({ createdAt: -1 })
    .limit(20);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Company details fetched successfully',
    data: {
      company,
      openJobs,
    },
  });
});

module.exports = {
  upsertMyCompany,
  getMyCompany,
  listCompanies,
  getCompanyById,
};
