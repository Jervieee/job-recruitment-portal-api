const User = require('../models/User');
const CompanyProfile = require('../models/CompanyProfile');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role = 'job_seeker' } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
  });

  // Automatically initialize an empty JobSeekerProfile for job seekers
  if (role === 'job_seeker') {
    await JobSeekerProfile.create({ user: user._id });
  }

  const token = user.generateAuthToken();

  return sendSuccess(res, {
    statusCode: 201,
    message: 'User registered successfully',
    data: {
      user,
      token,
    },
  });
});

const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password.', 401));
  }

  if (!user.isActive) {
    return next(
      new AppError('Your account has been deactivated. Contact an administrator.', 403)
    );
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = user.generateAuthToken();

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Logged in successfully',
    data: {
      user,
      token,
    },
  });
});

const getMe = asyncHandler(async (req, res) => {
  const result = { user: req.user };

  if (req.user.role === 'employer') {
    result.companyProfile = await CompanyProfile.findOne({ employer: req.user._id });
  } else if (req.user.role === 'job_seeker') {
    result.seekerProfile = await JobSeekerProfile.findOne({ user: req.user._id });
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Current user fetched successfully',
    data: result,
  });
});

const updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!user || !(await user.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect.', 401));
  }

  if (currentPassword === newPassword) {
    return next(
      new AppError('New password must be different from your current password.', 400)
    );
  }

  user.password = newPassword;
  await user.save();

  const token = user.generateAuthToken();

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Password updated successfully',
    data: { token },
  });
});

module.exports = {
  register,
  login,
  getMe,
  updatePassword,
};
