const mongoose = require('mongoose');

const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship', 'freelance'];
const WORK_MODES = ['onsite', 'remote', 'hybrid'];
const EXPERIENCE_LEVELS = ['entry', 'mid', 'senior', 'lead'];
const JOB_STATUSES = ['open', 'closed', 'draft'];

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      minlength: [3, 'Job title must be at least 3 characters'],
      maxlength: [150, 'Job title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
      minlength: [20, 'Job description must be at least 20 characters'],
      maxlength: [5000, 'Job description cannot exceed 5000 characters'],
    },
    requirements: {
      type: [String],
      default: [],
    },
    responsibilities: {
      type: [String],
      default: [],
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyProfile',
      required: [true, 'Company profile reference is required'],
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employer reference is required'],
    },
    skills: {
      type: [String],
      required: [true, 'At least one required skill must be specified'],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one skill is required',
      },
      set: (skills) =>
        Array.isArray(skills)
          ? [...new Set(skills.map((s) => String(s).trim()).filter(Boolean))]
          : [],
    },
    location: {
      type: String,
      required: [true, 'Job location is required'],
      trim: true,
      maxlength: [120, 'Location cannot exceed 120 characters'],
    },
    workMode: {
      type: String,
      enum: {
        values: WORK_MODES,
        message: `Work mode must be one of: ${WORK_MODES.join(', ')}`,
      },
      default: 'onsite',
    },
    type: {
      type: String,
      enum: {
        values: JOB_TYPES,
        message: `Job type must be one of: ${JOB_TYPES.join(', ')}`,
      },
      required: [true, 'Job type is required'],
    },
    experienceLevel: {
      type: String,
      enum: {
        values: EXPERIENCE_LEVELS,
        message: `Experience level must be one of: ${EXPERIENCE_LEVELS.join(', ')}`,
      },
      default: 'mid',
    },
    salary: {
      min: {
        type: Number,
        required: [true, 'Minimum salary is required'],
        min: [0, 'Minimum salary cannot be negative'],
      },
      max: {
        type: Number,
        required: [true, 'Maximum salary is required'],
        min: [0, 'Maximum salary cannot be negative'],
        validate: {
          validator: function validateMaxSalary(value) {
            return this.salary && value >= this.salary.min;
          },
          message: 'Maximum salary must be greater than or equal to minimum salary',
        },
      },
      currency: {
        type: String,
        uppercase: true,
        trim: true,
        default: 'PHP',
        maxlength: [5, 'Currency code cannot exceed 5 characters'],
      },
    },
    status: {
      type: String,
      enum: {
        values: JOB_STATUSES,
        message: `Status must be one of: ${JOB_STATUSES.join(', ')}`,
      },
      default: 'open',
    },
    applicationDeadline: {
      type: Date,
      default: null,
    },
    applicantsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

jobSchema.index(
  { title: 'text', description: 'text', skills: 'text', location: 'text' },
  { weights: { title: 10, skills: 6, location: 4, description: 2 } }
);
jobSchema.index({ status: 1, type: 1, createdAt: -1 });
jobSchema.index({ employer: 1, status: 1, createdAt: -1 });
jobSchema.index({ company: 1, status: 1 });
jobSchema.index({ 'salary.min': 1, 'salary.max': 1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ location: 1 });

jobSchema.virtual('isExpired').get(function isExpired() {
  if (!this.applicationDeadline) return false;
  return new Date() > this.applicationDeadline;
});

module.exports = mongoose.model('Job', jobSchema);
module.exports.JOB_TYPES = JOB_TYPES;
module.exports.WORK_MODES = WORK_MODES;
module.exports.EXPERIENCE_LEVELS = EXPERIENCE_LEVELS;
module.exports.JOB_STATUSES = JOB_STATUSES;
