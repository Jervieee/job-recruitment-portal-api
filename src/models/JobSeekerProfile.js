const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema(
  {
    institution: { type: String, required: true, trim: true, maxlength: 150 },
    degree: { type: String, required: true, trim: true, maxlength: 120 },
    fieldOfStudy: { type: String, trim: true, maxlength: 120, default: '' },
    startYear: { type: Number, required: true, min: 1950, max: 2100 },
    endYear: { type: Number, min: 1950, max: 2100 },
    current: { type: Boolean, default: false },
  },
  { _id: true }
);

const experienceSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, trim: true, maxlength: 150 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    location: { type: String, trim: true, maxlength: 120, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String, trim: true, maxlength: 1500, default: '' },
  },
  { _id: true }
);

const jobSeekerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    headline: {
      type: String,
      trim: true,
      maxlength: [160, 'Headline cannot exceed 160 characters'],
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [2000, 'Bio cannot exceed 2000 characters'],
      default: '',
    },
    skills: {
      type: [String],
      default: [],
      set: (skills) =>
        Array.isArray(skills)
          ? [...new Set(skills.map((s) => String(s).trim()).filter(Boolean))]
          : [],
    },
    resumeUrl: {
      type: String,
      trim: true,
      default: '',
    },
    resumeFile: {
      filename: { type: String, default: '' },
      originalName: { type: String, default: '' },
      path: { type: String, default: '' },
      uploadedAt: { type: Date },
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [30, 'Phone cannot exceed 30 characters'],
      default: '',
    },
    location: {
      type: String,
      trim: true,
      maxlength: [120, 'Location cannot exceed 120 characters'],
      default: '',
    },
    experienceYears: {
      type: Number,
      min: [0, 'Experience years cannot be negative'],
      max: [60, 'Experience years cannot exceed 60'],
      default: 0,
    },
    expectedSalary: {
      type: Number,
      min: [0, 'Expected salary cannot be negative'],
    },
    portfolioUrl: {
      type: String,
      trim: true,
      default: '',
    },
    linkedinUrl: {
      type: String,
      trim: true,
      default: '',
    },
    githubUrl: {
      type: String,
      trim: true,
      default: '',
    },
    education: {
      type: [educationSchema],
      default: [],
    },
    experience: {
      type: [experienceSchema],
      default: [],
    },
    isOpenToWork: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

jobSeekerProfileSchema.index({ skills: 1 });
jobSeekerProfileSchema.index({ location: 1, isOpenToWork: 1 });
jobSeekerProfileSchema.index({ experienceYears: 1 });

module.exports = mongoose.model('JobSeekerProfile', jobSeekerProfileSchema);
