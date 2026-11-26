const mongoose = require('mongoose');

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

const companyProfileSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employer reference is required'],
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters'],
      maxlength: [120, 'Company name cannot exceed 120 characters'],
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
      trim: true,
      maxlength: [80, 'Industry cannot exceed 80 characters'],
    },
    description: {
      type: String,
      required: [true, 'Company description is required'],
      trim: true,
      maxlength: [2500, 'Description cannot exceed 2500 characters'],
    },
    location: {
      type: String,
      required: [true, 'Company location is required'],
      trim: true,
      maxlength: [120, 'Location cannot exceed 120 characters'],
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    logoUrl: {
      type: String,
      trim: true,
      default: '',
    },
    size: {
      type: String,
      enum: {
        values: COMPANY_SIZES,
        message: `Company size must be one of: ${COMPANY_SIZES.join(', ')}`,
      },
      default: '11-50',
    },
    foundedYear: {
      type: Number,
      min: [1800, 'Founded year must be >= 1800'],
      max: [new Date().getFullYear() + 1, 'Founded year cannot be in the future'],
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid contact email'],
    },
    isVerified: {
      type: Boolean,
      default: false,
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

companyProfileSchema.index({ name: 'text', industry: 'text', location: 'text' });
companyProfileSchema.index({ industry: 1, location: 1 });
companyProfileSchema.index({ isVerified: 1 });

module.exports = mongoose.model('CompanyProfile', companyProfileSchema);
module.exports.COMPANY_SIZES = COMPANY_SIZES;
