# JobHunters PH — Job Recruitment Portal (Express.js + MongoDB)

A production-structured **Job Recruitment Portal** (`JobHunters`) built with **Node.js**, **Express.js**, and **MongoDB (Mongoose)**, featuring a **One Piece Blue & Pink** web UI localized for the **Philippines (`PHP` / `₱`)**. It connects **Job Seekers**, **Employers**, and **Admins** with JWT role-based authentication, auth-gated job browsing, public Companies/About/Contact pages, company profiles, job postings with advanced search & filtering, resume/CV management, and a full Applicant Tracking System (ATS) workflow.

---

## Core Features

- **Role-Based Authentication & Authorization (`JWT` + `bcryptjs`)**
  - Three roles: `job_seeker`, `employer`, and `admin`.
  - Password hashing with bcrypt (12 salt rounds), password update endpoint, and account deactivation enforcement.
- **Employer Company Profiles & Job Postings CRUD**
  - Employers create/update their company profile and manage job postings with required skills, location, work mode (`onsite`, `remote`, `hybrid`), employment type (`full-time`, `part-time`, `contract`, `internship`, `freelance`), experience level, salary range, and application deadlines.
  - Ownership checks ensure employers can only edit/delete their own postings and view their own applicants.
- **Job Seeker Profiles & Resume Management**
  - Manage headline, bio, skills, resume/CV URL, education, work experience, portfolio/LinkedIn/GitHub links, and availability status.
  - Built-in resume file upload (`POST /api/profiles/me/resume`) supporting PDF, DOC, and DOCX via `multer`.
- **Job Search, Multi-Criteria Filtering, Sorting & Pagination**
  - Filter by `keyword`, `location`, `type`, `workMode`, `experienceLevel`, `minSalary`, `maxSalary`, `skills`, and `company`.
  - Sort by `newest`, `oldest`, `salary_desc`, `salary_asc`, or `most_applied`, with standardized pagination metadata.
- **Applicant Tracking System (ATS)**
  - Job seekers apply to open jobs (with duplicate application prevention and deadline validation), track application status, and withdraw applications.
  - Employers view applicants per job (with status breakdown counts & skill filtering) and transition applications along the validated pipeline:
    ```
    Applied ──▶ Review ──▶ Interview ──▶ Offer / Rejected
    ```
  - Full `statusHistory` audit timeline on every application; private `employerNotes` are stripped from job seeker views.
- **Bonus Features & Polish**
  - Saved/bookmarked jobs (`POST/GET/DELETE /api/saved-jobs`).
  - Admin analytics dashboard (`/api/admin/stats`), user management, and company verification.
  - Security hardening: `helmet`, `cors`, `express-rate-limit`, custom NoSQL injection & prototype pollution sanitization, centralized error handling, and `morgan` logging.
  - Automated Jest + Supertest integration test suite using `mongodb-memory-server`.

---

## Tech Stack

- **Runtime & Framework**: Node.js, Express.js
- **Database & ODM**: MongoDB, Mongoose
- **Auth & Security**: `jsonwebtoken`, `bcryptjs`, `helmet`, `cors`, `express-rate-limit`
- **Validation & Uploads**: `express-validator`, `multer`
- **Testing**: `jest`, `supertest`, `mongodb-memory-server`

---

## Project Structure

```text
├── docs/
│   └── Job_Recruitment_Portal.postman_collection.json
├── src/
│   ├── config/          # Environment variables & MongoDB connection
│   ├── controllers/     # Route business logic (auth, company, profile, job, application, savedJob, admin)
│   ├── middleware/      # Auth/RBAC, validation, error handler, rate limiter, sanitizer, multer upload
│   ├── models/          # Mongoose schemas & indexes (User, CompanyProfile, JobSeekerProfile, Job, Application, SavedJob)
│   ├── routes/          # Modular Express routers
│   ├── seed/            # Sample dataset seeder (seed.js)
│   ├── utils/           # AppError, asyncHandler, pagination, response formatter
│   ├── validators/      # express-validator request schemas
│   ├── app.js           # Express app definition
│   └── server.js        # Server startup & graceful shutdown
├── tests/               # Jest + Supertest integration tests
├── uploads/resumes/     # Uploaded resume storage
├── .env.example
└── package.json
```

---

## Getting Started

### 1. Prerequisites

- **Node.js** v18+ (tested on Node.js v22)
- **MongoDB** (local MongoDB Community Server or MongoDB Atlas cluster)

### 2. Installation

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update the values if needed:

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` | Application environment (`development`, `production`, `test`) |
| `PORT` | `5000` | HTTP port for the Express server |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/job_recruitment_portal` | MongoDB connection string |
| `JWT_SECRET` | *(required)* | Secret key used to sign JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | JWT token expiration window |
| `CORS_ORIGIN` | `*` | Allowed CORS origins (comma-separated or `*`) |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate-limit window in ms (default 15 mins) |
| `RATE_LIMIT_MAX` | `100` | Max requests per IP per window on `/api` |
| `AUTH_RATE_LIMIT_MAX` | `20` | Max auth attempts per IP per window |
| `MAX_RESUME_SIZE_MB` | `5` | Max uploaded resume size in MB |

