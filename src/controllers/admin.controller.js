const User = require('../models/User');
const CompanyProfile = require('../models/CompanyProfile');
const Job = require('../models/Job');
const Application = require('../models/Application');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    usersByRole,
    totalCompanies,
    verifiedCompanies,
    jobsByStatus,
    applicationsByStatus,
    topSkills,
  ] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    CompanyProfile.countDocuments(),
    CompanyProfile.countDocuments({ isVerified: true }),
    Job.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Job.aggregate([
      { $match: { status: 'open' } },
      { $unwind: '$skills' },
      { $group: { _id: '$skills', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, skill: '$_id', count: 1 } },
    ]),
  ]);

  const toMap = (arr) =>
    arr.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

  const userCounts = toMap(usersByRole);
  const jobCounts = toMap(jobsByStatus);
  const applicationCounts = toMap(applicationsByStatus);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Admin analytics fetched successfully',
    data: {
      users: {
        total: Object.values(userCounts).reduce((a, b) => a + b, 0),
        byRole: userCounts,
      },
      companies: {
        total: totalCompanies,
        verified: verifiedCompanies,
      },
      jobs: {
        total: Object.values(jobCounts).reduce((a, b) => a + b, 0),
        byStatus: jobCounts,
      },
      applications: {
        total: Object.values(applicationCounts).reduce((a, b) => a + b, 0),
        byStatus: applicationCounts,
      },
      topInDemandSkills: topSkills,
    },
  });
});

const listUsers = asyncHandler(async (req, res) => {
  const { role, isActive, keyword } = req.query;
  const { page, limit, skip } = getPagination(req.query, 10, 50);

  const filter = {};
  if (role) filter.role = role;
  if (isActive === 'true') filter.isActive = true;
  if (isActive === 'false') filter.isActive = false;
  if (keyword) {
    const escaped = String(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Users fetched successfully',
    data: { users },
    meta: buildPaginationMeta({ page, limit, total }),
  });
});

const updateUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { role, isActive } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  if (user._id.toString() === req.user._id.toString() && isActive === false) {
    return next(new AppError('Administrators cannot deactivate their own account.', 400));
  }

  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;

  await user.save();

  return sendSuccess(res, {
    statusCode: 200,
    message: 'User updated successfully',
    data: { user },
  });
});

const verifyCompany = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { isVerified } = req.body;

  const company = await CompanyProfile.findByIdAndUpdate(
    id,
    { isVerified },
    { new: true }
  );

  if (!company) {
    return next(new AppError('Company profile not found.', 404));
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: `Company ${isVerified ? 'verified' : 'unverified'} successfully`,
    data: { company },
  });
});

module.exports = {
  getDashboardStats,
  listUsers,
  updateUser,
  verifyCompany,
};
