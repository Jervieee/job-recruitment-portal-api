const { connectDB, disconnectDB } = require('../config/db');
const { seedData } = require('./seedData');

const runSeed = async () => {
  try {
    await connectDB();
    await seedData({ silent: false });

    console.log('\nDatabase seeded successfully!\n');
    console.log('Demo Accounts:');
    console.log('-----------------------------------------------------------');
    console.log('Admin     : admin@jobportal.com      / Admin@123');
    console.log('Employer 1: hr@techflow.io           / Employer@123');
    console.log('Employer 2: talent@cloudscale.dev    / Employer@123');
    console.log('Seeker 1  : alice@seeker.com         / Seeker@123');
    console.log('Seeker 2  : bob@seeker.com           / Seeker@123');
    console.log('Seeker 3  : carol@seeker.com         / Seeker@123');
    console.log('-----------------------------------------------------------\n');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    await disconnectDB();
    process.exit(1);
  }
};

runSeed();
