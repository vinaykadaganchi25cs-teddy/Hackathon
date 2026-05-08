/* ========================================
   Active Pulse — Analytics Engine
   Chart.js visualizations & insights
   ======================================== */

window.ActivePulse = window.ActivePulse || {};

window.ActivePulse.AnalyticsEngine = {
  charts: {},

  chartDefaults: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 }, padding: 15 }
      },
      tooltip: {
        backgroundColor: 'rgba(10,10,26,0.9)',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        titleFont: { family: 'Inter', weight: '600' },
        bodyFont: { family: 'Inter' }
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
        grid: { color: 'rgba(255,255,255,0.03)' }
      },
      y: {
        ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
        grid: { color: 'rgba(255,255,255,0.03)' }
      }
    }
  },

  init() {
    // Charts will be created when dashboard section is shown
  },

  createDashboardCharts(data) {
    this.destroyAll();
    const monthData = data.getMonthData();
    const today = data.getToday();
    const weekData = data.getWeekData();

    this.createDailyTimeline(today);
    this.createWeeklyPattern(weekData);
    this.createActivityDistribution(today);
    this.createTrendLine(monthData);
    this.createHourlyHistogram(monthData);
  },

  createHourlyHistogram(monthData) {
    const ctx = document.getElementById('chart-histogram');
    if (!ctx) return;
    const hourlyActive = Array(24).fill(0);
    const hourlySedentary = Array(24).fill(0);
    monthData.forEach(d => d.hours.forEach(h => {
      hourlyActive[h.hour] += h.activeMinutes;
      hourlySedentary[h.hour] += h.sedentaryMinutes;
    }));
    const n = monthData.length;
    this.charts.histogram = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Array.from({length:24}, (_,i) => `${String(i).padStart(2,'0')}:00`),
        datasets: [
          {
            label: 'Avg Active Min',
            data: hourlyActive.map(v => Math.round(v/n)),
            backgroundColor: 'rgba(16,185,129,0.7)',
            borderRadius: 4, borderSkipped: false
          },
          {
            label: 'Avg Sedentary Min',
            data: hourlySedentary.map(v => Math.round(v/n)),
            backgroundColor: 'rgba(239,68,68,0.5)',
            borderRadius: 4, borderSkipped: false
          }
        ]
      },
      options: {
        ...this.chartDefaults,
        plugins: { ...this.chartDefaults.plugins },
        scales: {
          ...this.chartDefaults.scales,
          x: { ...this.chartDefaults.scales.x, stacked: false, ticks: { ...this.chartDefaults.scales.x.ticks, maxTicksLimit: 12 } },
          y: { ...this.chartDefaults.scales.y, beginAtZero: true, max: 60 }
        }
      }
    });
  },

  createDailyTimeline(dayData) {
    const ctx = document.getElementById('chart-daily-timeline');
    if (!ctx) return;
    const hours = dayData.hours;

    this.charts.dailyTimeline = new Chart(ctx, {
      type: 'line',
      data: {
        labels: hours.map(h => `${String(h.hour).padStart(2,'0')}:00`),
        datasets: [
          {
            label: 'Active Minutes',
            data: hours.map(h => h.activeMinutes),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5
          },
          {
            label: 'Sedentary Minutes',
            data: hours.map(h => h.sedentaryMinutes),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.08)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        ...this.chartDefaults,
        plugins: {
          ...this.chartDefaults.plugins,
          title: { display: false }
        },
        scales: {
          ...this.chartDefaults.scales,
          y: {
            ...this.chartDefaults.scales.y,
            max: 60,
            beginAtZero: true
          }
        },
        interaction: { intersect: false, mode: 'index' }
      }
    });
  },

  createWeeklyPattern(weekData) {
    const ctx = document.getElementById('chart-weekly-pattern');
    if (!ctx) return;
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    this.charts.weeklyPattern = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: weekData.map(d => dayNames[d.dayOfWeek]),
        datasets: [
          {
            label: 'Movement Score',
            data: weekData.map(d => d.summary.movementScore),
            backgroundColor: weekData.map(d => {
              const s = d.summary.movementScore;
              if (s >= 60) return 'rgba(16,185,129,0.7)';
              if (s >= 35) return 'rgba(245,158,11,0.7)';
              return 'rgba(239,68,68,0.7)';
            }),
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        ...this.chartDefaults,
        plugins: {
          ...this.chartDefaults.plugins,
          legend: { display: false }
        },
        scales: {
          ...this.chartDefaults.scales,
          y: {
            ...this.chartDefaults.scales.y,
            max: 100,
            beginAtZero: true
          }
        }
      }
    });
  },

  createActivityDistribution(dayData) {
    const ctx = document.getElementById('chart-distribution');
    if (!ctx) return;

    const active = dayData.summary.totalActiveMinutes;
    const sedentary = dayData.summary.totalSedentaryMinutes;
    const light = 1440 - active - sedentary;

    this.charts.distribution = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Active', 'Light Activity', 'Sedentary'],
        datasets: [{
          data: [active, Math.max(0, light), sedentary],
          backgroundColor: [
            'rgba(16,185,129,0.8)',
            'rgba(245,158,11,0.8)',
            'rgba(239,68,68,0.8)'
          ],
          borderColor: 'transparent',
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 }, padding: 15, usePointStyle: true }
          }
        }
      }
    });
  },

  createTrendLine(monthData) {
    const ctx = document.getElementById('chart-trend');
    if (!ctx) return;

    this.charts.trendLine = new Chart(ctx, {
      type: 'line',
      data: {
        labels: monthData.map(d => d.date.slice(5)),
        datasets: [{
          label: 'Movement Score',
          data: monthData.map(d => d.summary.movementScore),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: 'transparent',
          pointHoverRadius: 6
        }]
      },
      options: {
        ...this.chartDefaults,
        plugins: {
          ...this.chartDefaults.plugins,
          legend: { display: false }
        },
        scales: {
          ...this.chartDefaults.scales,
          y: { ...this.chartDefaults.scales.y, max: 100, beginAtZero: true },
          x: { ...this.chartDefaults.scales.x, ticks: { ...this.chartDefaults.scales.x.ticks, maxTicksLimit: 10 } }
        }
      }
    });
  },

  // Real-time chart for live monitor
  realtimeChart: null,

  createRealtimeChart() {
    const ctx = document.getElementById('chart-realtime');
    if (!ctx) return;
    if (this.realtimeChart) { this.realtimeChart.destroy(); }

    this.realtimeChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Motion Intensity',
          data: [],
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6,182,212,0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 0
        }]
      },
      options: {
        ...this.chartDefaults,
        animation: { duration: 0 },
        plugins: {
          ...this.chartDefaults.plugins,
          legend: { display: false }
        },
        scales: {
          x: { ...this.chartDefaults.scales.x, display: false },
          y: {
            ...this.chartDefaults.scales.y,
            min: 0, max: 5,
            ticks: { ...this.chartDefaults.scales.y.ticks, stepSize: 1 }
          }
        }
      }
    });
  },

  updateRealtimeChart(point) {
    if (!this.realtimeChart) return;
    const chart = this.realtimeChart;
    const now = new Date();
    const label = `${now.getMinutes()}:${String(now.getSeconds()).padStart(2,'0')}`;

    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(point.magnitude);

    // Keep last 60 points
    if (chart.data.labels.length > 60) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }

    // Change color based on status
    if (point.status === 'active') {
      chart.data.datasets[0].borderColor = '#10b981';
      chart.data.datasets[0].backgroundColor = 'rgba(16,185,129,0.1)';
    } else if (point.status === 'sedentary') {
      chart.data.datasets[0].borderColor = '#ef4444';
      chart.data.datasets[0].backgroundColor = 'rgba(239,68,68,0.1)';
    } else {
      chart.data.datasets[0].borderColor = '#06b6d4';
      chart.data.datasets[0].backgroundColor = 'rgba(6,182,212,0.1)';
    }

    chart.update('none');
  },

  // Risk radar chart
  createRiskRadar(radarData) {
    const ctx = document.getElementById('chart-radar');
    if (!ctx) return;
    if (this.charts.radar) this.charts.radar.destroy();

    this.charts.radar = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: radarData.labels,
        datasets: [{
          label: 'Risk Level',
          data: radarData.values,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.15)',
          borderWidth: 2,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#fff',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: { display: false, stepSize: 25 },
            grid: { color: 'rgba(255,255,255,0.05)' },
            pointLabels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
            angleLines: { color: 'rgba(255,255,255,0.05)' }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  },

  destroyAll() {
    Object.keys(this.charts).forEach(key => {
      if (this.charts[key]) { this.charts[key].destroy(); delete this.charts[key]; }
    });
    if (this.realtimeChart) { this.realtimeChart.destroy(); this.realtimeChart = null; }
  },

  // Generate text insights from data
  generateInsights(data) {
    const month = data.getMonthData();
    const week = data.getWeekData();
    const today = data.getToday();
    const insights = [];

    // Peak sedentary hours
    const hourlyAvg = Array(24).fill(0);
    month.forEach(d => d.hours.forEach(h => { hourlyAvg[h.hour] += h.sedentaryMinutes; }));
    hourlyAvg.forEach((v, i) => hourlyAvg[i] = Math.round(v / month.length));
    let peakHour = 0; hourlyAvg.forEach((v, i) => { if (v > hourlyAvg[peakHour]) peakHour = i; });

    insights.push({
      icon: '⏰', iconClass: 'red',
      title: 'Peak Sedentary Hour',
      text: `Your most sedentary hour is ${peakHour}:00–${peakHour+1}:00 with an average of ${hourlyAvg[peakHour]} sedentary minutes. Consider scheduling a walk during this time.`
    });

    // Worst day
    const dayScores = [0,0,0,0,0,0,0];
    const dayCounts = [0,0,0,0,0,0,0];
    month.forEach(d => { dayScores[d.dayOfWeek] += d.summary.movementScore; dayCounts[d.dayOfWeek]++; });
    const dayAvgs = dayScores.map((s, i) => dayCounts[i] ? Math.round(s / dayCounts[i]) : 0);
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    let worstDay = 0; dayAvgs.forEach((v, i) => { if (v < dayAvgs[worstDay]) worstDay = i; });

    insights.push({
      icon: '📅', iconClass: 'amber',
      title: 'Least Active Day',
      text: `${dayNames[worstDay]}s tend to be your least active day with a movement score of ${dayAvgs[worstDay]}/100. Try adding a ${worstDay === 0 || worstDay === 6 ? 'morning walk' : 'midday workout'}.`
    });

    // Longest streak
    const streaks = month.map(d => d.summary.longestSedentaryStreak);
    const maxStreak = Math.max(...streaks);
    const avgStreak = Math.round(streaks.reduce((a,b) => a+b, 0) / streaks.length);

    insights.push({
      icon: '🔴', iconClass: 'red',
      title: 'Sedentary Streaks',
      text: `Your longest unbroken sedentary period is ${(maxStreak/60).toFixed(1)} hours. Average longest daily streak: ${(avgStreak/60).toFixed(1)} hours. Break these up with 5-minute walks.`
    });

    // Weekly trend
    const firstWeek = month.slice(0, 7).reduce((s, d) => s + d.summary.movementScore, 0) / 7;
    const lastWeek = week.reduce((s, d) => s + d.summary.movementScore, 0) / 7;
    const trend = lastWeek - firstWeek;

    insights.push({
      icon: trend >= 0 ? '📈' : '📉', iconClass: trend >= 0 ? 'green' : 'red',
      title: 'Monthly Trend',
      text: `Your movement score has ${trend >= 0 ? 'improved' : 'declined'} by ${Math.abs(Math.round(trend))} points over the last 30 days. ${trend >= 0 ? 'Great progress!' : 'Consider setting daily activity goals.'}`
    });

    // Steps
    const avgSteps = Math.round(month.reduce((s, d) => s + d.summary.totalSteps, 0) / month.length);
    const stepGoal = 8000;

    insights.push({
      icon: '👟', iconClass: 'purple',
      title: 'Daily Steps',
      text: `You average ${avgSteps.toLocaleString()} steps per day. ${avgSteps >= stepGoal ? 'You\'re meeting the recommended goal!' : `That's ${(stepGoal - avgSteps).toLocaleString()} steps short of the recommended ${stepGoal.toLocaleString()}.`}`
    });

    return insights;
  }
};
