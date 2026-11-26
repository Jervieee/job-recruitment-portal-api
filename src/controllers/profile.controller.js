const JobSeekerProfile = require('../models/JobSeekerProfile');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const upsertMyProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    'headline',
    'bio',
    'skills',
    'resumeUrl',
    'phone',
    'location',
    'experienceYears',
    'expectedSalary',
    'portfolioUrl',
    'linkedinUrl',
    'githubUrl',
    'education',
    'experience',
    'isOpenToWork',
  ];

  const payload = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      payload[field] = req.body[field];
    }
  }

  const profile = await JobSeekerProfile.findOneAndUpdate(
    { user: req.user._id },
    { $set: payload },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate('user', 'name email role');

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Job seeker profile saved successfully',
    data: { profile },
  });
});

const getMyProfile = asyncHandler(async (req, res) => {
  let profile = await JobSeekerProfile.findOne({ user: req.user._id }).populate(
    'user',
    'name email role'
  );

  if (!profile) {
    profile = await JobSeekerProfile.create({ user: req.user._id });
    profile = await profile.populate('user', 'name email role');
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Job seeker profile fetched successfully',
    data: { profile },
  });
});

const uploadMyResume = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload a resume file (PDF, DOC, or DOCX).', 400));
  }

  const relativePath = `/uploads/resumes/${req.file.filename}`;

  const profile = await JobSeekerProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: {
        resumeUrl: relativePath,
        resumeFile: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: relativePath,
          uploadedAt: new Date(),
        },
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Resume uploaded successfully',
    data: {
      resumeUrl: profile.resumeUrl,
      resumeFile: profile.resumeFile,
    },
  });
});

const getProfileByUserId = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  // Job seekers can only view their own profile; employers & admins can view any candidate profile
  if (req.user.role === 'job_seeker' && req.user._id.toString() !== userId) {
    return next(
      new AppError('You are not authorized to view another job seeker profile.', 403)
    );
  }

  const profile = await JobSeekerProfile.findOne({ user: userId }).populate(
    'user',
    'name email role createdAt'
  );

  if (!profile) {
    return next(new AppError('Job seeker profile not found.', 404));
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Candidate profile fetched successfully',
    data: { profile },
  });
});

const searchCandidates = asyncHandler(async (req, res) => {
  const { skills, location, minExperience, openToWork } = req.query;
  const { page, limit, skip } = getPagination(req.query, 10, 50);

  const filter = {};

  if (skills) {
    const skillList = String(skills)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (skillList.length > 0) {
      filter.skills = {
        $in: skillList.map((s) => new RegExp(`^${escapeRegex(s)}$`, 'i')),
      };
    }
  }

  if (location) {
    filter.location = new RegExp(escapeRegex(location), 'i');
  }

  if (minExperience !== undefined && minExperience !== '') {
    filter.experienceYears = { $gte: Number(minExperience) };
  }

  if (openToWork === 'true') {
    filter.isOpenToWork = true;
  } else if (openToWork === 'false') {
    filter.isOpenToWork = false;
  }

  const [profiles, total] = await Promise.all([
    JobSeekerProfile.find(filter)
      .populate('user', 'name email isActive')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    JobSeekerProfile.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Candidates fetched successfully',
    data: { candidates: profiles },
    meta: buildPaginationMeta({ page, limit, total }),
  });
});

module.exports = {
  upsertMyProfile,
  getMyProfile,
  uploadMyResume,
  getProfileByUserId,
  searchCandidates,
};
