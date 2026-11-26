const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
};

const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return next(new AppError('Authentication required. Please provide a Bearer token.', 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch (err) {
    return next(new AppError('Invalid or expired authentication token.', 401));
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError('The user associated with this token no longer exists.', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Contact an administrator.', 403));
  }

  req.user = user;
  next();
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.id);
    if (user && user.isActive) {
      req.user = user;
    }
  } catch (err) {
    // Ignore invalid optional tokens and proceed as unauthenticated
  }

  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required.', 401));
  }
  if (!roles.includes(req.user.role)) {
    return next(
      new AppError(
        `Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
        403
      )
    );
  }
  next();
};

module.exports = { protect, optionalAuth, authorize };
