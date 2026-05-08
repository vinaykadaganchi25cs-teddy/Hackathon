/* ========================================
   Active Pulse — App Controller
   Navigation, initialization, coordination
   ======================================== */

window.ActivePulse = window.ActivePulse || {};

window.ActivePulse.App = {
  currentSection: 'hero',
  monitoringActive: false,

  init() {
    const DM = window.ActivePulse.DataManager;
    const SM = window.ActivePulse.SensorManager;
    const RE = window.ActivePulse.RiskEngine;
    const AE = window.ActivePulse.AnalyticsEngine;
    const RW = window.ActivePulse.Rewards;

    // Init all modules
    DM.init();
    SM.init();
    RE.init();
    AE.init();
    if (RW) RW.init();

    // Check login
    this.checkLogin();

    // Setup navigation
    this.setupNav();

    // Setup hero stats
    this.populateHeroStats();

    // Setup monitor controls
    this.setupMonitor();

    // Setup risk questionnaire
    this.setupQuestionnaire();

    // Mobile menu toggle
    const toggle = document.getElementById('mobile-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
      });
    }

    // Navigate to hash or hero
    const hash = window.location.hash.slice(1);
    if (hash && document.getElementById(hash)) {
      this.navigateTo(hash);
    }
  },

  // === LOGIN ===
  checkLogin() {
    const saved = localStorage.getItem('activepulse_profile');
    const loginScreen = document.getElementById('login-screen');
    if (saved) {
      try {
        const profile = JSON.parse(saved);
      this.setLoggedIn(profile);
        this.setupLogout(); // FIX: Must bind logout AFTER login too
        if (loginScreen) loginScreen.classList.add('hidden-login');
      } catch(e) {
        localStorage.removeItem('activepulse_profile');
      }
      return;
    }

    // === LOGIN TAB SWITCHING ===
    const tabEmail = document.getElementById('tab-email');
    const tabGoogle = document.getElementById('tab-google');
    const formEmail = document.getElementById('login-form-email');
    const formGoogle = document.getElementById('login-form-google');

    if (tabEmail) tabEmail.addEventListener('click', () => {
      tabEmail.classList.add('active'); tabGoogle.classList.remove('active');
      formEmail.classList.remove('hidden'); formGoogle.classList.add('hidden');
    });
    if (tabGoogle) tabGoogle.addEventListener('click', () => {
      tabGoogle.classList.add('active'); tabEmail.classList.remove('active');
      formGoogle.classList.remove('hidden'); formEmail.classList.add('hidden');
    });

    const loader = document.getElementById('login-loader');

    // === EMAIL/PASSWORD LOGIN ===
    const emailBtn = document.getElementById('btn-email-login');
    if (emailBtn) emailBtn.addEventListener('click', () => {
      const name = document.getElementById('login-name')?.value.trim() || 'User';
      const email = document.getElementById('login-email')?.value.trim() || '';
      const pass = document.getElementById('login-password')?.value || '';
      if (!name) return;
      this._animateLogin(loginScreen, loader, formEmail, { name, email, method: 'email' });
    });

    // === GOOGLE LOGIN ===
    const googleBtn = document.getElementById('btn-google-login');
    if (googleBtn) googleBtn.addEventListener('click', () => {
      const name = document.getElementById('login-name-google')?.value.trim() || 'User';
      this._animateLogin(loginScreen, loader, formGoogle, { name, email: name.toLowerCase().replace(/\s/g,'.') + '@gmail.com', method: 'google' });
    });

    // === LOGOUT HANDLERS ===
    this.setupLogout();
  },

  _animateLogin(loginScreen, loader, form, profile) {
    if (form) form.style.display = 'none';
    const otherForm = form?.id === 'login-form-email' ? document.getElementById('login-form-google') : document.getElementById('login-form-email');
    if (otherForm) otherForm.style.display = 'none';
    const tabs = document.querySelector('.login-tabs');
    if (tabs) tabs.style.display = 'none';
    if (loader) loader.classList.remove('hidden');

    setTimeout(() => {
      profile.joinedAt = new Date().toLocaleDateString();
      profile.pfp = null;
      localStorage.setItem('activepulse_profile', JSON.stringify(profile));
      this.setLoggedIn(profile);
      if (loginScreen) {
        loginScreen.style.opacity = '0';
        loginScreen.style.transition = 'opacity 0.5s ease';
        setTimeout(() => loginScreen.classList.add('hidden-login'), 500);
      }
    }, 1500);
  },

  setLoggedIn(profile) {
    const name = typeof profile === 'string' ? profile : profile.name;
    const email = typeof profile === 'string' ? '' : (profile.email || '');
    const method = typeof profile === 'string' ? 'guest' : (profile.method || 'guest');

    // Sidebar greeting
    const greet = document.getElementById('user-greeting');
    const displayName = document.getElementById('user-display-name');
    const avatar = document.getElementById('user-avatar');
    if (greet) greet.classList.remove('hidden');
    if (displayName) displayName.textContent = name;
    if (avatar) {
      // Check for PFP
      const pfp = typeof profile === 'object' ? profile.pfp : null;
      if (pfp) {
        avatar.innerHTML = `<img src="${pfp}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="pfp">`;
      } else {
        avatar.textContent = name.charAt(0).toUpperCase();
      }
    }

    // Profile page
    const pfpInitial = document.getElementById('profile-pic-initial');
    const pfpImg = document.getElementById('profile-pic-img');
    const profileName = document.getElementById('profile-name-display');
    const profileEmail = document.getElementById('profile-email-display');
    const profileMethod = document.getElementById('profile-method-display');
    const profileJoined = document.getElementById('profile-joined');

    if (profileName) profileName.textContent = name;
    if (profileEmail) profileEmail.textContent = email || 'No email set';
    const methodLabels = { email: '📧 Signed in with Email', google: '🔵 Signed in with Google', guest: '👤 Signed in as Guest' };
    if (profileMethod) profileMethod.textContent = methodLabels[method] || methodLabels.guest;
    if (profileJoined && typeof profile === 'object') profileJoined.textContent = profile.joinedAt || 'Today';

    const pfp = typeof profile === 'object' ? profile.pfp : null;
    if (pfp && pfpImg) {
      pfpImg.src = pfp;
      pfpImg.classList.remove('hidden');
      if (pfpInitial) pfpInitial.style.display = 'none';
    } else {
      if (pfpInitial) { pfpInitial.style.display = ''; pfpInitial.textContent = name.charAt(0).toUpperCase(); }
      if (pfpImg) pfpImg.classList.add('hidden');
    }

    // Update profile stats
    const RW = window.ActivePulse.Rewards;
    if (RW) {
      const ptasks = document.getElementById('profile-tasks');
      const pcoupons = document.getElementById('profile-coupons');
      const ppoints = document.getElementById('profile-points');
      if (ptasks) ptasks.textContent = RW.getCompletedCount();
      if (pcoupons) pcoupons.textContent = RW.earnedCoupons.length;
      if (ppoints) ppoints.textContent = RW.totalPoints;
    }

    // Setup profile handlers
    this.setupProfile();
  },

  setupProfile() {
    // PFP Upload
    const pfpInput = document.getElementById('pfp-upload');
    if (pfpInput && !pfpInput._bound) {
      pfpInput._bound = true;
      pfpInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target.result;
          const saved = JSON.parse(localStorage.getItem('activepulse_profile') || '{}');
          saved.pfp = dataUrl;
          localStorage.setItem('activepulse_profile', JSON.stringify(saved));
          this.setLoggedIn(saved);
        };
        reader.readAsDataURL(file);
      });
    }

    // Save profile edits
    const saveBtn = document.getElementById('btn-save-profile');
    if (saveBtn && !saveBtn._bound) {
      saveBtn._bound = true;
      saveBtn.addEventListener('click', () => {
        const saved = JSON.parse(localStorage.getItem('activepulse_profile') || '{}');
        const newName = document.getElementById('edit-name')?.value.trim();
        const newEmail = document.getElementById('edit-email')?.value.trim();
        if (newName) saved.name = newName;
        if (newEmail) saved.email = newEmail;
        localStorage.setItem('activepulse_profile', JSON.stringify(saved));
        this.setLoggedIn(saved);
        saveBtn.textContent = '✅ Saved!';
        saveBtn.style.background = 'var(--success)';
        setTimeout(() => { saveBtn.textContent = '💾 Save Changes'; saveBtn.style.background = ''; }, 1500);
        // Clear inputs
        const nameInput = document.getElementById('edit-name');
        const emailInput = document.getElementById('edit-email');
        if (nameInput) nameInput.value = '';
        if (emailInput) emailInput.value = '';
      });
    }

    // Profile menu navigation
    document.querySelectorAll('.profile-menu-item[data-section]').forEach(item => {
      if (!item._bound) {
        item._bound = true;
        item.addEventListener('click', () => {
          const section = item.dataset.section;
          const navItem = document.querySelector(`.nav-item[data-section="${section}"]`);
          if (navItem) navItem.click();
        });
      }
    });

    // Render profile coupons list
    this.renderProfileCoupons();
  },

  renderProfileCoupons() {
    const RW = window.ActivePulse.Rewards;
    const container = document.getElementById('profile-coupons-list');
    if (!container || !RW) return;
    if (RW.earnedCoupons.length === 0) {
      container.innerHTML = '<p style="color:var(--text3);font-size:.85rem;">Complete tasks to earn coupons!</p>';
      return;
    }
    container.innerHTML = RW.earnedCoupons.slice(-5).reverse().map(c => `
      <div style="display:flex;align-items:center;gap:.75rem;padding:.6rem 0;border-bottom:1px solid var(--border);">
        <span style="font-size:1.3rem;">${c.emoji || '🎉'}</span>
        <div style="flex:1;">
          <strong style="font-size:.85rem;color:var(--success);letter-spacing:.5px;">${c.code}</strong>
          <p style="font-size:.72rem;color:var(--text3);">${c.reward}</p>
        </div>
        <span style="font-size:.65rem;padding:.2rem .5rem;border-radius:8px;background:${c.rarity==='legendary'?'rgba(245,158,11,.15)':c.rarity==='rare'?'rgba(139,92,246,.15)':'rgba(16,185,129,.15)'};color:${c.rarity==='legendary'?'var(--warning)':c.rarity==='rare'?'var(--primary-light)':'var(--success)'};font-weight:600;">${c.rarity.toUpperCase()}</span>
      </div>
    `).join('');
  },

  setupLogout() {
    const doLogout = () => {
      localStorage.removeItem('activepulse_profile');
      localStorage.removeItem('activepulse_user');
      localStorage.removeItem('activepulse_rewards_v2');
      window.location.reload();
    };
    const logoutBtn = document.getElementById('btn-logout');
    const profileLogoutBtn = document.getElementById('btn-profile-logout');
    if (logoutBtn && !logoutBtn._bound) { logoutBtn._bound = true; logoutBtn.addEventListener('click', doLogout); }
    if (profileLogoutBtn && !profileLogoutBtn._bound) { profileLogoutBtn._bound = true; profileLogoutBtn.addEventListener('click', doLogout); }
  },

  setupNav() {
    const items = document.querySelectorAll('.nav-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const section = item.dataset.section;
        this.navigateTo(section);
        // Close mobile menu
        document.getElementById('sidebar').classList.remove('open');
      });
    });
  },

  navigateTo(sectionId) {
    // Update sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');

    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
    if (navItem) navItem.classList.add('active');

    this.currentSection = sectionId;
    window.location.hash = sectionId;

    // Section-specific init
    if (sectionId === 'dashboard') {
      this.initDashboard();
    } else if (sectionId === 'monitor') {
      this.initMonitorView();
    } else if (sectionId === 'insights') {
      this.initInsights();
    } else if (sectionId === 'rewards') {
      this.initRewards();
    }
  },

  // === HERO ===
  populateHeroStats() {
    const DM = window.ActivePulse.DataManager;
    const avgs = DM.getWeeklyAverages();
    const today = DM.getToday();

    // Calculate waking sedentary hours (exclude sleep 0-5 AM)
    const wakingSedentary = today.hours.filter(h => h.hour >= 6).reduce((s, h) => s + h.sedentaryMinutes, 0);
    this.animateCounter('stat-sedentary-hours', 0, Math.round(wakingSedentary / 60 * 10) / 10, '', 'h today');
    this.animateCounter('stat-steps', 0, avgs.avgSteps, '', ' avg/day');
    this.animateCounter('stat-score', 0, avgs.avgScore, '', '/100');
    this.animateCounter('stat-streak', 0, Math.round(today.summary.longestSedentaryStreak / 60 * 10) / 10, '', 'h longest');
  },

  animateCounter(id, start, end, prefix, suffix) {
    const el = document.getElementById(id);
    if (!el) return;
    const duration = 1500;
    const startTime = Date.now();
    const isFloat = end % 1 !== 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = start + (end - start) * eased;
      el.textContent = prefix + (isFloat ? current.toFixed(1) : Math.round(current).toLocaleString()) + suffix;
      if (progress < 1) requestAnimationFrame(animate);
    };
    animate();
  },

  // === MONITOR ===
  setupMonitor() {
    const SM = window.ActivePulse.SensorManager;
    const btn = document.getElementById('btn-start-monitor');
    const btnStop = document.getElementById('btn-stop-monitor');

    if (btn) {
      btn.addEventListener('click', () => this.startMonitoring());
    }
    if (btnStop) {
      btnStop.addEventListener('click', () => this.stopMonitoring());
    }

    // Break notification callback
    SM.onBreakNeeded = () => {
      this.showBreakNotification();
    };

    // Data update callback
    SM.onDataUpdate = (point) => {
      this.updateMonitorUI(point);
      window.ActivePulse.AnalyticsEngine.updateRealtimeChart(point);
    };
  },

  initMonitorView() {
    window.ActivePulse.AnalyticsEngine.createRealtimeChart();
    if (window.ActivePulse.CameraAI) window.ActivePulse.CameraAI.init();
  },

  async startMonitoring() {
    const SM = window.ActivePulse.SensorManager;
    const CAM = window.ActivePulse.CameraAI;
    SM.startMonitoring();
    this.monitoringActive = true;

    const btn = document.getElementById('btn-start-monitor');
    const btnStop = document.getElementById('btn-stop-monitor');
    if (btn) btn.classList.add('hidden');
    if (btnStop) btnStop.classList.remove('hidden');

    const statusEl = document.getElementById('monitor-status-badge');
    if (statusEl) statusEl.innerHTML = '<span class="status-dot yellow"></span> Loading AI...';

    // Hide camera placeholder
    const placeholder = document.getElementById('camera-placeholder');
    if (placeholder) placeholder.style.display = 'none';

    // Start camera AI
    if (CAM) {
      await CAM.init();
      await CAM.startCamera();

      // Wire camera callbacks to sensor manager
      CAM.onStandDetected = () => {
        SM.cameraDetectedBreak('Standing detected by AI');
        this._updatePostureUI('standing', 100);
      };
      CAM.onAbsentDetected = () => {
        SM.cameraDetectedBreak('Person left — break taken!');
        this._updatePostureUI('absent', 0);
      };
      CAM.onPostureUpdate = (analysis) => {
        this._updatePostureUI(analysis.isSlouching ? 'slouching' : 'good', analysis.postureScore);
        const scoreEl = document.getElementById('stat-posture-score');
        if (scoreEl) {
          scoreEl.textContent = analysis.postureScore + '/100';
          scoreEl.style.color = analysis.postureScore >= 70 ? 'var(--success)' : 'var(--danger)';
        }
      };
      CAM.onSlouchDetected = (score) => {
        this._updatePostureUI('slouching', score);
      };

      if (statusEl) statusEl.innerHTML = '<span class="status-dot yellow"></span> AI Monitoring';
    }
  },

  _updatePostureUI(status, score) {
    const dot = document.getElementById('posture-dot');
    const label = document.getElementById('posture-label');
    const scoreEl = document.getElementById('posture-score-display');

    if (dot) {
      dot.className = 'posture-dot';
      if (status === 'good') dot.classList.add('good');
      else if (status === 'slouching') dot.classList.add('bad');
      else if (status === 'standing') dot.classList.add('good');
      else if (status === 'absent') dot.classList.add('warning');
    }
    if (label) {
      const labels = {
        good: '✅ Good Posture — Keep it up!',
        slouching: '⚠️ Slouching Detected — Sit up straight!',
        standing: '🧍 Standing — Break counted!',
        absent: '👤 Person not detected — Did you walk away?'
      };
      label.textContent = labels[status] || 'Analyzing...';
    }
    if (scoreEl) scoreEl.textContent = score + '/100';
  },

  stopMonitoring() {
    const SM = window.ActivePulse.SensorManager;
    const CAM = window.ActivePulse.CameraAI;
    SM.stopMonitoring();
    if (CAM) CAM.stopCamera();
    this.monitoringActive = false;

    const btn = document.getElementById('btn-start-monitor');
    const btnStop = document.getElementById('btn-stop-monitor');
    if (btn) btn.classList.remove('hidden');
    if (btnStop) btnStop.classList.add('hidden');

    const placeholder = document.getElementById('camera-placeholder');
    if (placeholder) placeholder.style.display = '';

    const statusEl = document.getElementById('monitor-status-badge');
    if (statusEl) {
      statusEl.className = 'status-badge';
      statusEl.innerHTML = '<span class="status-dot"></span> Stopped';
    }
  },

  updateMonitorUI(point) {
    const SM = window.ActivePulse.SensorManager;

    // Status badge — always shows sedentary (camera handles breaks)
    const statusEl = document.getElementById('monitor-status-badge');
    if (statusEl) {
      statusEl.className = 'status-badge sedentary';
      statusEl.innerHTML = '<span class="status-dot red"></span> Sedentary (Sitting)';
    }

    // Sedentary timer (continuous, never resets from keyboard/mouse)
    const timerEl = document.getElementById('sedentary-timer');
    if (timerEl) {
      timerEl.textContent = SM.formatTime(SM.consecutiveSedentary);
      timerEl.className = 'big-timer';
      if (SM.consecutiveSedentary > 2700) timerEl.classList.add('danger');
      else if (SM.consecutiveSedentary > 1800) timerEl.classList.add('warning');
    }

    // Input activity meter (for chart visualization only)
    const fillEl = document.getElementById('intensity-fill');
    if (fillEl) {
      const pct = Math.min(100, (point.magnitude / 4) * 100);
      fillEl.style.width = pct + '%';
    }

    // Session stats
    const stats = SM.getSessionStats();
    const el = (id) => document.getElementById(id);
    if (el('stat-session-duration')) el('stat-session-duration').textContent = SM.formatTime(stats.totalSeconds);
    if (el('stat-session-sedentary')) el('stat-session-sedentary').textContent = SM.formatTime(stats.sedentarySeconds);
    if (el('stat-session-breaks')) el('stat-session-breaks').textContent = stats.breaksTaken;
  },

  // === BREAK NOTIFICATION ===
  showBreakNotification() {
    const modal = document.getElementById('break-notification');
    if (modal) modal.classList.add('visible');

    // Play notification sound (browser API)
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 520;
      osc.type = 'sine';
      gain.gain.value = 0.3;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);
      osc.stop(audioCtx.currentTime + 1);
    } catch(e) { /* no audio */ }
  },

  hideBreakNotification() {
    const modal = document.getElementById('break-notification');
    if (modal) modal.classList.remove('visible');
    window.ActivePulse.SensorManager.resetBreakTimer();
  },

  snoozeBreak() {
    this.hideBreakNotification();
    // Timer will naturally restart since we reset sedentarySeconds
  },

  // === DASHBOARD ===
  initDashboard() {
    const DM = window.ActivePulse.DataManager;
    const AE = window.ActivePulse.AnalyticsEngine;
    AE.createDashboardCharts(DM);

    // Update summary cards
    const today = DM.getToday();
    const avgs = DM.getWeeklyAverages();
    const el = (id) => document.getElementById(id);

    // Calculate waking sedentary (exclude sleep)
    const wakingSed = today.hours.filter(h => h.hour >= 6).reduce((s, h) => s + h.sedentaryMinutes, 0);
    if (el('dash-score')) el('dash-score').textContent = today.summary.movementScore;
    if (el('dash-steps')) el('dash-steps').textContent = today.summary.totalSteps.toLocaleString();
    if (el('dash-sedentary')) el('dash-sedentary').textContent = (wakingSed / 60).toFixed(1) + 'h';
    if (el('dash-active')) el('dash-active').textContent = (today.summary.totalActiveMinutes / 60).toFixed(1) + 'h';
    if (el('dash-calories')) el('dash-calories').textContent = today.summary.calories;
    if (el('dash-avg-score')) el('dash-avg-score').textContent = 'Week avg: ' + avgs.avgScore;
  },

  // === RISK QUESTIONNAIRE ===
  currentQuestion: 0,

  setupQuestionnaire() {
    const RE = window.ActivePulse.RiskEngine;
    this.currentQuestion = 0;
    this.renderQuestion();

    const nextBtn = document.getElementById('btn-next-question');
    const prevBtn = document.getElementById('btn-prev-question');
    const submitBtn = document.getElementById('btn-submit-risk');

    if (nextBtn) nextBtn.addEventListener('click', () => this.nextQuestion());
    if (prevBtn) prevBtn.addEventListener('click', () => this.prevQuestion());
    if (submitBtn) submitBtn.addEventListener('click', () => this.submitRisk());
    
    const retakeBtn = document.getElementById('btn-retake');
    if (retakeBtn) retakeBtn.addEventListener('click', () => this.retakeQuiz());
  },

  renderQuestion() {
    const RE = window.ActivePulse.RiskEngine;
    const questions = RE.getQuestions();
    const q = questions[this.currentQuestion];
    const container = document.getElementById('question-container');
    if (!container || !q) return;

    // Progress
    const progress = document.getElementById('questionnaire-progress');
    if (progress) progress.style.width = ((this.currentQuestion + 1) / questions.length * 100) + '%';

    const questionNum = document.getElementById('question-number');
    if (questionNum) questionNum.textContent = `Question ${this.currentQuestion + 1} of ${questions.length}`;

    container.innerHTML = `
      <div class="question-card">
        <div class="question-number">${q.category}</div>
        <div class="question-text">${q.text}</div>
        <ul class="options-list" id="options-list">
          ${q.options.map((opt, i) => `
            <li class="option-item ${RE.answers[q.id] === i ? 'selected' : ''}" data-index="${i}">
              <div class="option-radio"></div>
              <span>${opt.text}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;

    // Bind option clicks
    container.querySelectorAll('.option-item').forEach(item => {
      item.addEventListener('click', () => {
        container.querySelectorAll('.option-item').forEach(o => o.classList.remove('selected'));
        item.classList.add('selected');
        RE.setAnswer(q.id, parseInt(item.dataset.index));
        this.updateQuestionNav();
      });
    });

    this.updateQuestionNav();
  },

  updateQuestionNav() {
    const RE = window.ActivePulse.RiskEngine;
    const questions = RE.getQuestions();
    const prevBtn = document.getElementById('btn-prev-question');
    const nextBtn = document.getElementById('btn-next-question');
    const submitBtn = document.getElementById('btn-submit-risk');

    if (prevBtn) prevBtn.style.display = this.currentQuestion > 0 ? 'inline-flex' : 'none';

    const isLast = this.currentQuestion === questions.length - 1;
    if (nextBtn) nextBtn.style.display = isLast ? 'none' : 'inline-flex';
    if (submitBtn) submitBtn.style.display = (isLast && RE.isComplete()) ? 'inline-flex' : 'none';
  },

  nextQuestion() {
    const RE = window.ActivePulse.RiskEngine;
    const q = RE.getQuestions()[this.currentQuestion];
    if (RE.answers[q.id] === undefined) return; // must answer first
    if (this.currentQuestion < RE.getQuestions().length - 1) {
      this.currentQuestion++;
      this.renderQuestion();
    }
  },

  prevQuestion() {
    if (this.currentQuestion > 0) {
      this.currentQuestion--;
      this.renderQuestion();
    }
  },

  submitRisk() {
    const RE = window.ActivePulse.RiskEngine;
    const AE = window.ActivePulse.AnalyticsEngine;
    if (!RE.isComplete()) return;

    const score = RE.calculateScore();
    const riskLevel = RE.getRiskLevel(score);
    const factors = RE.getFactorBreakdown();
    const radarData = RE.getRadarData();
    const percentile = RE.getPercentile(score);
    const flags = RE.getVulnerabilityFlags();

    // Hide questionnaire, show results
    const qForm = document.getElementById('questionnaire-form');
    const results = document.getElementById('risk-results');
    if (qForm) qForm.classList.add('hidden');
    if (results) results.classList.add('visible');

    // Score gauge
    this.renderGauge(score, riskLevel.color);

    // Risk level badge
    const badge = document.getElementById('risk-level-badge');
    if (badge) {
      badge.className = `risk-level-badge ${riskLevel.class}`;
      badge.textContent = `${riskLevel.level} Risk`;
    }

    const desc = document.getElementById('risk-description');
    if (desc) desc.textContent = riskLevel.desc;

    // Percentile
    const pctEl = document.getElementById('risk-percentile');
    if (pctEl) pctEl.textContent = `You're more active than ${percentile}% of assessed users.`;

    // Factor breakdown
    const factorContainer = document.getElementById('factor-breakdown');
    if (factorContainer) {
      factorContainer.innerHTML = factors.map(f => `
        <div class="factor-bar">
          <span class="factor-label">${f.label}</span>
          <div class="factor-track">
            <div class="factor-fill" style="width:${f.score}%; background:${f.color}"></div>
          </div>
          <span class="factor-value" style="color:${f.color}">${f.score}</span>
        </div>
      `).join('');
    }

    // Radar chart
    AE.createRiskRadar(radarData);

    // Vulnerability flags
    const flagContainer = document.getElementById('vulnerability-flags');
    if (flagContainer) {
      flagContainer.innerHTML = flags.map(f => `
        <div class="insight-card">
          <div class="insight-icon amber">${f.icon}</div>
          <div class="insight-text"><p>${f.text}</p></div>
        </div>
      `).join('');
    }
  },

  renderGauge(score, color) {
    const el = document.getElementById('gauge-value');
    if (el) {
      el.textContent = score;
      el.style.color = color;
    }

    const fill = document.getElementById('gauge-fill');
    if (fill) {
      // SVG arc: 180 degree semi-circle, circumference ~ 157
      const circumference = 157;
      const offset = circumference - (score / 100) * circumference;
      fill.style.strokeDasharray = circumference;
      fill.style.strokeDashoffset = offset;
      fill.style.stroke = color;
    }
  },

  retakeQuiz() {
    const RE = window.ActivePulse.RiskEngine;
    RE.init();
    this.currentQuestion = 0;

    const qForm = document.getElementById('questionnaire-form');
    const results = document.getElementById('risk-results');
    if (qForm) qForm.classList.remove('hidden');
    if (results) results.classList.remove('visible');

    this.renderQuestion();
  },

  // === INSIGHTS ===
  initInsights() {
    const DM = window.ActivePulse.DataManager;
    const AE = window.ActivePulse.AnalyticsEngine;
    const insights = AE.generateInsights(DM);

    const container = document.getElementById('insights-list');
    if (container) {
      container.innerHTML = insights.map(ins => `
        <div class="insight-card">
          <div class="insight-icon ${ins.iconClass}">${ins.icon}</div>
          <div class="insight-text">
            <h3>${ins.title}</h3>
            <p>${ins.text}</p>
          </div>
        </div>
      `).join('');
    }

    // Generate break schedule
    const scheduleContainer = document.getElementById('break-schedule');
    if (scheduleContainer) {
      const breaks = ['09:00','10:00','11:00','12:30','14:00','15:00','16:00','17:30'];
      scheduleContainer.innerHTML = breaks.map(t => `
        <div class="option-item" style="cursor:default">
          <div class="insight-icon green" style="width:32px;height:32px;font-size:0.9rem">🚶</div>
          <span>${t} — 5 minute movement break</span>
        </div>
      `).join('');
    }
  },

  // === REWARDS ===
  initRewards() {
    const RW = window.ActivePulse.Rewards;
    if (!RW) return;
    this.renderTasks();
    this.renderScratchCards();
    this.renderHealthRisks();
    this.renderEarnedCoupons();
    const ptsEl = document.getElementById('total-points');
    if (ptsEl) ptsEl.textContent = RW.totalPoints;
  },

  renderTasks() {
    const RW = window.ActivePulse.Rewards;
    const container = document.getElementById('tasks-list');
    if (!container || !RW) return;
    container.innerHTML = RW.tasks.map(t => `
      <div class="task-item ${t.done ? 'completed' : ''}" data-task="${t.id}">
        <div class="task-check"></div>
        <div class="task-icon">${t.icon}</div>
        <div class="task-info">
          <h4>${t.title}</h4>
          <p>${t.desc}</p>
        </div>
        <div class="task-points">${t.done ? '✅' : '+' + t.points + ' pts'}</div>
      </div>
    `).join('');
    // ALL tasks are clickable (toggle on/off)
    container.querySelectorAll('.task-item').forEach(el => {
      el.addEventListener('click', () => {
        const taskId = el.dataset.task;
        RW.toggleTask(taskId);
        this.initRewards();
      });
    });
  },

  renderScratchCards() {
    const RW = window.ActivePulse.Rewards;
    const container = document.getElementById('scratch-container');
    const countEl = document.getElementById('scratch-count');
    if (!container || !RW) return;
    if (countEl) countEl.textContent = RW.scratchCardsAvailable;
    if (RW.scratchCardsAvailable <= 0) {
      container.innerHTML = '<div class="no-cards">🏆 Complete 2 tasks to earn a scratch card!</div>';
      return;
    }
    container.innerHTML = '';
    for (let i = 0; i < RW.scratchCardsAvailable; i++) {
      const card = document.createElement('div');
      card.className = 'scratch-card';
      card.innerHTML = `
        <div class="scratch-content">
          <div class="coupon-code">???</div>
          <div class="coupon-reward">Tap to reveal!</div>
        </div>
        <div class="scratch-overlay">
          <span>🎁</span>
          <p>Tap to Scratch!</p>
        </div>
      `;
      card.addEventListener('click', () => {
        const coupon = RW.getRandomCoupon();
        if (coupon) {
          const overlay = card.querySelector('.scratch-overlay');
          const content = card.querySelector('.scratch-content');
          overlay.classList.add('revealed');
          card.classList.add('scratched');
          content.innerHTML = `
            <div style="font-size:1.8rem;margin-bottom:.2rem;">${coupon.emoji || '🎉'}</div>
            <div class="coupon-code">${coupon.code}</div>
            <div class="coupon-reward">${coupon.reward}</div>
            <span class="coupon-rarity ${coupon.rarity}">⭐ ${coupon.rarity.toUpperCase()}</span>
          `;
          // 🎉 PARTY BOMB CONFETTI!
          RW.launchConfetti();
          setTimeout(() => {
            this.renderScratchCards();
            this.renderEarnedCoupons();
          }, 800);
        }
      });
      container.appendChild(card);
    }
  },

  renderEarnedCoupons() {
    const RW = window.ActivePulse.Rewards;
    const container = document.getElementById('earned-coupons');
    if (!container || !RW) return;
    if (RW.earnedCoupons.length === 0) {
      container.innerHTML = '<p style="color:var(--text3);font-size:.85rem;">No coupons earned yet</p>';
      return;
    }
    container.innerHTML = RW.earnedCoupons.map(c => `
      <div class="insight-card">
        <div class="insight-icon ${c.rarity === 'legendary' ? 'amber' : c.rarity === 'rare' ? 'purple' : 'green'}">
          ${c.rarity === 'legendary' ? '👑' : c.rarity === 'rare' ? '💎' : '🎫'}
        </div>
        <div class="insight-text">
          <h3 style="color:var(--success);letter-spacing:1px;">${c.code}</h3>
          <p>${c.reward}</p>
        </div>
      </div>
    `).join('');
  },

  renderHealthRisks() {
    const RW = window.ActivePulse.Rewards;
    const container = document.getElementById('health-risks-list');
    if (!container || !RW) return;
    const risks = RW.getHealthRisks();
    container.innerHTML = risks.map(r => `
      <div class="risk-warning-card">
        <div class="risk-warning-header">
          <span>${r.icon}</span>
          <h3>${r.title}</h3>
        </div>
        <p>${r.desc}</p>
        <div class="severity-bar">
          <div class="severity-fill" style="width:${r.severity}%"></div>
        </div>
      </div>
    `).join('');
  }
};

// === BOOT ===
document.addEventListener('DOMContentLoaded', () => {
  // Start particle background
  if (window.ActivePulse.Particles) {
    window.ActivePulse.Particles.init();
  }
  window.ActivePulse.App.init();
});
