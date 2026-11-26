const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { connectTestDB, clearTestDB, closeTestDB } = require('./setup');

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe('Admin Analytics, Verification & User Management API', () => {
  it('restricts admin endpoints to admin role and provides analytics & moderation', async () => {
    const adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@portal.io',
      password: 'Password123',
      role: 'admin',
    });
    const adminToken = adminUser.generateAuthToken();

    const empReg = await request(app).post('/api/auth/register').send({
      name: 'Emp User',
      email: 'emp@portal.io',
      password: 'Password123',
      role: 'employer',
    });
    const employerToken = empReg.body.data.token;
    const employerId = empReg.body.data.user._id;

    // Non-admin blocked
    const forbidden = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${employerToken}`);
    expect(forbidden.status).toBe(403);

    // Employer creates company & job
    const compRes = await request(app)
      .put('/api/companies/me')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        name: 'VerifyMe Inc',
        industry: 'FinTech',
        description: 'Modern payment APIs.',
        location: 'Chicago, IL',
      });
    const companyId = compRes.body.data.company._id;

    await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        title: 'API Platform Engineer',
        description: 'Develop payment APIs with Node.js and MongoDB.',
        skills: ['Node.js', 'MongoDB'],
        location: 'Chicago, IL',
        type: 'full-time',
        salary: { min: 110000, max: 140000 },
      });

    // Admin verifies company
    const verifyRes = await request(app)
      .patch(`/api/admin/companies/${companyId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isVerified: true });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.company.isVerified).toBe(true);

    // Admin fetches analytics
    const statsRes = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.companies.verified).toBe(1);
    expect(statsRes.body.data.jobs.byStatus.open).toBe(1);
    expect(statsRes.body.data.topInDemandSkills.length).toBeGreaterThan(0);

    // Admin deactivates employer -> employer can no longer login
    const deactivateRes = await request(app)
      .patch(`/api/admin/users/${employerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(deactivateRes.status).toBe(200);
    expect(deactivateRes.body.data.user.isActive).toBe(false);

    const blockedLogin = await request(app).post('/api/auth/login').send({
      email: 'emp@portal.io',
      password: 'Password123',
    });
    expect(blockedLogin.status).toBe(403);
  });
});
