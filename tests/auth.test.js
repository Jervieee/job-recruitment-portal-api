const request = require('supertest');
const app = require('../src/app');
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

describe('Health, Auth & Security API', () => {
  it('GET /api/health returns 200 and connected DB status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.database).toBe('connected');
  });

  it('POST /api/auth/register registers a job_seeker and auto-creates profile', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice Tester',
      email: 'alice@test.com',
      password: 'Password123',
      role: 'job_seeker',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('job_seeker');
    expect(res.body.data.user.password).toBeUndefined();

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${res.body.data.token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.seekerProfile).toBeTruthy();
  });

  it('POST /api/auth/register blocks public admin self-registration', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Sneaky Admin',
      email: 'admin@test.com',
      password: 'Password123',
      role: 'admin',
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/register rejects duplicate emails with 409', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'User One',
      email: 'dup@test.com',
      password: 'Password123',
    });

    const dupRes = await request(app).post('/api/auth/register').send({
      name: 'User Two',
      email: 'dup@test.com',
      password: 'Password123',
    });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
  });

  it('POST /api/auth/login authenticates valid user and rejects wrong password', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Bob Employer',
      email: 'bob@company.com',
      password: 'Password123',
      role: 'employer',
    });

    const okRes = await request(app).post('/api/auth/login').send({
      email: 'bob@company.com',
      password: 'Password123',
    });
    expect(okRes.status).toBe(200);
    expect(okRes.body.data.token).toBeDefined();

    const badRes = await request(app).post('/api/auth/login').send({
      email: 'bob@company.com',
      password: 'WrongPassword1',
    });
    expect(badRes.status).toBe(401);
  });

  it('PATCH /api/auth/password updates user password', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Pass User',
      email: 'pass@test.com',
      password: 'Password123',
    });

    const changeRes = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${reg.body.data.token}`)
      .send({
        currentPassword: 'Password123',
        newPassword: 'NewPassword456',
      });

    expect(changeRes.status).toBe(200);

    const loginNew = await request(app).post('/api/auth/login').send({
      email: 'pass@test.com',
      password: 'NewPassword456',
    });
    expect(loginNew.status).toBe(200);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