### 4. Seed Sample Data (Optional)

Make sure MongoDB is running, then run:

```bash
npm run seed
```

Seeded demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@jobportal.com` | `Admin@123` |
| Employer 1 | `hr@techflow.io` | `Employer@123` |
| Employer 2 | `talent@cloudscale.dev` | `Employer@123` |
| Job Seeker 1 | `alice@seeker.com` | `Seeker@123` |
| Job Seeker 2 | `bob@seeker.com` | `Seeker@123` |
| Job Seeker 3 | `carol@seeker.com` | `Seeker@123` |

### 5. Run the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The web portal UI will be available at `http://localhost:5000`, and the REST API at `http://localhost:5000/api` (health check at `GET /api/health`).

> **Note**: In `development` mode, if local MongoDB is not running on port `27017`, the server automatically starts an in-memory MongoDB instance and seeds all demo accounts so you can explore the full UI & API immediately.

---

## API Endpoints Overview

All responses follow a consistent JSON envelope:

```json
{
  "success": true,
  "message": "Descriptive message",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Auth (`/api/auth`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Register a `job_seeker` or `employer` |
| `POST` | `/api/auth/login` | Public | Authenticate and receive a JWT token |
| `GET` | `/api/auth/me` | Authenticated | Get logged-in user and associated profile |
| `PATCH` | `/api/auth/password` | Authenticated | Change current user password |

### Companies (`/api/companies`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `PUT` | `/api/companies/me` | Employer | Create or update own company profile |
| `GET` | `/api/companies/me` | Employer | View own company profile & open jobs count |
| `GET` | `/api/companies` | Public | List/search companies with pagination |
| `GET` | `/api/companies/:id` | Public | View company details & its open jobs |

### Job Seeker Profiles (`/api/profiles`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/profiles/me` | Job Seeker | View own job seeker profile |
| `PUT` | `/api/profiles/me` | Job Seeker | Create/update skills, CV URL, education, experience |
| `POST` | `/api/profiles/me/resume` | Job Seeker | Upload PDF/DOC/DOCX resume (`multipart/form-data`, field `resume`) |
| `GET` | `/api/profiles` | Employer, Admin | Search candidate profiles by skills, location, experience |
| `GET` | `/api/profiles/:userId` | Self, Employer, Admin | View a candidate's profile |

### Jobs (`/api/jobs`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/jobs` | Public | Search & filter jobs (`keyword`, `location`, `type`, `workMode`, `experienceLevel`, `minSalary`, `maxSalary`, `skills`, `sort`, `page`, `limit`) |
| `GET` | `/api/jobs/:id` | Public | Get single job details (increments views counter) |
| `GET` | `/api/jobs/my-jobs` | Employer | List jobs created by the logged-in employer |
| `POST` | `/api/jobs` | Employer, Admin | Create a new job posting |
| `PATCH` | `/api/jobs/:id` | Owner Employer, Admin | Update a job posting or close it |
| `DELETE` | `/api/jobs/:id` | Owner Employer, Admin | Delete a job posting and its applications |

### Applications & ATS (`/api/jobs/:jobId/applications` & `/api/applications`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/jobs/:jobId/applications` | Job Seeker | Apply to an open job |
| `GET` | `/api/jobs/:jobId/applications` | Owner Employer, Admin | View applicants for a job (filter by `status`, `skill`) + status summary |
| `GET` | `/api/applications/me` | Job Seeker | View own submitted applications & status |
| `GET` | `/api/applications/employer` | Employer | View all applications across all own jobs |
| `GET` | `/api/applications/:id` | Applicant, Owner Employer, Admin | View application details & status history |
| `PATCH` | `/api/applications/:id/status` | Owner Employer, Admin | Transition status (`Review`, `Interview`, `Offer`, `Rejected`) |
| `PATCH` | `/api/applications/:id/withdraw` | Job Seeker | Withdraw own application |

### Saved Jobs (`/api/saved-jobs`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/saved-jobs` | Job Seeker | List bookmarked jobs |
| `POST` | `/api/saved-jobs/:jobId` | Job Seeker | Save/bookmark a job |
| `DELETE` | `/api/saved-jobs/:jobId` | Job Seeker | Remove a saved job |

### Admin Panel (`/api/admin`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/admin/stats` | Admin | Platform analytics (users, companies, jobs, applications, top skills) |
| `GET` | `/api/admin/users` | Admin | List/search users with filters |
| `PATCH` | `/api/admin/users/:id` | Admin | Update user role or activate/deactivate account |
| `PATCH` | `/api/admin/companies/:id/verify` | Admin | Verify or unverify a company profile |

---

## Postman Collection

Import `docs/Job_Recruitment_Portal.postman_collection.json` into Postman.
- Login/register requests include test scripts that automatically populate `seekerToken`, `employerToken`, `adminToken`, `companyId`, `jobId`, and `applicationId` collection variables.

---

## Automated Tests

Tests run against an isolated in-memory MongoDB instance (`mongodb-memory-server`), so no local MongoDB daemon is required to run the suite:

```bash
npm test
```
