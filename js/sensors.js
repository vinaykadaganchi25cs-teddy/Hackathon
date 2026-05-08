/* ========================================
   Active Pulse — Sensor Manager v3
   Sedentary timer: NEVER resets from mouse/keyboard
   Only resets when Camera AI detects standing/absent
   ======================================== */

window.ActivePulse = window.ActivePulse || {};

window.ActivePulse.SensorManager = {
  isMonitoring: false,
  useFallback: true,
  currentMagnitude: 0,

  // === SEDENTARY TIMER (runs continuously, camera-only reset) ===
  sedentarySeconds: 0,        // Total seconds sitting since monitoring started
  consecutiveSedentary: 0,    // Continuous sitting streak (for 60-min alert)
  breaksTaken: 0,
  lastBreakReset: null,

  // === INPUT ACTIVITY (for chart visualization only, does NOT affect timer) ===
  inputActivity: 0,           // Current input activity level (0-5)
  lastInputTime: 0,
  lastMouseX: 0,
  lastMouseY: 0,

  // === Session tracking ===
  sessionStart: null,
  realtimeBuffer: [],
  sedentaryTimer: null,
  dataInterval: null,

  // Callbacks
  onStatusChange: null,
  onDataUpdate: null,
  onBreakNeeded: null,

  BREAK_INTERVAL: 60 * 60, // 60 minutes

  init() {
    // Sensor manager is always desktop-fallback now
    // Camera AI handles the real posture/standing detection
    this.useFallback = true;
  },

  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.sessionStart = Date.now();
    this.sedentarySeconds = 0;
    this.consecutiveSedentary = 0;
    this.breaksTaken = 0;
    this.inputActivity = 0;
    this.lastInputTime = Date.now();
    this.lastBreakReset = Date.now();

    // Setup input listeners (for chart only, NOT for timer)
    this._setupInputListeners();

    // Tick every second
    this.sedentaryTimer = setInterval(() => this._tick(), 1000);
    this.dataInterval = setInterval(() => this._emitData(), 1000);
  },

  stopMonitoring() {
    this.isMonitoring = false;
    this._removeInputListeners();
    clearInterval(this.sedentaryTimer);
    clearInterval(this.dataInterval);
    this.sedentaryTimer = null;
    this.dataInterval = null;
  },

  // === CALLED BY CAMERA AI ONLY ===
  // This is the ONLY way to reset the sedentary timer
  cameraDetectedBreak(reason) {
    if (!this.isMonitoring) return;
    this.breaksTaken++;
    this.consecutiveSedentary = 0;
    this.lastBreakReset = Date.now();
    console.log(`[SensorManager] Break detected by camera: ${reason}`);

    // Notify UI
    if (this.onStatusChange) {
      this.onStatusChange('break', 0);
    }
  },

  // === PRIVATE: Every-second tick ===
  _tick() {
    if (!this.isMonitoring) return;

    // ALWAYS increment sedentary counters
    // Mouse/keyboard does NOT stop this. Only cameraDetectedBreak() can reset it.
    this.sedentarySeconds++;
    this.consecutiveSedentary++;

    // Decay input activity (for chart visualization)
    const idleMs = Date.now() - this.lastInputTime;
    if (idleMs > 1000) {
      this.inputActivity *= 0.9;
      if (this.inputActivity < 0.05) this.inputActivity = 0.02 + Math.random() * 0.03;
    }

    // 60-minute break alert
    if (this.consecutiveSedentary >= this.BREAK_INTERVAL) {
      if (this.onBreakNeeded) this.onBreakNeeded();
      // Don't auto-reset! Only camera can reset.
    }

    // Fire status change
    if (this.onStatusChange) {
      // Status is ALWAYS sedentary (sitting) — input activity is separate
      this.onStatusChange('sedentary', this.inputActivity);
    }
  },

  // === PRIVATE: Emit data for real-time chart ===
  _emitData() {
    if (!this.isMonitoring) return;
    const point = {
      timestamp: Date.now(),
      magnitude: Math.round(this.inputActivity * 100) / 100,
      status: 'sedentary',  // Always sedentary unless camera says otherwise
      sedentarySeconds: this.consecutiveSedentary,
      inputActivity: this.inputActivity
    };
    this.realtimeBuffer.push(point);
    if (this.realtimeBuffer.length > 120) this.realtimeBuffer.shift();
    if (this.onDataUpdate) this.onDataUpdate(point);
    if (window.ActivePulse.DataManager) window.ActivePulse.DataManager.addRealtimePoint(point);
  },

  // === INPUT LISTENERS (chart visualization only) ===
  _boundHandlers: null,

  _setupInputListeners() {
    this._boundHandlers = {
      mousemove: (e) => {
        const dx = Math.abs(e.clientX - this.lastMouseX);
        const dy = Math.abs(e.clientY - this.lastMouseY);
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        if (dist > 3) {
          this.lastInputTime = Date.now();
          this.inputActivity = Math.min(4.5, dist * 0.08);
          // NOTE: This does NOT reset sedentarySeconds or consecutiveSedentary
        }
      },
      keydown: () => {
        this.lastInputTime = Date.now();
        this.inputActivity = 1.8 + Math.random() * 0.8;
      },
      click: () => {
        this.lastInputTime = Date.now();
        this.inputActivity = 2.0 + Math.random() * 1.0;
      },
      scroll: () => {
        this.lastInputTime = Date.now();
        this.inputActivity = 1.2 + Math.random() * 0.6;
      }
    };
    Object.entries(this._boundHandlers).forEach(([evt, fn]) => {
      document.addEventListener(evt, fn, { passive: true });
    });
  },

  _removeInputListeners() {
    if (this._boundHandlers) {
      Object.entries(this._boundHandlers).forEach(([evt, fn]) => {
        document.removeEventListener(evt, fn);
      });
      this._boundHandlers = null;
    }
  },

  getSessionDuration() {
    if (!this.sessionStart) return 0;
    return Math.round((Date.now() - this.sessionStart) / 1000);
  },

  getSessionStats() {
    const total = this.getSessionDuration();
    return {
      totalSeconds: total,
      sedentarySeconds: this.sedentarySeconds,
      consecutiveSedentary: this.consecutiveSedentary,
      breaksTaken: this.breaksTaken,
      inputActivity: this.inputActivity
    };
  },

  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
};
