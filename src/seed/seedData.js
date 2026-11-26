const User = require('../models/User');
const CompanyProfile = require('../models/CompanyProfile');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const Job = require('../models/Job');
const Application = require('../models/Application');
const SavedJob = require('../models/SavedJob');

const seedData = async ({ silent = false } = {}) => {
  if (!silent) console.log('Clearing existing collections...');

  await Promise.all([
    SavedJob.deleteMany({}),
    Application.deleteMany({}),
    Job.deleteMany({}),
    JobSeekerProfile.deleteMany({}),
    CompanyProfile.deleteMany({}),
    User.deleteMany({}),
  ]);

  if (!silent) console.log('Creating users...');
  const [admin, employer1, employer2, seeker1, seeker2, seeker3] = await User.create([
    {
      name: 'System Admin',
      email: 'admin@jobportal.com',
      password: 'Admin@123',
      role: 'admin',
    },
    {
      name: 'Elena Vance',
      email: 'hr@techflow.io',
      password: 'Employer@123',
      role: 'employer',
    },
    {
      name: 'Marcus Sterling',
      email: 'talent@cloudscale.dev',
      password: 'Employer@123',
      role: 'employer',
    },
    {
      name: 'Alice Rivera',
      email: 'alice@seeker.com',
      password: 'Seeker@123',
      role: 'job_seeker',
    },
    {
      name: 'Bob Chen',
      email: 'bob@seeker.com',
      password: 'Seeker@123',
      role: 'job_seeker',
    },
    {
      name: 'Carol Mendoza',
      email: 'carol@seeker.com',
      password: 'Seeker@123',
      role: 'job_seeker',
    },
  ]);

  if (!silent) console.log('Creating company profiles...');
  const [company1, company2] = await CompanyProfile.create([
    {
      employer: employer1._id,
      name: 'TechFlow Solutions',
      industry: 'Software Engineering',
      description:
        'TechFlow builds cloud-native developer platforms and enterprise workflow automation tools used by engineering teams worldwide.',
      location: 'San Francisco, CA',
      website: 'https://techflow.example.com',
      logoUrl: 'https://placehold.co/200x200?text=TechFlow',
      size: '51-200',
      foundedYear: 2019,
      contactEmail: 'careers@techflow.io',
      isVerified: true,
    },
    {
      employer: employer2._id,
      name: 'CloudScale Labs',
      industry: 'Cloud Infrastructure & AI',
      description:
        'CloudScale Labs specializes in distributed data pipelines, Kubernetes orchestration, and scalable machine learning infrastructure.',
      location: 'Austin, TX',
      website: 'https://cloudscale.example.com',
      logoUrl: 'https://placehold.co/200x200?text=CloudScale',
      size: '11-50',
      foundedYear: 2022,
      contactEmail: 'jobs@cloudscale.dev',
      isVerified: false,
    },
  ]);

  if (!silent) console.log('Creating job seeker profiles...');
  const [profile1, profile2, profile3] = await JobSeekerProfile.create([
    {
      user: seeker1._id,
      headline: 'Full-Stack Node.js & React Developer',
      bio: 'Passionate backend-leaning full-stack engineer with 4 years of experience building scalable REST APIs with Express, MongoDB, and React.',
      skills: ['Node.js', 'Express', 'MongoDB', 'React', 'TypeScript', 'Docker'],
      resumeUrl: 'https://example.com/resumes/alice-rivera-cv.pdf',
      phone: '+1-555-0101',
      location: 'San Francisco, CA',
      experienceYears: 4,
      expectedSalary: 115000,
      portfolioUrl: 'https://alicerivera.dev',
      linkedinUrl: 'https://linkedin.com/in/alicerivera',
      githubUrl: 'https://github.com/alicerivera',
      education: [
        {
          institution: 'State University of Technology',
          degree: 'B.S. Computer Science',
          fieldOfStudy: 'Computer Science',
          startYear: 2018,
          endYear: 2022,
        },
      ],
      experience: [
        {
          company: 'WebCraft Studio',
          title: 'Software Engineer',
          location: 'Remote',
          startDate: new Date('2022-06-01'),
          current: true,
          description: 'Designed and maintained microservices in Node.js and MongoDB.',
        },
      ],
      isOpenToWork: true,
    },
    {
      user: seeker2._id,
      headline: 'Backend & DevOps Engineer',
      bio: 'Focused on high-availability APIs, CI/CD pipelines, and containerized cloud deployments.',
      skills: ['Node.js', 'Python', 'Kubernetes', 'AWS', 'MongoDB', 'PostgreSQL'],
      resumeUrl: 'https://example.com/resumes/bob-chen-cv.pdf',
      phone: '+1-555-0102',
      location: 'Austin, TX',
      experienceYears: 6,
      expectedSalary: 145000,
      portfolioUrl: 'https://bobchen.io',
      isOpenToWork: true,
    },
    {
      user: seeker3._id,
      headline: 'Junior Web Developer & UI Specialist',
      bio: 'Computer science graduate eager to contribute to modern web applications.',
      skills: ['JavaScript', 'React', 'HTML', 'CSS', 'Node.js'],
      resumeUrl: 'https://example.com/resumes/carol-mendoza-cv.pdf',
      phone: '+1-555-0103',
      location: 'Remote',
      experienceYears: 1,
      expectedSalary: 70000,
      isOpenToWork: true,
    },
  ]);

  if (!silent) console.log('Creating job postings...');
  const futureDate = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const jobs = await Job.create([
    {
      title: 'Senior Node.js Backend Engineer',
      description:
        'We are looking for a Senior Node.js Backend Engineer to architect RESTful APIs, optimize MongoDB queries, and mentor junior developers.',
      requirements: [
        '4+ years of production Node.js and Express.js experience',
        'Deep understanding of MongoDB schema design and indexing',
        'Experience with JWT authentication and API security best practices',
      ],
      responsibilities: [
        'Design and ship reliable backend services',
        'Conduct code reviews and improve automated test coverage',
        'Collaborate closely with product and frontend engineers',
      ],
      company: company1._id,
      employer: employer1._id,
      skills: ['Node.js', 'Express', 'MongoDB', 'TypeScript', 'Docker'],
      location: 'San Francisco, CA',
      workMode: 'hybrid',
      type: 'full-time',
      experienceLevel: 'senior',
      salary: { min: 130000, max: 165000, currency: 'USD' },
      status: 'open',
      applicationDeadline: futureDate(45),
      applicantsCount: 2,
    },
    {
      title: 'Full-Stack JavaScript Developer',
      description:
        'Join our core product team to build responsive web apps using React, Node.js, and MongoDB with clean modular architecture.',
      requirements: [
        '2+ years working with React and Node.js',
        'Familiarity with REST APIs and Git workflows',
      ],
      responsibilities: [
        'Develop end-to-end features across frontend and backend',
        'Write integration and unit tests',
      ],
      company: company1._id,
      employer: employer1._id,
      skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
      location: 'Remote',
      workMode: 'remote',
      type: 'full-time',
      experienceLevel: 'mid',
      salary: { min: 95000, max: 125000, currency: 'USD' },
      status: 'open',
      applicationDeadline: futureDate(30),
      applicantsCount: 2,
    },
    {
      title: 'Frontend Engineering Intern',
      description:
        'A paid 12-week internship working alongside senior engineers on our React component library and design system.',
      requirements: [
        'Currently pursuing or recently completed CS degree',
        'Solid JavaScript fundamentals',
      ],
      responsibilities: ['Build accessible UI components', 'Fix bugs and write unit tests'],
      company: company1._id,
      employer: employer1._id,
      skills: ['JavaScript', 'React', 'CSS', 'HTML'],
      location: 'San Francisco, CA',
      workMode: 'hybrid',
      type: 'internship',
      experienceLevel: 'entry',
      salary: { min: 45000, max: 60000, currency: 'USD' },
      status: 'open',
      applicationDeadline: futureDate(20),
      applicantsCount: 1,
    },
    {
      title: 'Cloud & Kubernetes Platform Engineer',
      description:
        'Design, automate, and scale multi-region Kubernetes clusters and developer CI/CD pipelines on AWS.',
      requirements: [
        '3+ years with Kubernetes and Docker',
        'Strong scripting in Python or Node.js',
      ],
      responsibilities: [
        'Manage cloud infrastructure as code',
        'Improve observability and reliability',
      ],
      company: company2._id,
      employer: employer2._id,
      skills: ['Kubernetes', 'AWS', 'Docker', 'Python'],
      location: 'Austin, TX',
      workMode: 'remote',
      type: 'full-time',
      experienceLevel: 'senior',
      salary: { min: 140000, max: 180000, currency: 'USD' },
      status: 'open',
      applicationDeadline: futureDate(60),
      applicantsCount: 0,
    },
    {
      title: 'Contract API Security Consultant',
      description:
        '6-month contract engagement to audit REST APIs, harden authentication flows, and implement rate limiting and monitoring.',
      requirements: [
        'Proven API security auditing experience',
        'Knowledge of OWASP API Top 10',
      ],
      responsibilities: [
        'Audit Express.js and MongoDB services',
        'Deliver remediation recommendations',
      ],
      company: company2._id,
      employer: employer2._id,
      skills: ['Node.js', 'Security', 'Express', 'AWS'],
      location: 'Remote',
      workMode: 'remote',
      type: 'contract',
      experienceLevel: 'lead',
      salary: { min: 110000, max: 140000, currency: 'USD' },
      status: 'open',
      applicationDeadline: futureDate(25),
      applicantsCount: 0,
    },
    {
      title: 'Part-Time Technical Writer',
      description:
        'Write clear API guides, Postman documentation, and developer tutorials for our cloud platform.',
      requirements: ['Strong written English', 'Experience documenting REST APIs'],
      responsibilities: ['Author README guides and tutorials', 'Maintain API examples'],
      company: company2._id,
      employer: employer2._id,
      skills: ['Technical Writing', 'REST APIs', 'Markdown'],
      location: 'Austin, TX',
      workMode: 'remote',
      type: 'part-time',
      experienceLevel: 'mid',
      salary: { min: 40000, max: 55000, currency: 'USD' },
      status: 'closed',
      applicantsCount: 0,
    },
  ]);

  if (!silent) console.log('Creating sample applications...');
  await Application.create([
    {
      job: jobs[0]._id,
      company: company1._id,
      applicant: seeker1._id,
      seekerProfile: profile1._id,
      resumeUrl: profile1.resumeUrl,
      coverLetter: 'Excited to bring my 4 years of Node.js and MongoDB experience to TechFlow.',
      status: 'Interview',
      interviewDate: futureDate(5),
      employerNotes: 'Strong backend portfolio and clean REST API design.',
      statusHistory: [
        { status: 'Applied', note: 'Application submitted', changedBy: seeker1._id },
        { status: 'Review', note: 'Moved to hiring manager review', changedBy: employer1._id },
        { status: 'Interview', note: 'Technical interview scheduled', changedBy: employer1._id },
      ],
    },
    {
      job: jobs[0]._id,
      company: company1._id,
      applicant: seeker2._id,
      seekerProfile: profile2._id,
      resumeUrl: profile2.resumeUrl,
      coverLetter: 'Extensive experience scaling distributed Node.js and cloud workloads.',
      status: 'Offer',
      employerNotes: 'Top candidate; verbal offer aligned.',
      statusHistory: [
        { status: 'Applied', note: 'Application submitted', changedBy: seeker2._id },
        { status: 'Review', note: 'Shortlisted', changedBy: employer1._id },
        { status: 'Interview', note: 'Passed technical loop', changedBy: employer1._id },
        { status: 'Offer', note: 'Formal offer extended', changedBy: employer1._id },
      ],
    },
    {
      job: jobs[1]._id,
      company: company1._id,
      applicant: seeker1._id,
      seekerProfile: profile1._id,
      resumeUrl: profile1.resumeUrl,
      coverLetter: 'Full-stack JavaScript developer passionate about clean UX and APIs.',
      status: 'Review',
      employerNotes: 'Reviewing GitHub projects.',
      statusHistory: [
        { status: 'Applied', note: 'Application submitted', changedBy: seeker1._id },
        { status: 'Review', note: 'Under initial screening', changedBy: employer1._id },
      ],
    },
    {
      job: jobs[1]._id,
      company: company1._id,
      applicant: seeker3._id,
      seekerProfile: profile3._id,
      resumeUrl: profile3.resumeUrl,
      coverLetter: 'Applying for the mid-level full-stack opening.',
      status: 'Rejected',
      employerNotes: 'Great potential, better fit for the internship track.',
      statusHistory: [
        { status: 'Applied', note: 'Application submitted', changedBy: seeker3._id },
        { status: 'Rejected', note: 'Recommended for internship role instead', changedBy: employer1._id },
      ],
    },
    {
      job: jobs[2]._id,
      company: company1._id,
      applicant: seeker3._id,
      seekerProfile: profile3._id,
      resumeUrl: profile3.resumeUrl,
      coverLetter: 'Would love to join TechFlow as a Frontend Engineering Intern!',
      status: 'Applied',
      statusHistory: [
        { status: 'Applied', note: 'Application submitted', changedBy: seeker3._id },
      ],
    },
  ]);

  if (!silent) console.log('Creating saved jobs...');
  await SavedJob.create([
    { user: seeker1._id, job: jobs[3]._id },
    { user: seeker2._id, job: jobs[4]._id },
  ]);
};

module.exports = { seedData };
