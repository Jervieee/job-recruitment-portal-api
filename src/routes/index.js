const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./auth.routes');
const companyRoutes = require('./company.routes');
const profileRoutes = require('./profile.routes');
const jobRoutes = require('./job.routes');
const applicationRoutes = require('./application.routes');
const savedJobRoutes = require('./savedJob.routes');
const { sendSuccess } = require('../utils/response');

const router = express.Router();

router.get('/health', (req, res) => {
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Job Recruitment Portal API is healthy',
    data: {
      uptimeSeconds: Math.round(process.uptime()),
      database: dbStates[mongoose.connection.readyState] || 'unknown',
      timestamp: new Date().toISOString(),
    },
  });
});

router.use('/auth', authRoutes);
router.use('/companies', companyRoutes);
router.use('/profiles', profileRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/saved-jobs', savedJobRoutes);
router.use('/admin', require('./admin.routes'));

module.exports = router;
