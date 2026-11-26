const dotenv = require('dotenv');

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongodbUri:
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/job_recruitment_portal',
  jwtSecret:
    process.env.JWT_SECRET || 'fallback_dev_secret_change_in_production_32chars',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
  maxResumeSizeMb: parseInt(process.env.MAX_RESUME_SIZE_MB, 10) || 5,
};

module.exports = env;
