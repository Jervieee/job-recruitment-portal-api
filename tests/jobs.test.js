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

const registerUser = async (name, email, role) => {
  const res = await request(app).post('/api/auth/register').send({
    name,
    email,
    password: 'Password123',
    role,
  });
  return { token: res.body.data.token, user: res.body.data.user };
};

const createCompany = async (token, overrides = {}) => {
  const res = await request(app)
    .put('/api/companies/me')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Acme Tech',
      industry: 'Software',
      description: 'Innovative enterprise software solutions.',
      location: 'New York, NY',
      size: '51-200',
      ...overrides,
    });
  return res;
};

describe('Company Profile & Job Postings API', () => {
  it('requires employer to create a company profile before posting a job', async () => {
    const employer = await registerUser('Emp One', 'emp1@test.com', 'employer');

    const failJob = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${employer.token}`)
      .send({
        title: 'Backend Engineer',
        description: 'Build awesome REST APIs using Node.js, Express, and MongoDB.',
        skills: ['Node.js', 'MongoDB'],
        location: 'New York, NY',
        type: 'full-time',
        salary: { min: 100000, max: 130000 },
      });

    expect(failJob.status).toBe(400);
    expect(failJob.body.message).toMatch(/company profile/i);
  });

  it('supports employer company CRUD, job CRUD, and enforces ownership', async () => {
    const emp1 = await registerUser('Emp One', 'emp1@test.com', 'employer');
    const emp2 = await registerUser('Emp Two', 'emp2@test.com', 'employer');
    const seeker = await registerUser('Seeker', 'seeker@test.com', 'job_seeker');

    const compRes = await createCompany(emp1.token);
    expect(compRes.status).toBe(201);
    const companyId = compRes.body.data.company._id;

    // Job seeker cannot create jobs
    const seekerCreate = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({
        title: 'Unauthorized Job',
        description: 'This request should fail due to role restrictions.',
        skills: ['Node.js'],
        location: 'Remote',
        type: 'full-time',
        salary: { min: 50000, max: 70000 },
      });
    expect(seekerCreate.status).toBe(403);

    // Employer 1 creates job
    const jobRes = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${emp1.token}`)
      .send({
        title: 'Senior Express Developer',
        description: 'Lead API development using Express.js, Mongoose, and TypeScript.',
        skills: ['Node.js', 'Express', 'MongoDB'],
        location: 'New York, NY',
        workMode: 'hybrid',
        type: 'full-time',
        experienceLevel: 'senior',
        salary: { min: 120000, max: 155000, currency: 'USD' },
      });

    expect(jobRes.status).toBe(201);
    const jobId = jobRes.body.data.job._id;

    // Employer 2 cannot update or delete Employer 1's job
    const forbiddenEdit = await request(app)
      .patch(`/api/jobs/${jobId}`)
      .set('Authorization', `Bearer ${emp2.token}`)
      .send({ title: 'Hijacked Title' });
    expect(forbiddenEdit.status).toBe(403);

    const forbiddenDelete = await request(app)
      .delete(`/api/jobs/${jobId}`)
      .set('Authorization', `Bearer ${emp2.token}`);
    expect(forbiddenDelete.status).toBe(403);

    // Employer 1 updates job
    const editRes = await request(app)
      .patch(`/api/jobs/${jobId}`)
      .set('Authorization', `Bearer ${emp1.token}`)
      .send({ salary: { min: 130000, max: 165000 } });
    expect(editRes.status).toBe(200);
    expect(editRes.body.data.job.salary.max).toBe(165000);

    // Public company endpoint includes open jobs
    const publicComp = await request(app).get(`/api/companies/${companyId}`);
    expect(publicComp.status).toBe(200);
    expect(publicComp.body.data.openJobs).toHaveLength(1);

    // Employer 1 deletes job
    const delRes = await request(app)
      .delete(`/api/jobs/${jobId}`)
      .set('Authorization', `Bearer ${emp1.token}`);
    expect(delRes.status).toBe(200);
  });

  it('searches and filters jobs by keyword, location, type, salary, skills, sort & pagination', async () => {
    const emp = await registerUser('Emp Search', 'search@test.com', 'employer');
    await createCompany(emp.token, { name: 'SearchCorp' });

    const jobPayloads = [
      {
        title: 'Node.js Backend Developer',
        description: 'Build high-throughput Node.js and MongoDB REST services.',
        skills: ['Node.js', 'MongoDB'],
        location: 'San Francisco, CA',
        workMode: 'remote',
        type: 'full-time',
        salary: { min: 110000, max: 140000 },
      },
      {
        title: 'React Frontend Intern',
        description: 'Summer internship working on our React component library.',
        skills: ['React', 'JavaScript'],
        location: 'Austin, TX',
        workMode: 'onsite',
        type: 'internship',
        salary: { min: 40000, max: 50000 },
      },
      {
        title: 'Python Data Engineer',
        description: 'Build distributed analytics pipelines in Python and AWS.',
        skills: ['Python', 'AWS'],
        location: 'San Francisco, CA',
        workMode: 'hybrid',
        type: 'contract',
        salary: { min: 150000, max: 190000 },
      },
    ];

    for (const payload of jobPayloads) {
      await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${emp.token}`)
        .send(payload);
    }

    // Filter by keyword
    const byKeyword = await request(app).get('/api/jobs?keyword=Node');
    expect(byKeyword.status).toBe(200);
    expect(byKeyword.body.data.jobs).toHaveLength(1);
    expect(byKeyword.body.data.jobs[0].title).toMatch(/Node\.js/);

    // Filter by location & minSalary
    const byLocAndSalary = await request(app).get(
      '/api/jobs?location=San Francisco&minSalary=145000'
    );
    expect(byLocAndSalary.status).toBe(200);
    expect(byLocAndSalary.body.data.jobs).toHaveLength(1);
    expect(byLocAndSalary.body.data.jobs[0].title).toBe('Python Data Engineer');

    // Filter by type
    const byType = await request(app).get('/api/jobs?type=internship');
    expect(byType.status).toBe(200);
    expect(byType.body.data.jobs).toHaveLength(1);

    // Filter by skills
    const bySkills = await request(app).get('/api/jobs?skills=mongodb,react');
    expect(bySkills.status).toBe(200);
    expect(bySkills.body.data.jobs).toHaveLength(2);

    // Sort by salary_desc & paginate
    const sortedPaginated = await request(app).get(
      '/api/jobs?sort=salary_desc&page=1&limit=2'
    );
    expect(sortedPaginated.status).toBe(200);
    expect(sortedPaginated.body.data.jobs).toHaveLength(2);
    expect(sortedPaginated.body.data.jobs[0].salary.max).toBe(190000);
    expect(sortedPaginated.body.meta.total).toBe(3);
    expect(sortedPaginated.body.meta.hasNextPage).toBe(true);
  });
});
