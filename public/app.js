(() => {
  const API_BASE = '/api';

  const ALLOWED_TRANSITIONS = {
    Applied: ['Review', 'Interview', 'Rejected'],
    Review: ['Interview', 'Offer', 'Rejected'],
    Interview: ['Offer', 'Rejected'],
    Offer: ['Rejected'],
    Rejected: ['Review'],
    Withdrawn: [],
  };

  const PUBLIC_VIEWS = ['auth', 'companies', 'about', 'contact'];

  const state = {
    token: localStorage.getItem('jp_token') || '',
    user: null,
    seekerProfile: null,
    companyProfile: null,
    currentView: 'auth',
    jobsPage: 1,
    companyFilterId: '',
    activeApplicantsJobId: null,
  };

  const $ = (id) => document.getElementById(id);

  // Safe HTML escaping
  const esc = (str) =>
    String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  // Philippine Peso (PHP) default currency formatter
  const formatMoney = (val, currency = 'PHP') => {
    const num = Number(val || 0);
    const code = (currency || 'PHP').toUpperCase();
    if (code === 'PHP') return `₱${num.toLocaleString('en-PH')}`;
    if (code === 'USD') return `$${num.toLocaleString('en-US')}`;
    return `${code} ${num.toLocaleString()}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Toast helper
  const showToast = (message, type = 'info') => {
    const container = $('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3600);
  };

  // Fetch helper
  const api = async (path, options = {}) => {
    const headers = options.headers ? { ...options.headers } : {};
    if (state.token) {
      headers.Authorization = `Bearer ${state.token}`;
    }
    if (!(options.body instanceof FormData) && options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail =
        Array.isArray(data.errors) && data.errors.length
          ? `${data.message}: ${data.errors.map((e) => e.message).join(', ')}`
          : data.message || `Request failed (${res.status})`;
      throw new Error(detail);
    }
    return data;
  };

  // Modal helpers
  const openModal = (id) => $(id).classList.remove('hidden');
  const closeModal = (id) => $(id).classList.add('hidden');

  // Auth mode switch on index page
  const setAuthMode = (mode = 'login') => {
    const isLogin = mode === 'login';
    $('authPanelTitle').textContent = isLogin ? 'Welcome Aboard' : 'Join the JobHunters Crew';
    $('authPanelSub').textContent = isLogin
      ? 'Sign in to unlock job hunting, saved roles, and your dashboard.'
      : 'Create a free account to browse PHP (₱) jobs or post openings.';
    $('switchLogin').classList.toggle('active', isLogin);
    $('switchRegister').classList.toggle('active', !isLogin);
    $('loginForm').classList.toggle('hidden', !isLogin);
    $('registerForm').classList.toggle('hidden', isLogin);
  };

  // Navigation with strict auth gate for Browse Jobs & Dashboards
  const switchView = (viewName) => {
    if (!state.user && !PUBLIC_VIEWS.includes(viewName)) {
      showToast('Please sign in or register first to browse jobs.', 'info');
      viewName = 'auth';
    }

    if (state.user && viewName === 'auth') {
      viewName = 'jobs';
    }

    state.currentView = viewName;
    document.querySelectorAll('.view-section').forEach((sec) => {
      sec.classList.toggle('active', sec.id === `view-${viewName}`);
    });
    document.querySelectorAll('.nav-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    if (viewName === 'jobs') loadJobs();
    if (viewName === 'companies') loadCompanies();
    if (viewName === 'seeker') loadSeekerDashboard();
    if (viewName === 'employer') loadEmployerDashboard();
    if (viewName === 'admin') loadAdminDashboard();
  };

  const updateAuthUI = () => {
    const loggedIn = Boolean(state.user);

    // Top-right auth buttons vs user chip
    $('navAuth').classList.toggle('hidden', loggedIn);
    $('navUser').classList.toggle('hidden', !loggedIn);

    // Gate tabs: Sign In only when logged out; Browse Jobs & role tabs only when logged in
    $('tabAuth').classList.toggle('hidden', loggedIn);
    $('tabJobs').classList.toggle('hidden', !loggedIn);
    $('tabSeeker').classList.toggle('hidden', !loggedIn || state.user.role !== 'job_seeker');
    $('tabEmployer').classList.toggle('hidden', !loggedIn || state.user.role !== 'employer');
    $('tabAdmin').classList.toggle('hidden', !loggedIn || state.user.role !== 'admin');

    if (loggedIn) {
      $('currentUserName').textContent = state.user.name;
      $('currentUserRole').textContent = state.user.role.replace('_', ' ');
    }
  };

  const loadCurrentUser = async () => {
    if (!state.token) {
      state.user = null;
      state.seekerProfile = null;
      state.companyProfile = null;
      updateAuthUI();
      return;
    }

    try {
      const res = await api('/auth/me');
      state.user = res.data.user;
      state.seekerProfile = res.data.seekerProfile || null;
      state.companyProfile = res.data.companyProfile || null;
    } catch (err) {
      state.token = '';
      localStorage.removeItem('jp_token');
      state.user = null;
    }
    updateAuthUI();
  };

  // ---------- JOBS (AUTHENTICATED ONLY) ----------
  const loadJobs = async (page = state.jobsPage) => {
    if (!state.user) return;
    state.jobsPage = page;
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', 6);

    const kw = $('filterKeyword').value.trim();
    const loc = $('filterLocation').value.trim();
    const type = $('filterType').value;
    const mode = $('filterWorkMode').value;
    const minSal = $('filterMinSalary').value;
    const sort = $('filterSort').value;

    if (kw) params.set('keyword', kw);
    if (loc) params.set('location', loc);
    if (type) params.set('type', type);
    if (mode) params.set('workMode', mode);
    if (minSal) params.set('minSalary', minSal);
    if (sort) params.set('sort', sort);
    if (state.companyFilterId) params.set('company', state.companyFilterId);

    try {
      const res = await api(`/jobs?${params.toString()}`);
      const { jobs } = res.data;
      const meta = res.meta;

      $('jobsCountLabel').textContent = state.companyFilterId
        ? `Showing ${jobs.length} of ${meta.total} job(s) for selected company`
        : `Showing ${jobs.length} of ${meta.total} active job bounties`;

      if (!kw && !loc && !type && !mode && !minSal && !state.companyFilterId) {
        $('statOpenJobs').textContent = meta.total;
      }

      if (!jobs.length) {
        $('jobsList').innerHTML =
          '<div class="empty-state">No open jobs match your current filters. Try resetting filters.</div>';
        $('jobsPagination').innerHTML = '';
        return;
      }

      $('jobsList').innerHTML = jobs
        .map((job) => {
          const companyName = job.company?.name || 'Company';
          const verified = job.company?.isVerified
            ? '<span class="verified-badge">Verified</span>'
            : '';
          const skillsHtml = (job.skills || [])
            .slice(0, 5)
            .map((s) => `<span class="pill pill-skill">${esc(s)}</span>`)
            .join('');
          const currency = job.salary?.currency || 'PHP';

          return `
            <article class="job-card">
              <div class="job-card-top">
                <div>
                  <h3 class="job-title">${esc(job.title)}</h3>
                  <div class="company-line">${esc(companyName)} ${verified}</div>
                </div>
                <span class="salary-tag">${formatMoney(job.salary?.min, currency)} – ${formatMoney(job.salary?.max, currency)}</span>
              </div>
              <div class="meta-row">
                <span class="pill">📍 ${esc(job.location)}</span>
                <span class="pill">${esc(job.type)}</span>
                <span class="pill">${esc(job.workMode)}</span>
                <span class="pill pill-pink">${esc(job.experienceLevel)}</span>
              </div>
              <div class="skills-wrap">${skillsHtml}</div>
              <div class="job-card-footer">
                <span class="muted">${job.applicantsCount || 0} applicant(s)</span>
                <button class="btn btn-pink btn-sm" data-open-job="${job._id}">View &amp; Apply</button>
              </div>
            </article>
          `;
        })
        .join('');

      $('jobsPagination').innerHTML = `
        <button class="btn btn-ghost btn-sm" id="btnPrevJobs" ${!meta.hasPrevPage ? 'disabled' : ''}>Previous</button>
        <span class="muted">Page ${meta.page} of ${meta.totalPages}</span>
        <button class="btn btn-ghost btn-sm" id="btnNextJobs" ${!meta.hasNextPage ? 'disabled' : ''}>Next</button>
      `;

      const prevBtn = $('btnPrevJobs');
      const nextBtn = $('btnNextJobs');
      if (prevBtn) prevBtn.addEventListener('click', () => loadJobs(meta.page - 1));
      if (nextBtn) nextBtn.addEventListener('click', () => loadJobs(meta.page + 1));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openJobDetail = async (jobId) => {
    try {
      const res = await api(`/jobs/${jobId}`);
      const { job } = res.data;
      const currency = job.salary?.currency || 'PHP';

      $('detailJobTitle').textContent = job.title;
      $('detailJobSubtitle').textContent = `${job.company?.name || 'Company'} • ${job.location} (${job.workMode}) • ${job.type}`;

      const reqs = (job.requirements || []).length
        ? `<h4>Requirements</h4><ul>${job.requirements.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`
        : '';
      const resps = (job.responsibilities || []).length
        ? `<h4>Responsibilities</h4><ul>${job.responsibilities.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`
        : '';

      const isSeeker = state.user && state.user.role === 'job_seeker';
      const defaultResume = state.seekerProfile?.resumeUrl || '';

      let actionBlock = '';
      if (isSeeker && job.status === 'open') {
        actionBlock = `
          <hr />
          <form id="applyJobForm" data-job-id="${job._id}">
            <h4>Apply to this Role</h4>
            <div class="form-group">
              <label for="applyResumeUrl">Resume / CV URL</label>
              <input type="text" id="applyResumeUrl" value="${esc(defaultResume)}" placeholder="https://example.com/my-cv.pdf" required />
            </div>
            <div class="form-group">
              <label for="applyCoverLetter">Cover Letter</label>
              <textarea id="applyCoverLetter" rows="3" placeholder="Tell the hiring crew why you're a great fit..."></textarea>
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <button type="submit" class="btn btn-pink">Submit Application</button>
              <button type="button" class="btn btn-outline" id="btnSaveJobModal" data-save-job="${job._id}">Save Job</button>
            </div>
          </form>
        `;
      }

      $('jobDetailBody').innerHTML = `
        <div class="meta-row" style="margin-bottom:12px;">
          <span class="salary-tag">${formatMoney(job.salary?.min, currency)} – ${formatMoney(job.salary?.max, currency)} / mo</span>
          <span class="pill pill-pink">${esc(job.experienceLevel)} level</span>
          <span class="pill">Deadline: ${formatDate(job.applicationDeadline)}</span>
          <span class="pill">${job.viewsCount || 0} views</span>
        </div>
        <div class="skills-wrap" style="margin-bottom:14px;">
          ${(job.skills || []).map((s) => `<span class="pill pill-skill">${esc(s)}</span>`).join('')}
        </div>
        <h4>Job Description</h4>
        <p>${esc(job.description)}</p>
        ${reqs}
        ${resps}
        ${actionBlock}
      `;

      const applyForm = $('applyJobForm');
      if (applyForm) {
        applyForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            await api(`/jobs/${job._id}/applications`, {
              method: 'POST',
              body: JSON.stringify({
                resumeUrl: $('applyResumeUrl').value.trim(),
                coverLetter: $('applyCoverLetter').value.trim(),
              }),
            });
            showToast('Application submitted successfully!', 'success');
            closeModal('jobDetailModal');
            loadJobs();
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
      }

      const saveBtn = $('btnSaveJobModal');
      if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
          try {
            await api(`/saved-jobs/${job._id}`, { method: 'POST' });
            showToast('Job saved to your bookmarks!', 'success');
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
      }

      openModal('jobDetailModal');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ---------- COMPANIES (PUBLIC) ----------
  const loadCompanies = async () => {
    try {
      const res = await api('/companies?limit=30');
      const { companies } = res.data;
      if ($('statCompanies')) {
        $('statCompanies').textContent = res.meta.total;
      }

      $('companiesGateNotice').innerHTML = state.user
        ? ''
        : '<button class="btn btn-pink btn-sm" data-goto-view="auth">Sign In to Browse Their Jobs</button>';

      if (!companies.length) {
        $('companiesList').innerHTML = '<div class="empty-state">No companies registered yet.</div>';
        return;
      }

      $('companiesList').innerHTML = companies
        .map(
          (c) => `
          <article class="company-card">
            <div class="job-card-top">
              <div>
                <h3 class="job-title">${esc(c.name)}</h3>
                <div class="company-line">${esc(c.industry)} • 📍 ${esc(c.location)}</div>
              </div>
              ${
                c.isVerified
                  ? '<span class="verified-badge">Verified</span>'
                  : '<span class="unverified-badge">Pending</span>'
              }
            </div>
            <p class="muted" style="margin:0;">${esc(c.description)}</p>
            <div class="meta-row">
              <span class="pill">Crew Size: ${esc(c.size || 'N/A')}</span>
              ${c.foundedYear ? `<span class="pill">Est. ${c.foundedYear}</span>` : ''}
            </div>
            <div class="job-card-footer">
              ${
                c.website
                  ? `<a href="${esc(c.website)}" target="_blank" rel="noopener" class="muted">Website ↗</a>`
                  : '<span></span>'
              }
              ${
                state.user
                  ? `<button class="btn btn-outline btn-sm" data-filter-company="${c._id}">View Open Jobs</button>`
                  : `<button class="btn btn-outline btn-sm" data-goto-view="auth">Sign In to View Jobs</button>`
              }
            </div>
          </article>
        `
        )
        .join('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ---------- JOB SEEKER DASHBOARD ----------
  const loadSeekerDashboard = async () => {
    await Promise.all([loadMyApplications(), loadSavedJobs(), loadMySeekerProfile()]);
  };

  const loadMyApplications = async () => {
    try {
      const res = await api('/applications/me?limit=50');
      const { applications } = res.data;

      if (!applications.length) {
        $('myApplicationsList').innerHTML =
          '<div class="empty-state">You have not applied to any jobs yet. Head to Browse Jobs to start hunting!</div>';
        return;
      }

      $('myApplicationsList').innerHTML = applications
        .map((app) => {
          const canWithdraw = !['Withdrawn', 'Rejected'].includes(app.status);
          const timelineHtml = (app.statusHistory || [])
            .map(
              (h) => `
              <div class="timeline-step">
                <strong>${esc(h.status)}</strong> — ${esc(h.note || '')} <span>(${formatDate(h.changedAt)})</span>
              </div>
            `
            )
            .join('');

          return `
            <div class="list-item">
              <div style="flex:1;">
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                  <strong>${esc(app.job?.title || 'Job Removed')}</strong>
                  <span class="status-badge status-${esc(app.status)}">${esc(app.status)}</span>
                </div>
                <div class="muted">${esc(app.company?.name || '')} • ${esc(app.job?.location || '')} • Applied ${formatDate(app.createdAt)}</div>
                ${
                  app.interviewDate
                    ? `<div class="muted" style="color:var(--sakura-dark); font-weight:700; margin-top:4px;">Interview Scheduled: ${formatDate(app.interviewDate)}</div>`
                    : ''
                }
                <div class="timeline">${timelineHtml}</div>
              </div>
              <div>
                ${
                  canWithdraw
                    ? `<button class="btn btn-danger btn-sm" data-withdraw-app="${app._id}">Withdraw</button>`
                    : ''
                }
              </div>
            </div>
          `;
        })
        .join('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const loadSavedJobs = async () => {
    try {
      const res = await api('/saved-jobs?limit=50');
      const { savedJobs } = res.data;

      if (!savedJobs.length) {
        $('savedJobsList').innerHTML =
          '<div class="empty-state">No saved jobs yet. Click "View & Apply" on any job to bookmark it.</div>';
        return;
      }

      $('savedJobsList').innerHTML = savedJobs
        .filter((s) => s.job)
        .map(
          (s) => `
          <article class="job-card">
            <div>
              <h3 class="job-title">${esc(s.job.title)}</h3>
              <div class="company-line">${esc(s.job.company?.name || '')} • 📍 ${esc(s.job.location)}</div>
            </div>
            <div class="job-card-footer">
              <button class="btn btn-pink btn-sm" data-open-job="${s.job._id}">View &amp; Apply</button>
              <button class="btn btn-danger btn-sm" data-unsave-job="${s.job._id}">Remove</button>
            </div>
          </article>
        `
        )
        .join('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const loadMySeekerProfile = async () => {
    try {
      const res = await api('/profiles/me');
      const p = res.data.profile;
      state.seekerProfile = p;

      $('profHeadline').value = p.headline || '';
      $('profBio').value = p.bio || '';
      $('profLocation').value = p.location || '';
      $('profExpYears').value = p.experienceYears ?? 0;
      $('profSkills').value = (p.skills || []).join(', ');
      $('profResumeUrl').value = p.resumeUrl || '';
      $('profPortfolio').value = p.portfolioUrl || '';
      $('profLinkedin').value = p.linkedinUrl || '';

      $('currentResumeInfo').innerHTML = p.resumeUrl
        ? `Current Resume: <a href="${esc(p.resumeUrl)}" target="_blank" rel="noopener">${esc(p.resumeFile?.originalName || p.resumeUrl)}</a>`
        : 'No resume uploaded or linked yet.';
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ---------- EMPLOYER DASHBOARD ----------
  const loadEmployerDashboard = async () => {
    await Promise.all([loadEmployerJobs(), loadMyCompanyForm()]);
  };

  const loadEmployerJobs = async () => {
    try {
      const res = await api('/jobs/my-jobs?limit=50');
      const { jobs } = res.data;

      if (!jobs.length) {
        $('employerJobsList').innerHTML =
          '<div class="empty-state">You have not posted any jobs yet. Use "Post a New Job" to publish your first PHP (₱) listing.</div>';
        return;
      }

      $('employerJobsList').innerHTML = jobs
        .map((job) => {
          const currency = job.salary?.currency || 'PHP';
          return `
            <div class="list-item">
              <div>
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                  <strong>${esc(job.title)}</strong>
                  <span class="status-badge status-${esc(job.status)}">${esc(job.status)}</span>
                </div>
                <div class="muted">📍 ${esc(job.location)} • ${esc(job.type)} • ${formatMoney(job.salary?.min, currency)}–${formatMoney(job.salary?.max, currency)} • <strong>${job.applicantsCount || 0} applicant(s)</strong></div>
              </div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn btn-pink btn-sm" data-view-applicants="${job._id}">Applicants (${job.applicantsCount || 0})</button>
                <button class="btn btn-ghost btn-sm" data-toggle-job-status="${job._id}" data-next-status="${job.status === 'open' ? 'closed' : 'open'}">
                  ${job.status === 'open' ? 'Close Job' : 'Reopen Job'}
                </button>
                <button class="btn btn-danger btn-sm" data-delete-job="${job._id}">Delete</button>
              </div>
            </div>
          `;
        })
        .join('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const loadMyCompanyForm = async () => {
    try {
      const res = await api('/companies/me');
      const c = res.data.company;
      state.companyProfile = c;

      $('compName').value = c.name || '';
      $('compIndustry').value = c.industry || '';
      $('compLocation').value = c.location || '';
      $('compSize').value = c.size || '11-50';
      $('compWebsite').value = c.website || '';
      $('compEmail').value = c.contactEmail || '';
      $('compDescription').value = c.description || '';
    } catch (err) {
      // Expected if new employer hasn't created company profile yet
    }
  };

  const openApplicantsModal = async (jobId) => {
    state.activeApplicantsJobId = jobId;
    try {
      const res = await api(`/jobs/${jobId}/applications?limit=50`);
      const { job, statusSummary, applicants } = res.data;

      $('applicantsModalTitle').textContent = `Applicants — ${job.title}`;
      const summaryParts = Object.entries(statusSummary || {}).map(([k, v]) => `${k}: ${v}`);
      $('applicantsModalSummary').textContent = summaryParts.length
        ? summaryParts.join(' • ')
        : 'No applications yet';

      if (!applicants.length) {
        $('applicantsModalBody').innerHTML =
          '<div class="empty-state">No candidates have applied to this job yet.</div>';
        openModal('applicantsModal');
        return;
      }

      $('applicantsModalBody').innerHTML = applicants
        .map((app) => {
          const allowed = ALLOWED_TRANSITIONS[app.status] || [];
          const skills = (app.seekerProfile?.skills || [])
            .map((s) => `<span class="pill pill-skill">${esc(s)}</span>`)
            .join('');

          const controls = allowed.length
            ? `
              <form class="ats-controls" data-update-status-form="${app._id}">
                <select name="status" required>
                  ${allowed.map((st) => `<option value="${st}">Move to: ${st}</option>`).join('')}
                </select>
                <input type="text" name="note" placeholder="Optional note for timeline..." />
                <button type="submit" class="btn btn-pink btn-sm">Update Status</button>
              </form>
            `
            : `<div class="muted" style="margin-top:8px;">No further status transitions available (${esc(app.status)}).</div>`;

          return `
            <div class="applicant-card">
              <div class="job-card-top">
                <div>
                  <strong>${esc(app.applicant?.name || 'Candidate')}</strong>
                  <span class="muted">(${esc(app.applicant?.email || '')})</span>
                  <div class="muted">${esc(app.seekerProfile?.headline || '')} • Applied ${formatDate(app.createdAt)}</div>
                </div>
                <span class="status-badge status-${esc(app.status)}">${esc(app.status)}</span>
              </div>
              ${skills ? `<div class="skills-wrap" style="margin:8px 0;">${skills}</div>` : ''}
              ${app.coverLetter ? `<p style="margin:6px 0; font-size:0.88rem;">"${esc(app.coverLetter)}"</p>` : ''}
              <div class="muted">
                Resume: <a href="${esc(app.resumeUrl)}" target="_blank" rel="noopener">${esc(app.resumeUrl)}</a>
              </div>
              ${controls}
            </div>
          `;
        })
        .join('');

      openModal('applicantsModal');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ---------- ADMIN PANEL ----------
  const loadAdminDashboard = async () => {
    try {
      const [statsRes, usersRes, companiesRes] = await Promise.all([
        api('/admin/stats'),
        api('/admin/users?limit=50'),
        api('/companies?limit=50'),
      ]);

      const stats = statsRes.data;
      $('adminStatsGrid').innerHTML = `
        <div class="metric-card">
          <div class="metric-label">Total Users</div>
          <div class="metric-value">${stats.users.total}</div>
          <div class="metric-sub">Seekers: ${stats.users.byRole.job_seeker || 0} • Employers: ${stats.users.byRole.employer || 0}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Companies</div>
          <div class="metric-value">${stats.companies.total}</div>
          <div class="metric-sub">Verified: ${stats.companies.verified}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Job Postings</div>
          <div class="metric-value">${stats.jobs.total}</div>
          <div class="metric-sub">Open: ${stats.jobs.byStatus.open || 0} • Closed: ${stats.jobs.byStatus.closed || 0}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Applications</div>
          <div class="metric-value">${stats.applications.total}</div>
          <div class="metric-sub">Offers: ${stats.applications.byStatus.Offer || 0} • Interviews: ${stats.applications.byStatus.Interview || 0}</div>
        </div>
      `;

      const skills = stats.topInDemandSkills || [];
      const maxCount = skills.length ? Math.max(...skills.map((s) => s.count)) : 1;
      $('adminTopSkills').innerHTML = skills.length
        ? skills
            .map(
              (s) => `
              <div class="skill-bar-row">
                <div class="skill-bar-head"><span>${esc(s.skill)}</span><span>${s.count} job(s)</span></div>
                <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${Math.round((s.count / maxCount) * 100)}%"></div></div>
              </div>
            `
            )
            .join('')
        : '<div class="muted">No open job skill data yet.</div>';

      $('adminCompaniesList').innerHTML = companiesRes.data.companies
        .map(
          (c) => `
          <div class="list-item">
            <div>
              <strong>${esc(c.name)}</strong>
              <div class="muted">${esc(c.industry)} • ${esc(c.location)}</div>
            </div>
            <button class="btn ${c.isVerified ? 'btn-ghost' : 'btn-success'} btn-sm" data-verify-company="${c._id}" data-next-verify="${!c.isVerified}">
              ${c.isVerified ? 'Unverify' : 'Verify Company'}
            </button>
          </div>
        `
        )
        .join('');

      $('adminUsersBody').innerHTML = usersRes.data.users
        .map(
          (u) => `
          <tr>
            <td><strong>${esc(u.name)}</strong></td>
            <td>${esc(u.email)}</td>
            <td><span class="pill">${esc(u.role)}</span></td>
            <td>${
              u.isActive
                ? '<span class="verified-badge">Active</span>'
                : '<span class="status-badge status-Rejected">Inactive</span>'
            }</td>
            <td>
              ${
                u._id !== state.user._id
                  ? `<button class="btn ${u.isActive ? 'btn-danger' : 'btn-success'} btn-xs" data-toggle-user="${u._id}" data-next-active="${!u.isActive}">
                      ${u.isActive ? 'Deactivate' : 'Activate'}
                    </button>`
                  : '<span class="muted">Current Admin</span>'
              }
            </td>
          </tr>
        `
        )
        .join('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ---------- AUTH HANDLER ----------
  const handleAuthSuccess = async (token, msg) => {
    state.token = token;
    localStorage.setItem('jp_token', token);
    await loadCurrentUser();
    showToast(msg, 'success');

    if (state.user?.role === 'employer') switchView('employer');
    else if (state.user?.role === 'admin') switchView('admin');
    else switchView('jobs');
  };

  // ---------- EVENT LISTENERS ----------
  const bindEvents = () => {
    $('brandHome').addEventListener('click', () => {
      state.companyFilterId = '';
      switchView(state.user ? 'jobs' : 'auth');
    });

    $('navTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-tab');
      if (btn) {
        state.companyFilterId = '';
        switchView(btn.dataset.view);
      }
    });

    // Sub-tabs delegation
    document.querySelectorAll('.sub-tabs').forEach((group) => {
      group.addEventListener('click', (e) => {
        const btn = e.target.closest('.sub-tab');
        if (!btn || !btn.dataset.subtab) return;
        const section = group.closest('.view-section');
        group.querySelectorAll('.sub-tab').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        section.querySelectorAll('.sub-panel').forEach((p) => {
          p.classList.toggle('active', p.id === btn.dataset.subtab);
        });
      });
    });

    // Auth page triggers
    $('btnNavSignIn').addEventListener('click', () => {
      setAuthMode('login');
      switchView('auth');
    });
    $('btnNavRegister').addEventListener('click', () => {
      setAuthMode('register');
      switchView('auth');
    });
    $('switchLogin').addEventListener('click', () => setAuthMode('login'));
    $('switchRegister').addEventListener('click', () => setAuthMode('register'));

    $('btnLogout').addEventListener('click', () => {
      state.token = '';
      state.user = null;
      state.seekerProfile = null;
      state.companyProfile = null;
      state.companyFilterId = '';
      localStorage.removeItem('jp_token');
      updateAuthUI();
      setAuthMode('login');
      switchView('auth');
      showToast('Signed out. Sign back in anytime to browse jobs.');
    });

    // Close modal buttons & backdrop click
    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('[data-close-modal]');
      if (closeBtn) closeModal(closeBtn.dataset.closeModal);
      if (e.target.classList.contains('modal-backdrop')) {
        e.target.classList.add('hidden');
      }
    });

    // Demo login quick buttons
    document.querySelectorAll('[data-demo-email]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          const res = await api('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
              email: btn.dataset.demoEmail,
              password: btn.dataset.demoPass,
            }),
          });
          await handleAuthSuccess(res.data.token, `Welcome aboard, ${res.data.user.name}!`);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // Login form
    $('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const res = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: $('loginEmail').value.trim(),
            password: $('loginPassword').value,
          }),
        });
        await handleAuthSuccess(res.data.token, `Welcome back, ${res.data.user.name}!`);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Register form
    $('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const res = await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: $('regName').value.trim(),
            email: $('regEmail').value.trim(),
            password: $('regPassword').value,
            role: $('regRole').value,
          }),
        });
        await handleAuthSuccess(res.data.token, `Account created! Welcome aboard, ${res.data.user.name}.`);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Contact form
    $('contactForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const sender = $('contactName').value.trim();
      const feedback = $('contactFeedback');
      feedback.textContent = `Salamat, ${sender}! Your message has been received by the JobHunters PH support crew. We'll respond within 1 business day.`;
      feedback.classList.remove('hidden');
      showToast('Message sent to JobHunters PH support!', 'success');
      $('contactForm').reset();
    });

    // Job search form
    $('jobFilterForm').addEventListener('submit', (e) => {
      e.preventDefault();
      loadJobs(1);
    });

    $('btnResetFilters').addEventListener('click', () => {
      $('jobFilterForm').reset();
      state.companyFilterId = '';
      loadJobs(1);
    });

    // Seeker profile save
    $('seekerProfileForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const skills = $('profSkills')
          .value.split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        await api('/profiles/me', {
          method: 'PUT',
          body: JSON.stringify({
            headline: $('profHeadline').value.trim(),
            bio: $('profBio').value.trim(),
            location: $('profLocation').value.trim(),
            experienceYears: Number($('profExpYears').value || 0),
            skills,
            resumeUrl: $('profResumeUrl').value.trim(),
            portfolioUrl: $('profPortfolio').value.trim(),
            linkedinUrl: $('profLinkedin').value.trim(),
          }),
        });
        showToast('Candidate profile updated!', 'success');
        loadMySeekerProfile();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Resume file upload
    $('resumeUploadForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = $('resumeFileInput').files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('resume', file);
      try {
        await api('/profiles/me/resume', { method: 'POST', body: fd });
        showToast('Resume uploaded successfully!', 'success');
        $('resumeUploadForm').reset();
        loadMySeekerProfile();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Company profile save
    $('companyProfileForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/companies/me', {
          method: 'PUT',
          body: JSON.stringify({
            name: $('compName').value.trim(),
            industry: $('compIndustry').value.trim(),
            location: $('compLocation').value.trim(),
            size: $('compSize').value,
            website: $('compWebsite').value.trim(),
            contactEmail: $('compEmail').value.trim(),
            description: $('compDescription').value.trim(),
          }),
        });
        showToast('Company profile saved!', 'success');
        loadCompanies();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Create Job form (PHP currency)
    $('createJobForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const skills = $('jobSkills')
          .value.split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const requirements = $('jobRequirements')
          .value.split('\n')
          .map((r) => r.trim())
          .filter(Boolean);

        const payload = {
          title: $('jobTitle').value.trim(),
          location: $('jobLocation').value.trim(),
          type: $('jobType').value,
          workMode: $('jobWorkMode').value,
          experienceLevel: $('jobExpLevel').value,
          salary: {
            min: Number($('jobSalaryMin').value),
            max: Number($('jobSalaryMax').value),
            currency: 'PHP',
          },
          skills,
          description: $('jobDescription').value.trim(),
          requirements,
        };
        if ($('jobDeadline').value) {
          payload.applicationDeadline = new Date($('jobDeadline').value).toISOString();
        }

        await api('/jobs', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Job posting published in PHP (₱)!', 'success');
        $('createJobForm').reset();
        await loadEmployerJobs();
        document.querySelector('[data-subtab="emp-jobs"]').click();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Dynamic button delegation across views & modals
    document.addEventListener('click', async (e) => {
      const gotoBtn = e.target.closest('[data-goto-view]');
      if (gotoBtn) {
        if (gotoBtn.dataset.gotoView === 'auth') setAuthMode('login');
        switchView(gotoBtn.dataset.gotoView);
        return;
      }

      const openJobBtn = e.target.closest('[data-open-job]');
      if (openJobBtn) return openJobDetail(openJobBtn.dataset.openJob);

      const filterCompBtn = e.target.closest('[data-filter-company]');
      if (filterCompBtn) {
        state.companyFilterId = filterCompBtn.dataset.filterCompany;
        switchView('jobs');
        return;
      }

      const withdrawBtn = e.target.closest('[data-withdraw-app]');
      if (withdrawBtn) {
        try {
          await api(`/applications/${withdrawBtn.dataset.withdrawApp}/withdraw`, {
            method: 'PATCH',
            body: JSON.stringify({ note: 'Withdrawn via JobHunters portal' }),
          });
          showToast('Application withdrawn.', 'success');
          loadMyApplications();
        } catch (err) {
          showToast(err.message, 'error');
        }
        return;
      }

      const unsaveBtn = e.target.closest('[data-unsave-job]');
      if (unsaveBtn) {
        try {
          await api(`/saved-jobs/${unsaveBtn.dataset.unsaveJob}`, { method: 'DELETE' });
          showToast('Removed from saved jobs.');
          loadSavedJobs();
        } catch (err) {
          showToast(err.message, 'error');
        }
        return;
      }

      const viewAppsBtn = e.target.closest('[data-view-applicants]');
      if (viewAppsBtn) return openApplicantsModal(viewAppsBtn.dataset.viewApplicants);

      const toggleJobBtn = e.target.closest('[data-toggle-job-status]');
      if (toggleJobBtn) {
        try {
          await api(`/jobs/${toggleJobBtn.dataset.toggleJobStatus}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: toggleJobBtn.dataset.nextStatus }),
          });
          showToast(`Job status updated to ${toggleJobBtn.dataset.nextStatus}.`, 'success');
          loadEmployerJobs();
        } catch (err) {
          showToast(err.message, 'error');
        }
        return;
      }

      const deleteJobBtn = e.target.closest('[data-delete-job]');
      if (deleteJobBtn) {
        try {
          await api(`/jobs/${deleteJobBtn.dataset.deleteJob}`, { method: 'DELETE' });
          showToast('Job posting deleted.', 'success');
          loadEmployerJobs();
        } catch (err) {
          showToast(err.message, 'error');
        }
        return;
      }

      const verifyBtn = e.target.closest('[data-verify-company]');
      if (verifyBtn) {
        try {
          const isVerified = verifyBtn.dataset.nextVerify === 'true';
          await api(`/admin/companies/${verifyBtn.dataset.verifyCompany}/verify`, {
            method: 'PATCH',
            body: JSON.stringify({ isVerified }),
          });
          showToast(`Company ${isVerified ? 'verified' : 'unverified'}.`, 'success');
          loadAdminDashboard();
        } catch (err) {
          showToast(err.message, 'error');
        }
        return;
      }

      const toggleUserBtn = e.target.closest('[data-toggle-user]');
      if (toggleUserBtn) {
        try {
          const isActive = toggleUserBtn.dataset.nextActive === 'true';
          await api(`/admin/users/${toggleUserBtn.dataset.toggleUser}`, {
            method: 'PATCH',
            body: JSON.stringify({ isActive }),
          });
          showToast(`User account ${isActive ? 'activated' : 'deactivated'}.`, 'success');
          loadAdminDashboard();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });

    // Delegate ATS status update forms inside Applicants modal
    document.addEventListener('submit', async (e) => {
      const statusForm = e.target.closest('[data-update-status-form]');
      if (!statusForm) return;
      e.preventDefault();
      const appId = statusForm.dataset.updateStatusForm;
      const status = statusForm.querySelector('[name="status"]').value;
      const note = statusForm.querySelector('[name="note"]').value.trim();

      try {
        await api(`/applications/${appId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, note }),
        });
        showToast(`Applicant moved to ${status}!`, 'success');
        if (state.activeApplicantsJobId) {
          openApplicantsModal(state.activeApplicantsJobId);
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  };

  // Init: start on Login index if logged out, or Browse Jobs if already authenticated
  const init = async () => {
    bindEvents();
    await loadCurrentUser();
    await loadCompanies();
    switchView(state.user ? 'jobs' : 'auth');
  };

  init();
})();
