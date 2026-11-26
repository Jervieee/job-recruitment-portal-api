const fs = require('fs');
const path = require('path');
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

const setupScenario = async () => {
  const empRes = await request(app).post('/api/auth/register').send({
    name: 'Hiring Manager',
    email: 'hr@acme.io',
    password: 'Password123',
    role: 'employer',
  });
  const employerToken = empRes.body.data.token;

  await request(app)
    .put('/api/companies/me')
    .set('Authorization', `Bearer ${employerToken}`)
    .send({
      name: 'Acme Systems',
      industry: 'Technology',
      description: 'Enterprise SaaS platform.',
      location: 'Remote',
    });

  const jobRes = await request(app)
    .post('/api/jobs')
    .set('Authorization', `Bearer ${employerToken}`)
    .send({
      title: 'Full-Stack Node Engineer',
      description: 'Work on Node.js, Express, MongoDB, and React applications.',
      skills: ['Node.js', 'Express', 'MongoDB'],
      location: 'Remote',
      workMode: 'remote',
      type: 'full-time',
      salary: { min: 100000, max: 130000 },
    });

  const seekerRes = await request(app).post('/api/auth/register').send({
    name: 'Jane Candidate',
    email: 'jane@seeker.io',
    password: 'Password123',
    role: 'job_seeker',
  });

  return {
    employerToken,
    seekerToken: seekerRes.body.data.token,
    seekerId: seekerRes.body.data.user._id,
    jobId: jobRes.body.data.job._id,
  };
};

