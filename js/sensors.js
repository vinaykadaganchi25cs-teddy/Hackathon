/* ========================================
   Active Pulse — Sensor Manager v2
   Fixed desktop detection + responsive UI
   ======================================== */

window.ActivePulse = window.ActivePulse || {};

window.ActivePulse.SensorManager = {
  isMonitoring: false,
  hasPermission: false,
  useFallback: false,
  currentStatus: 'unknown',
  currentMagnitude: 0,
  sedentarySeconds: 0,
  activeSeconds: 0,
  lightSeconds: 0,
  breaksTaken: 0,
  sessionStart: null,
  lastMovement: Date.now(),
  lastMouseX: 0,
  lastMouseY: 0,
  realtimeBuffer: [],
  sedentaryTimer: null,
  dataInterval: null,
  onStatusChange: null,
  onDataUpdate: null,
  onBreakNeeded: null,
  consecutiveSedentary: 0,

  SEDENTARY_THRESHOLD: 0.5,
  LIGHT_THRESHOLD: 2.0,
  IDLE_MS: 2000,
  BREAK_INTERVAL: 60 * 60,

  init() {
    if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
      this.useFallback = false;
    } else if (window.DeviceMotionEvent) {
      // Try to use it, but test if we actually get data
      this.useFallback = false;
      this._testMotionSupport();
    } else {
      this.useFallback = true;
    }
  },

  _testMotionSupport() {
    let gotData = false;
    const handler = (e) => {
      const a = e.accelerationIncludingGravity;
      if (a && (a.x !== null || a.y !== null || a.z !== null)) {
        gotData = true;
      }
    };
    window.addEventListener('devicemotion', handler);
    setTimeout(() => {
      window.removeEventListener('devicemotion', handler);
      if (!gotData) this.useFallback = true;
    }, 1000);
  },

  async requestPermission() {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const r = await DeviceMotionEvent.requestPermission();
        this.hasPermission = r === 'granted';
        return this.hasPermission;
      } catch (e) { this.useFallback = true; return false; }
    }
    this.hasPermission = true;
    return true;
  },

  async startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.sessionStart = Date.now();
    this.sedentarySeconds = 0;
    this.activeSeconds = 0;
    this.lightSeconds = 0;
    this.breaksTaken = 0;
    this.consecutiveSedentary = 0;
    this.lastMovement = Date.now();

    if (!this.useFallback) {
      await this.requestPermission();
      if (this.hasPermission) {
        window.addEventListener('devicemotion', this._boundMotion = this._handleMotion.bind(this));
        // Also add desktop fallback as supplement
        this._setupDesktopFallback();
      } else {
        this.useFallback = true;
      }
    }

    if (this.useFallback) {
      this._setupDesktopFallback();
    }

    this.sedentaryTimer = setInterval(() => this._updateStatus(), 1000);
    this.dataInterval = setInterval(() => this._emitData(), 1000);
    this._setStatus('light');
  },

  stopMonitoring() {
    this.isMonitoring = false;
    if (this._boundMotion) window.removeEventListener('devicemotion', this._boundMotion);
    this._removeDesktopFallback();
    clearInterval(this.sedentaryTimer);
    clearInterval(this.dataInterval);
    this.sedentaryTimer = null;
    this.dataInterval = null;
  },

  resetBreakTimer() {
    this.consecutiveSedentary = 0;
    this.breaksTaken++;
  },

  _handleMotion(event) {
    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc) return;
    const x = acc.x || 0, y = acc.y || 0, z = acc.z || 0;
    this.currentMagnitude = Math.abs(Math.sqrt(x*x + y*y + z*z) - 9.8);
    if (this.currentMagnitude > this.SEDENTARY_THRESHOLD) {
      this.lastMovement = Date.now();
    }
  },

  _boundDesktopHandlers: null,

  _setupDesktopFallback() {
    this._boundDesktopHandlers = {
      mousemove: (e) => {
        const dx = Math.abs(e.clientX - this.lastMouseX);
        const dy = Math.abs(e.clientY - this.lastMouseY);
        const dist = Math.sqrt(dx*dx + dy*dy);
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        if (dist > 3) {
          this.lastMovement = Date.now();
          // Map mouse speed to magnitude (bigger movements = higher magnitude)
          this.currentMagnitude = Math.min(4.5, dist * 0.08);
        }
      },
      keydown: () => {
        this.lastMovement = Date.now();
        this.currentMagnitude = 1.8 + Math.random() * 0.8;
      },
      click: () => {
        this.lastMovement = Date.now();
        this.currentMagnitude = 2.0 + Math.random() * 1.0;
      },
      scroll: () => {
        this.lastMovement = Date.now();
        this.currentMagnitude = 1.2 + Math.random() * 0.6;
      },
      touchstart: () => {
        this.lastMovement = Date.now();
        this.currentMagnitude = 2.5 + Math.random() * 1.0;
      }
    };
    Object.entries(this._boundDesktopHandlers).forEach(([evt, fn]) => {
      document.addEventListener(evt, fn, { passive: true });
    });
  },

  _removeDesktopFallback() {
    if (this._boundDesktopHandlers) {
      Object.entries(this._boundDesktopHandlers).forEach(([evt, fn]) => {
        document.removeEventListener(evt, fn);
      });
      this._boundDesktopHandlers = null;
    }
  },

  _updateStatus() {
    if (!this.isMonitoring) return;
    const idleMs = Date.now() - this.lastMovement;

    // Gradually decay magnitude when idle
    if (idleMs > 500) {
      this.currentMagnitude *= 0.88;
      if (this.currentMagnitude < 0.08) this.currentMagnitude = 0.03 + Math.random() * 0.05;
    }

    let newStatus;
    if (idleMs < this.IDLE_MS) {
      newStatus = this.currentMagnitude >= this.LIGHT_THRESHOLD ? 'active' : 'light';
    } else if (idleMs < this.IDLE_MS * 4) {
      newStatus = 'light';
    } else {
      newStatus = 'sedentary';
    }

    // Update counters
    if (newStatus === 'sedentary') {
      this.consecutiveSedentary++;
    } else if (newStatus === 'active') {
      this.activeSeconds++;
      this.consecutiveSedentary = 0;
    } else {
      this.lightSeconds++;
      if (this.consecutiveSedentary > 0 && idleMs < this.IDLE_MS * 2) {
        this.consecutiveSedentary = 0;
      }
    }

    // Break alert at 60 min continuous sedentary
    if (this.consecutiveSedentary >= this.BREAK_INTERVAL) {
      if (this.onBreakNeeded) this.onBreakNeeded();
      this.consecutiveSedentary = 0;
    }

    if (newStatus !== this.currentStatus) {
      this.currentStatus = newStatus;
      if (this.onStatusChange) this.onStatusChange(newStatus, this.currentMagnitude);
    }
    this.currentStatus = newStatus;
  },

  _setStatus(s) { this.currentStatus = s; },

  _emitData() {
    if (!this.isMonitoring) return;
    const point = {
      timestamp: Date.now(),
      magnitude: Math.round(this.currentMagnitude * 100) / 100,
      status: this.currentStatus,
      sedentarySeconds: this.consecutiveSedentary,
      activeSeconds: this.activeSeconds,
      lightSeconds: this.lightSeconds
    };
    this.realtimeBuffer.push(point);
    if (this.realtimeBuffer.length > 120) this.realtimeBuffer.shift();
    if (this.onDataUpdate) this.onDataUpdate(point);
    if (window.ActivePulse.DataManager) window.ActivePulse.DataManager.addRealtimePoint(point);
  },

  getSessionDuration() {
    if (!this.sessionStart) return 0;
    return Math.round((Date.now() - this.sessionStart) / 1000);
  },

  getSessionStats() {
    const total = this.getSessionDuration();
    return {
      totalSeconds: total,
      activeSeconds: this.activeSeconds,
      lightSeconds: this.lightSeconds,
      sedentarySeconds: total - this.activeSeconds - this.lightSeconds,
      breaksTaken: this.breaksTaken,
      currentStreak: this.consecutiveSedentary
    };
  },

  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
};
