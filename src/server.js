const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { seedData } = require('./seed/seedData');

let server;

const startServer = async () => {
  try {
    const { isInMemory } = await connectDB();

    if (isInMemory) {
      await seedData({ silent: true });
      console.log(
        'In-memory DB auto-seeded with demo accounts (admin@jobportal.com / Admin@123, hr@techflow.io / Employer@123, alice@seeker.com / Seeker@123).'
      );
    }

    server = app.listen(env.port, () => {
      console.log(
        `Job Recruitment Portal API running in ${env.nodeEnv} mode on http://localhost:${env.port}`
      );
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      await disconnectDB();
      console.log('HTTP server and MongoDB connection closed.');
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  gracefulShutdown('unhandledRejection');
});

startServer();