describe('Seeker Profiles, Applications ATS Flow & Saved Jobs', () => {
  it('supports seeker profile update, resume upload, apply, duplicate block, and full ATS transitions', async () => {
    const { employerToken, seekerToken, jobId } = await setupScenario();

    // Update seeker profile
    const profileRes = await request(app)
      .put('/api/profiles/me')
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({
        headline: 'Backend Developer',
        skills: ['Node.js', 'Express', 'MongoDB'],
        resumeUrl: 'https://example.com/resumes/jane-cv.pdf',
        experienceYears: 3,
      });
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.profile.skills).toContain('Node.js');

    // Apply using saved profile resumeUrl (no resumeUrl needed in body)
    const applyRes = await request(app)
      .post(`/api/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({
        coverLetter: 'Excited to contribute to Acme Systems!',
      });

    expect(applyRes.status).toBe(201);
    expect(applyRes.body.data.application.status).toBe('Applied');
    expect(applyRes.body.data.application.resumeUrl).toBe(
      'https://example.com/resumes/jane-cv.pdf'
    );
    const appId = applyRes.body.data.application._id;

    // Duplicate application blocked with 409
    const dupApply = await request(app)
      .post(`/api/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({ coverLetter: 'Applying again' });
    expect(dupApply.status).toBe(409);

    // Employer views applicants for the job
    const applicantsRes = await request(app)
      .get(`/api/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${employerToken}`);
    expect(applicantsRes.status).toBe(200);
    expect(applicantsRes.body.data.applicants).toHaveLength(1);
    expect(applicantsRes.body.data.statusSummary.Applied).toBe(1);

    // Invalid transition: Applied -> Offer directly should fail
    const invalidTransition = await request(app)
      .patch(`/api/applications/${appId}/status`)
      .set('Authorization', `Bearer ${employerToken}`)
      .send({ status: 'Offer' });
    expect(invalidTransition.status).toBe(400);

    // Valid ATS pipeline: Applied -> Review -> Interview -> Offer
    const reviewRes = await request(app)
      .patch(`/api/applications/${appId}/status`)
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        status: 'Review',
        note: 'Shortlisted for screening',
        employerNotes: 'Internal private note for hiring committee',
      });
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.application.status).toBe('Review');

    const interviewRes = await request(app)
      .patch(`/api/applications/${appId}/status`)
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        status: 'Interview',
        note: 'Technical interview scheduled',
        interviewDate: '2026-12-15T14:00:00.000Z',
      });
    expect(interviewRes.status).toBe(200);

    const offerRes = await request(app)
      .patch(`/api/applications/${appId}/status`)
      .set('Authorization', `Bearer ${employerToken}`)
      .send({ status: 'Offer', note: 'Formal offer extended' });
    expect(offerRes.status).toBe(200);
    expect(offerRes.body.data.application.statusHistory).toHaveLength(4);

    // Seeker views own application: status is Offer, employerNotes is hidden
    const seekerView = await request(app)
      .get(`/api/applications/${appId}`)
      .set('Authorization', `Bearer ${seekerToken}`);
    expect(seekerView.status).toBe(200);
    expect(seekerView.body.data.application.status).toBe('Offer');
    expect(seekerView.body.data.application.employerNotes).toBeUndefined();
  });

  it('allows seeker to withdraw application and bookmark/unbookmark jobs', async () => {
    const { employerToken, seekerToken, jobId } = await setupScenario();

    // Save job
    const saveRes = await request(app)
      .post(`/api/saved-jobs/${jobId}`)
      .set('Authorization', `Bearer ${seekerToken}`);
    expect(saveRes.status).toBe(201);

    const listSaved = await request(app)
      .get('/api/saved-jobs')
      .set('Authorization', `Bearer ${seekerToken}`);
    expect(listSaved.status).toBe(200);
    expect(listSaved.body.data.savedJobs).toHaveLength(1);

    const unsaveRes = await request(app)
      .delete(`/api/saved-jobs/${jobId}`)
      .set('Authorization', `Bearer ${seekerToken}`);
    expect(unsaveRes.status).toBe(200);

    // Apply & withdraw
    const applyRes = await request(app)
      .post(`/api/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({ resumeUrl: 'https://example.com/cv.pdf' });
    const appId = applyRes.body.data.application._id;

    const withdrawRes = await request(app)
      .patch(`/api/applications/${appId}/withdraw`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({ note: 'Found another role' });
    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.data.application.status).toBe('Withdrawn');

    // Employer cannot update a withdrawn application
    const updateWithdrawn = await request(app)
      .patch(`/api/applications/${appId}/status`)
      .set('Authorization', `Bearer ${employerToken}`)
      .send({ status: 'Review' });
    expect(updateWithdrawn.status).toBe(400);
  });

  it('supports PDF resume upload and rejects unsupported file types', async () => {
    const { seekerToken } = await setupScenario();

    const pdfRes = await request(app)
      .post('/api/profiles/me/resume')
      .set('Authorization', `Bearer ${seekerToken}`)
      .attach('resume', Buffer.from('%PDF-1.4 fake pdf content'), {
        filename: 'candidate-cv.pdf',
        contentType: 'application/pdf',
      });

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.body.data.resumeUrl).toMatch(/^\/uploads\/resumes\/resume-/);

    // Clean up test file created on disk
    const uploadedDiskPath = path.join(
      process.cwd(),
      pdfRes.body.data.resumeUrl.replace(/^\//, '')
    );
    if (fs.existsSync(uploadedDiskPath)) {
      fs.unlinkSync(uploadedDiskPath);
    }

    const txtRes = await request(app)
      .post('/api/profiles/me/resume')
      .set('Authorization', `Bearer ${seekerToken}`)
      .attach('resume', Buffer.from('plain text'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    expect(txtRes.status).toBe(400);
  });

  it('prevents applying to closed jobs', async () => {
    const { employerToken, seekerToken, jobId } = await setupScenario();

    await request(app)
      .patch(`/api/jobs/${jobId}`)
      .set('Authorization', `Bearer ${employerToken}`)
      .send({ status: 'closed' });

    const closedApply = await request(app)
      .post(`/api/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({ resumeUrl: 'https://example.com/cv.pdf' });

    expect(closedApply.status).toBe(400);
    expect(closedApply.body.message).toMatch(/no longer accepting/i);
  });
});
