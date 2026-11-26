const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array({ onlyFirstError: true }).map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));
    return next(new AppError('Validation failed', 422, errors));
  }
  next();
};

module.exports = validate;
