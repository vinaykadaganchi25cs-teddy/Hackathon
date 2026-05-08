/* ========================================
   Active Pulse — Risk Assessment Engine
   Questionnaire + scoring algorithm
   ======================================== */

window.ActivePulse = window.ActivePulse || {};

window.ActivePulse.RiskEngine = {
  questions: [
    {
      id: 'sitting_hours',
      text: 'How many hours do you spend sitting on a typical day?',
      category: 'Sedentary Time',
      options: [
        { text: 'Less than 4 hours', score: 0 },
        { text: '4–6 hours', score: 25 },
        { text: '6–8 hours', score: 50 },
        { text: '8–10 hours', score: 75 },
        { text: 'More than 10 hours', score: 100 }
      ]
    },
    {
      id: 'exercise_freq',
      text: 'How often do you exercise or do intentional physical activity?',
      category: 'Physical Activity',
      options: [
        { text: 'Daily (30+ min)', score: 0 },
        { text: '4–5 times a week', score: 15 },
        { text: '2–3 times a week', score: 35 },
        { text: 'Once a week', score: 65 },
        { text: 'Rarely or never', score: 100 }
      ]
    },
    {
      id: 'breaks',
      text: 'How often do you take movement breaks during work or study?',
      category: 'Break Habits',
      options: [
        { text: 'Every 30 minutes', score: 0 },
        { text: 'Every hour', score: 20 },
        { text: 'Every 2 hours', score: 45 },
        { text: 'Rarely', score: 75 },
        { text: 'Almost never', score: 100 }
      ]
    },
    {
      id: 'screen_time',
      text: 'What is your daily recreational screen time (non-work)?',
      category: 'Screen Exposure',
      options: [
        { text: 'Less than 1 hour', score: 0 },
        { text: '1–2 hours', score: 20 },
        { text: '2–4 hours', score: 45 },
        { text: '4–6 hours', score: 70 },
        { text: 'More than 6 hours', score: 100 }
      ]
    },
    {
      id: 'commute',
      text: 'How do you primarily commute?',
      category: 'Transportation',
      options: [
        { text: 'Walking or cycling', score: 0 },
        { text: 'Public transit (some walking)', score: 25 },
        { text: 'Driving (short distance)', score: 50 },
        { text: 'Driving (long commute)', score: 75 },
        { text: 'Work from home / no commute', score: 60 }
      ]
    },
    {
      id: 'workspace',
      text: 'What best describes your workspace setup?',
      category: 'Environment',
      options: [
        { text: 'Standing desk / active setup', score: 0 },
        { text: 'Regular desk with ergonomic chair', score: 25 },
        { text: 'Regular desk, standard chair', score: 50 },
        { text: 'Couch or bed (laptop)', score: 80 },
        { text: 'No fixed workspace', score: 40 }
      ]
    },
    {
      id: 'posture',
      text: 'Do you experience any posture-related discomfort?',
      category: 'Physical Health',
      options: [
        { text: 'No discomfort at all', score: 0 },
        { text: 'Occasional mild stiffness', score: 25 },
        { text: 'Regular neck or back pain', score: 55 },
        { text: 'Chronic pain requiring treatment', score: 85 },
        { text: 'Severe, limits daily activities', score: 100 }
      ]
    },
    {
      id: 'awareness',
      text: 'How aware are you of your daily movement levels?',
      category: 'Self Awareness',
      options: [
        { text: 'Very aware — I track everything', score: 0 },
        { text: 'Somewhat aware', score: 25 },
        { text: 'Not very aware', score: 55 },
        { text: 'I never think about it', score: 80 },
        { text: 'I only notice when I feel pain', score: 100 }
      ]
    }
  ],

  answers: {},

  init() {
    this.answers = {};
  },

  getQuestions() {
    return this.questions;
  },

  setAnswer(questionId, optionIndex) {
    this.answers[questionId] = optionIndex;
  },

  isComplete() {
    return Object.keys(this.answers).length === this.questions.length;
  },

  getProgress() {
    return Object.keys(this.answers).length / this.questions.length;
  },

  calculateScore() {
    if (!this.isComplete()) return null;

    const weights = {
      sitting_hours: 0.20,
      exercise_freq: 0.18,
      breaks: 0.15,
      screen_time: 0.12,
      commute: 0.08,
      workspace: 0.10,
      posture: 0.10,
      awareness: 0.07
    };

    let totalScore = 0;
    this.questions.forEach(q => {
      const optionIndex = this.answers[q.id];
      const score = q.options[optionIndex].score;
      totalScore += score * (weights[q.id] || 0.125);
    });

    return Math.round(totalScore);
  },

  getRiskLevel(score) {
    if (score <= 25) return { level: 'Low', class: 'low', color: '#10b981', desc: 'Your activity levels are healthy. Keep it up!' };
    if (score <= 50) return { level: 'Moderate', class: 'moderate', color: '#f59e0b', desc: 'Some sedentary patterns detected. Small changes can make a big difference.' };
    if (score <= 75) return { level: 'High', class: 'high', color: '#ef4444', desc: 'Significant sedentary risk. Consider adopting regular movement breaks and exercise.' };
    return { level: 'Critical', class: 'critical', color: '#dc2626', desc: 'Severe inactivity risk. Prolonged sedentary behavior may lead to serious health issues.' };
  },

  getFactorBreakdown() {
    const factors = [];
    this.questions.forEach(q => {
      const optIdx = this.answers[q.id];
      if (optIdx !== undefined) {
        const score = q.options[optIdx].score;
        let color = '#10b981';
        if (score > 60) color = '#ef4444';
        else if (score > 30) color = '#f59e0b';
        factors.push({
          label: q.category,
          score,
          color,
          answer: q.options[optIdx].text
        });
      }
    });
    return factors;
  },

  getRadarData() {
    const labels = [];
    const values = [];
    this.questions.forEach(q => {
      labels.push(q.category);
      const optIdx = this.answers[q.id];
      values.push(optIdx !== undefined ? q.options[optIdx].score : 0);
    });
    return { labels, values };
  },

  getPercentile(score) {
    // Simulated population distribution (most people score 40-70)
    if (score <= 20) return 95;
    if (score <= 30) return 82;
    if (score <= 40) return 65;
    if (score <= 50) return 48;
    if (score <= 60) return 32;
    if (score <= 70) return 18;
    if (score <= 80) return 8;
    return 3;
  },

  getVulnerabilityFlags() {
    const flags = [];
    if (this.answers.sitting_hours >= 3) flags.push({ icon: '⚠️', text: 'Extended daily sitting (8+ hours) significantly increases cardiovascular risk' });
    if (this.answers.exercise_freq >= 3) flags.push({ icon: '🏃', text: 'Insufficient weekly exercise — aim for at least 150 minutes of moderate activity' });
    if (this.answers.breaks >= 3) flags.push({ icon: '⏰', text: 'Infrequent movement breaks — set reminders every 60 minutes' });
    if (this.answers.posture >= 2) flags.push({ icon: '🩺', text: 'Posture-related discomfort may indicate prolonged static positioning' });
    if (this.answers.screen_time >= 3) flags.push({ icon: '📱', text: 'High recreational screen time compounds occupational sedentary behavior' });
    if (flags.length === 0) flags.push({ icon: '✅', text: 'No major vulnerability flags detected' });
    return flags;
  }
};
