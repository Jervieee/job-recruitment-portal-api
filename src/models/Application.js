const mongoose = require('mongoose');

const APPLICATION_STATUSES = [
  'Applied',
  'Review',
  'Interview',
  'Offer',
  'Rejected',
  'Withdrawn',
];

/**
 * Valid ATS status progression rules:
 * Applied -> Review | Interview | Rejected
 * Review -> Interview | Offer | Rejected
 * Interview -> Offer | Rejected
 * Offer -> Rejected (if rescinded/declined)
 * Rejected -> Review (allow re-opening by employer if needed)
 * Withdrawn -> terminal (cannot be updated by employer)
 */
const ALLOWED_STATUS_TRANSITIONS = {
  Applied: ['Review', 'Interview', 'Rejected'],
  Review: ['Interview', 'Offer', 'Rejected'],
  Interview: ['Offer', 'Rejected'],
  Offer: ['Rejected'],
  Rejected: ['Review'],
  Withdrawn: [],
};

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job reference is required'],
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyProfile',
      required: [true, 'Company reference is required'],
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Applicant reference is required'],
    },
    seekerProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobSeekerProfile',
      default: null,
    },
    resumeUrl: {
      type: String,
      required: [true, 'A resume/CV URL or uploaded resume is required to apply'],
      trim: true,
    },
    coverLetter: {
      type: String,
      trim: true,
      maxlength: [3000, 'Cover letter cannot exceed 3000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: APPLICATION_STATUSES,
        message: `Status must be one of: ${APPLICATION_STATUSES.join(', ')}`,
      },
      default: 'Applied',
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    employerNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Employer notes cannot exceed 2000 characters'],
      default: '',
    },
    interviewDate: {
      type: Date,
      default: null,
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

// Prevent a job seeker from applying to the same job more than once
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ job: 1, status: 1, createdAt: -1 });
applicationSchema.index({ applicant: 1, status: 1, createdAt: -1 });
applicationSchema.index({ company: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);
module.exports.APPLICATION_STATUSES = APPLICATION_STATUSES;
module.exports.ALLOWED_STATUS_TRANSITIONS = ALLOWED_STATUS_TRANSITIONS;
