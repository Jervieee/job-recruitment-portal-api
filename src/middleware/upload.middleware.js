const path = require('path');
const fs = require('fs');
const multer = require('multer');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const uploadDir = path.join(process.cwd(), 'uploads', 'resumes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedExtensions = ['.pdf', '.doc', '.docx'];
const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const userId = req.user ? req.user._id.toString() : 'anon';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `resume-${userId}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }
  return cb(
    new AppError('Only PDF, DOC, and DOCX resume files are allowed.', 400),
    false
  );
};

const uploadResume = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxResumeSizeMb * 1024 * 1024,
  },
});

module.exports = { uploadResume };
