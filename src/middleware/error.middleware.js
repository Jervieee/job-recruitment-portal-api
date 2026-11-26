const multer = require('multer');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

const errorHandler = (err, req, res, next) => {
  let error = err;

  // Mongoose invalid ObjectId
  if (err.name === 'CastError') {
    error = new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    const message =
      fields.length > 0
        ? `Duplicate value for field(s): ${fields.join(', ')}`
        : 'Duplicate field value entered';
    error = new AppError(message, 409);
  }

  // Mongoose schema validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = new AppError('Validation failed', 400, details);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid authentication token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    error = new AppError('Authentication token has expired', 401);
  }

  // Multer upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = new AppError(`File too large. Maximum size is ${env.maxResumeSizeMb}MB.`, 400);
    } else {
      error = new AppError(`File upload error: ${err.message}`, 400);
    }
  }

  // Malformed JSON payload
  if (err.type === 'entity.parse.failed') {
    error = new AppError('Invalid JSON payload in request body', 400);
  }

  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    message: error.isOperational ? error.message : 'Internal server error',
  };

  if (error.errors) {
    response.errors = error.errors;
  }

  if (env.nodeEnv === 'development') {
    response.stack = err.stack;
  }

  if (statusCode >= 500 && env.nodeEnv !== 'test') {
    console.error('[SERVER ERROR]', err);
  }

  return res.status(statusCode).json(response);
};

module.exports = { notFoundHandler, errorHandler };
