/* ========================================
   Active Pulse — Rewards & Gamification
   Tasks, scratch cards, coupon codes
   ======================================== */

window.ActivePulse = window.ActivePulse || {};

window.ActivePulse.Rewards = {
  tasks: [
    { id: 'walk', icon: '🚶', title: 'Walk 5 Minutes', desc: 'Take a short walk to reset your body', points: 25, done: false },
    { id: 'stretch', icon: '🧘', title: 'Do a Stretch', desc: 'Try a desk stretch or yoga pose', points: 15, done: false },
    { id: 'water', icon: '💧', title: 'Drink Water', desc: 'Hydrate! Aim for 8 glasses today', points: 10, done: false },
    { id: 'posture', icon: '🪑', title: 'Fix Your Posture', desc: 'Sit up straight for 5 minutes', points: 15, done: false },
    { id: 'eyes', icon: '👀', title: 'Eye Break (20-20-20)', desc: 'Look 20ft away for 20 seconds', points: 10, done: false },
    { id: 'stairs', icon: '⬆️', title: 'Take the Stairs', desc: 'Choose stairs over elevator once today', points: 25, done: false }
  ],

  coupons: [
    { code: 'ACTIVE10', reward: '10% Off Health Supplements', rarity: 'common' },
    { code: 'MOVEMORE25', reward: '25% Off Fitness Gear', rarity: 'common' },
    { code: 'HYDRATE15', reward: '15% Off Water Bottles', rarity: 'common' },
    { code: 'FLEXFIT30', reward: '30% Off Yoga Classes', rarity: 'rare' },
    { code: 'WELLNESS50', reward: '50% Off Wellness App Premium', rarity: 'rare' },
    { code: 'CHAMPION100', reward: 'FREE Month Gym Membership', rarity: 'legendary' }
  ],

  totalPoints: 0,
  earnedCoupons: [],
  scratchCardsAvailable: 0,

  init() {
    const saved = localStorage.getItem('activepulse_rewards');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        this.totalPoints = d.totalPoints || 0;
        this.earnedCoupons = d.earnedCoupons || [];
        this.tasks.forEach(t => { if (d.doneTasks && d.doneTasks.includes(t.id)) t.done = true; });
        this.scratchCardsAvailable = d.scratchCards || 0;
      } catch(e) {}
    }
  },

  save() {
    const d = {
      totalPoints: this.totalPoints,
      earnedCoupons: this.earnedCoupons,
      doneTasks: this.tasks.filter(t => t.done).map(t => t.id),
      scratchCards: this.scratchCardsAvailable
    };
    localStorage.setItem('activepulse_rewards', JSON.stringify(d));
  },

  completeTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task || task.done) return null;
    task.done = true;
    this.totalPoints += task.points;
    // Every 2 completed tasks = 1 scratch card
    const completed = this.tasks.filter(t => t.done).length;
    if (completed % 2 === 0) {
      this.scratchCardsAvailable++;
    }
    this.save();
    return task;
  },

  getRandomCoupon() {
    if (this.scratchCardsAvailable <= 0) return null;
    this.scratchCardsAvailable--;
    // Weighted random: 60% common, 30% rare, 10% legendary
    const roll = Math.random();
    let pool;
    if (roll < 0.6) pool = this.coupons.filter(c => c.rarity === 'common');
    else if (roll < 0.9) pool = this.coupons.filter(c => c.rarity === 'rare');
    else pool = this.coupons.filter(c => c.rarity === 'legendary');
    const coupon = pool[Math.floor(Math.random() * pool.length)];
    this.earnedCoupons.push({ ...coupon, earnedAt: new Date().toLocaleString() });
    this.save();
    return coupon;
  },

  getCompletedCount() {
    return this.tasks.filter(t => t.done).length;
  },

  resetDaily() {
    this.tasks.forEach(t => t.done = false);
    this.save();
  },

  getHealthRisks() {
    const completed = this.getCompletedCount();
    const risks = [
      { icon: '🫀', title: 'Cardiovascular Disease', severity: 90, desc: 'Prolonged sitting increases heart disease risk by 147%. Blood flow slows, fatty acids accumulate in blood vessels.' },
      { icon: '🦴', title: 'Musculoskeletal Damage', severity: 85, desc: 'Chronic sitting weakens back muscles, compresses spinal discs, and causes irreversible posture damage over time.' },
      { icon: '🧠', title: 'Mental Health Decline', severity: 70, desc: 'Sedentary behavior increases risk of depression by 25% and anxiety by 20%. Movement releases endorphins your brain needs.' },
      { icon: '⚖️', title: 'Obesity & Metabolic Syndrome', severity: 80, desc: 'Sitting burns only 1 cal/min. Prolonged inactivity disrupts insulin regulation and fat metabolism.' },
      { icon: '🩸', title: 'Deep Vein Thrombosis', severity: 75, desc: 'Blood pooling in legs during extended sitting can form dangerous clots that may travel to lungs.' },
      { icon: '😴', title: 'Chronic Fatigue', severity: 65, desc: 'Paradoxically, less movement = more fatigue. Your body needs movement to maintain energy levels.' }
    ];
    // Reduce severity based on tasks completed
    return risks.map(r => ({
      ...r,
      severity: Math.max(10, r.severity - (completed * 12))
    }));
  }
};
