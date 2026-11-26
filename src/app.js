const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const { sanitizeRequest } = require('./middleware/sanitize.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const { sendSuccess } = require('./utils/response');

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: env.corsOrigin === '*' ? '*' : env.corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  })
);

// Request logging (disabled in test environment)
if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
}

// Body parsers with payload limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Sanitize against NoSQL injection & prototype pollution
app.use(sanitizeRequest);

// Serve uploaded resume files & frontend web UI
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(express.static(path.join(process.cwd(), 'public')));

// Apply general rate limiting to all /api endpoints
app.use('/api', apiLimiter);

// API root index
app.get('/api', (req, res) =>
  sendSuccess(res, {
    statusCode: 200,
    message: 'Welcome to the JobHunters Recruitment Portal REST API (PH)',
    data: {
      name: 'JobHunters',
      currency: 'PHP',
      version: '1.0.0',
      webUi: '/',
      healthCheck: '/api/health',
      endpoints: {
        auth: '/api/auth',
        companies: '/api/companies',
        profiles: '/api/profiles',
        jobs: '/api/jobs',
        applications: '/api/applications',
        savedJobs: '/api/saved-jobs',
        admin: '/api/admin',
      },
    },
  })
);

// Mount API routes
app.use('/api', routes);

// 404 and centralized error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
