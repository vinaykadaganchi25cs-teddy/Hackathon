/* ========================================
   Active Pulse — Data Manager
   Generates realistic 30-day activity data
   ======================================== */

window.ActivePulse = window.ActivePulse || {};

window.ActivePulse.DataManager = {
  historicalData: [],
  todayRealtime: [],

  init() {
    const VERSION = 'v2';
    const savedVersion = localStorage.getItem('activepulse_version');
    const saved = localStorage.getItem('activepulse_data');
    if (saved && savedVersion === VERSION) {
      try {
        this.historicalData = JSON.parse(saved);
      } catch(e) {
        this.historicalData = [];
      }
    }
    if (this.historicalData.length === 0) {
      this.generateHistoricalData();
      this.save();
      localStorage.setItem('activepulse_version', VERSION);
    }
  },

  save() {
    try {
      localStorage.setItem('activepulse_data', JSON.stringify(this.historicalData));
    } catch(e) { /* storage full */ }
  },

  generateHistoricalData() {
    this.historicalData = [];
    const now = new Date();
    for (let d = 29; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      this.historicalData.push(this.generateDayData(date));
    }
  },

  generateDayData(date) {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const hours = [];
    let totalSteps = 0, totalActive = 0, totalSedentary = 0;

    for (let h = 0; h < 24; h++) {
      const hourData = this.generateHourData(h, isWeekend);
      hours.push(hourData);
      totalSteps += hourData.steps;
      totalActive += hourData.activeMinutes;
      totalSedentary += hourData.sedentaryMinutes;
    }

    const movementScore = Math.round(Math.min(100,
      (totalSteps / 100) + (totalActive * 0.5) - (totalSedentary * 0.1)
    ));

    return {
      date: date.toISOString().split('T')[0],
      dayOfWeek,
      isWeekend,
      hours,
      summary: {
        movementScore: Math.max(0, Math.min(100, movementScore)),
        totalSteps,
        totalActiveMinutes: totalActive,
        totalSedentaryMinutes: totalSedentary,
        longestSedentaryStreak: this.calcLongestStreak(hours),
        calories: Math.round(totalSteps * 0.04 + totalActive * 3.5)
      }
    };
  },

  generateHourData(hour, isWeekend) {
    let baseActivity, baseSedentary, baseSteps;
    const rand = () => Math.random();

    if (hour >= 0 && hour < 6) {
      // sleeping
      baseActivity = 0;
      baseSedentary = 60;
      baseSteps = 0;
    } else if (hour >= 6 && hour < 8) {
      // morning routine
      baseActivity = isWeekend ? 15 + rand()*15 : 20 + rand()*10;
      baseSedentary = 60 - baseActivity;
      baseSteps = Math.round(baseActivity * 30);
    } else if (hour >= 8 && hour < 12) {
      // morning work/school
      if (isWeekend) {
        baseActivity = 20 + rand()*20;
        baseSedentary = 60 - baseActivity;
        baseSteps = Math.round(baseActivity * 40);
      } else {
        baseActivity = 5 + rand()*10;
        baseSedentary = 60 - baseActivity;
        baseSteps = Math.round(baseActivity * 20);
      }
    } else if (hour >= 12 && hour < 14) {
      // lunch break
      baseActivity = 15 + rand()*15;
      baseSedentary = 60 - baseActivity;
      baseSteps = Math.round(baseActivity * 35);
    } else if (hour >= 14 && hour < 17) {
      // afternoon - peak sedentary
      if (isWeekend) {
        baseActivity = 15 + rand()*20;
      } else {
        baseActivity = 3 + rand()*8;
      }
      baseSedentary = 60 - baseActivity;
      baseSteps = Math.round(baseActivity * 15);
    } else if (hour >= 17 && hour < 19) {
      // evening commute / activity
      baseActivity = isWeekend ? 25 + rand()*20 : 20 + rand()*15;
      baseSedentary = 60 - baseActivity;
      baseSteps = Math.round(baseActivity * 50);
    } else if (hour >= 19 && hour < 22) {
      // evening relaxation
      baseActivity = 5 + rand()*15;
      baseSedentary = 60 - baseActivity;
      baseSteps = Math.round(baseActivity * 20);
    } else {
      // late night
      baseActivity = 2 + rand()*5;
      baseSedentary = 60 - baseActivity;
      baseSteps = Math.round(baseActivity * 10);
    }

    // Random exercise boost (some days include workouts 6-7 AM or 5-6 PM)
    if ((hour === 6 || hour === 17) && rand() > 0.6) {
      baseActivity = Math.min(55, baseActivity + 30);
      baseSedentary = 60 - baseActivity;
      baseSteps += Math.round(800 + rand() * 1200);
    }

    return {
      hour,
      activeMinutes: Math.round(baseActivity),
      sedentaryMinutes: Math.round(baseSedentary),
      steps: Math.round(baseSteps),
      movementScore: Math.round((baseActivity / 60) * 100),
      intensity: baseActivity > 30 ? 'active' : baseActivity > 10 ? 'light' : 'sedentary'
    };
  },

  calcLongestStreak(hours) {
    let max = 0, current = 0;
    hours.forEach(h => {
      if (h.sedentaryMinutes > 45) {
        current += h.sedentaryMinutes;
        max = Math.max(max, current);
      } else {
        current = 0;
      }
    });
    return max;
  },

  getToday() {
    return this.historicalData[this.historicalData.length - 1];
  },

  getWeekData() {
    return this.historicalData.slice(-7);
  },

  getMonthData() {
    return this.historicalData;
  },

  getDayLabels() {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  },

  getWeeklyAverages() {
    const week = this.getWeekData();
    const avgScore = Math.round(week.reduce((s, d) => s + d.summary.movementScore, 0) / week.length);
    const avgSteps = Math.round(week.reduce((s, d) => s + d.summary.totalSteps, 0) / week.length);
    const avgSedentary = Math.round(week.reduce((s, d) => s + d.summary.totalSedentaryMinutes, 0) / week.length);
    const avgActive = Math.round(week.reduce((s, d) => s + d.summary.totalActiveMinutes, 0) / week.length);
    return { avgScore, avgSteps, avgSedentary, avgActive };
  },

  addRealtimePoint(point) {
    this.todayRealtime.push({
      timestamp: Date.now(),
      ...point
    });
    // Keep last 300 points (5 min at 1/sec)
    if (this.todayRealtime.length > 300) {
      this.todayRealtime.shift();
    }
  },

  getRealtimeData() {
    return this.todayRealtime;
  }
};
