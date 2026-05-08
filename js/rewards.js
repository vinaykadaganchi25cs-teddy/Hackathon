/* ========================================
   Active Pulse — Rewards & Gamification v2
   Toggle tasks, more rewards, confetti
   ======================================== */

window.ActivePulse = window.ActivePulse || {};

window.ActivePulse.Rewards = {
  tasks: [
    { id: 'walk', icon: '🚶', title: 'Walk 5 Minutes', desc: 'Take a short walk to reset your body', points: 25, done: false },
    { id: 'stretch', icon: '🧘', title: 'Do a Stretch', desc: 'Try a desk stretch or yoga pose', points: 15, done: false },
    { id: 'water', icon: '💧', title: 'Drink Water', desc: 'Hydrate! Aim for 8 glasses today', points: 10, done: false },
    { id: 'posture', icon: '🪑', title: 'Fix Your Posture', desc: 'Sit up straight for 5 minutes', points: 15, done: false },
    { id: 'eyes', icon: '👀', title: 'Eye Break (20-20-20)', desc: 'Look 20ft away for 20 seconds', points: 10, done: false },
    { id: 'stairs', icon: '⬆️', title: 'Take the Stairs', desc: 'Choose stairs over elevator once today', points: 25, done: false },
    { id: 'standup', icon: '🧍', title: 'Stand Up for 2 Min', desc: 'Stand and work for at least 2 minutes', points: 20, done: false },
    { id: 'breathe', icon: '🌬️', title: 'Deep Breathing', desc: '10 deep breaths to reduce stress', points: 10, done: false }
  ],

  coupons: [
    { code: 'ACTIVE10', reward: '10% Off Health Supplements', rarity: 'common', emoji: '💊' },
    { code: 'MOVEMORE25', reward: '25% Off Fitness Gear', rarity: 'common', emoji: '🏋️' },
    { code: 'HYDRATE15', reward: '15% Off Premium Water Bottles', rarity: 'common', emoji: '💧' },
    { code: 'YOGA20', reward: '20% Off Yoga Mat & Accessories', rarity: 'common', emoji: '🧘' },
    { code: 'FLEXFIT30', reward: '30% Off Online Yoga Classes', rarity: 'rare', emoji: '🎯' },
    { code: 'WELLNESS50', reward: '50% Off Wellness App Premium', rarity: 'rare', emoji: '⭐' },
    { code: 'FITBAND40', reward: '40% Off Smart Fitness Band', rarity: 'rare', emoji: '⌚' },
    { code: 'CHAMPION100', reward: 'FREE Month Gym Membership', rarity: 'legendary', emoji: '🏆' },
    { code: 'VITABOOST', reward: 'FREE Vitamin Subscription Box', rarity: 'legendary', emoji: '🎁' },
    { code: 'ULTRAMOVE', reward: 'FREE Ergonomic Desk Chair', rarity: 'legendary', emoji: '👑' }
  ],

  totalPoints: 0,
  earnedCoupons: [],
  scratchCardsAvailable: 0,

  init() {
    const saved = localStorage.getItem('activepulse_rewards_v2');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        this.totalPoints = d.totalPoints || 0;
        this.earnedCoupons = d.earnedCoupons || [];
        this.scratchCardsAvailable = d.scratchCards || 0;
        this.tasks.forEach(t => { if (d.doneTasks && d.doneTasks.includes(t.id)) t.done = true; });
      } catch (e) {}
    }
  },

  save() {
    const d = {
      totalPoints: this.totalPoints,
      earnedCoupons: this.earnedCoupons,
      doneTasks: this.tasks.filter(t => t.done).map(t => t.id),
      scratchCards: this.scratchCardsAvailable
    };
    localStorage.setItem('activepulse_rewards_v2', JSON.stringify(d));
  },

  toggleTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return null;

    if (task.done) {
      // Untick
      task.done = false;
      this.totalPoints = Math.max(0, this.totalPoints - task.points);
      // Recalculate scratch cards
      const completed = this.tasks.filter(t => t.done).length;
      this.scratchCardsAvailable = Math.floor(completed / 2) - this.earnedCoupons.length;
      if (this.scratchCardsAvailable < 0) this.scratchCardsAvailable = 0;
    } else {
      // Tick
      task.done = true;
      this.totalPoints += task.points;
      const completed = this.tasks.filter(t => t.done).length;
      const totalCards = Math.floor(completed / 2);
      this.scratchCardsAvailable = totalCards - this.earnedCoupons.length;
      if (this.scratchCardsAvailable < 0) this.scratchCardsAvailable = 0;
    }
    this.save();
    return task;
  },

  getRandomCoupon() {
    if (this.scratchCardsAvailable <= 0) return null;
    this.scratchCardsAvailable--;
    const roll = Math.random();
    let pool;
    if (roll < 0.5) pool = this.coupons.filter(c => c.rarity === 'common');
    else if (roll < 0.85) pool = this.coupons.filter(c => c.rarity === 'rare');
    else pool = this.coupons.filter(c => c.rarity === 'legendary');
    const coupon = pool[Math.floor(Math.random() * pool.length)];
    this.earnedCoupons.push({ ...coupon, earnedAt: new Date().toLocaleString() });
    this.save();
    return coupon;
  },

  getCompletedCount() { return this.tasks.filter(t => t.done).length; },

  resetDaily() {
    this.tasks.forEach(t => t.done = false);
    this.totalPoints = 0;
    this.scratchCardsAvailable = 0;
    this.save();
  },

  getHealthRisks() {
    const completed = this.getCompletedCount();
    return [
      { icon: '🫀', title: 'Cardiovascular Disease', severity: Math.max(10, 90 - completed * 12), desc: 'Prolonged sitting increases heart disease risk by 147%. Blood flow slows, fatty acids accumulate in blood vessels.' },
      { icon: '🦴', title: 'Musculoskeletal Damage', severity: Math.max(10, 85 - completed * 12), desc: 'Chronic sitting weakens back muscles, compresses spinal discs, and causes irreversible posture damage over time.' },
      { icon: '🧠', title: 'Mental Health Decline', severity: Math.max(10, 70 - completed * 12), desc: 'Sedentary behavior increases risk of depression by 25% and anxiety by 20%. Movement releases endorphins your brain needs.' },
      { icon: '⚖️', title: 'Obesity & Metabolic Syndrome', severity: Math.max(10, 80 - completed * 12), desc: 'Sitting burns only 1 cal/min. Prolonged inactivity disrupts insulin regulation and fat metabolism.' },
      { icon: '🩸', title: 'Deep Vein Thrombosis', severity: Math.max(10, 75 - completed * 12), desc: 'Blood pooling in legs during extended sitting can form dangerous clots that may travel to lungs.' },
      { icon: '😴', title: 'Chronic Fatigue', severity: Math.max(10, 65 - completed * 12), desc: 'Paradoxically, less movement = more fatigue. Your body needs movement to maintain energy levels.' }
    ];
  },

  // === CONFETTI PARTY BOMB ===
  launchConfetti() {
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#a78bfa', '#fbbf24', '#34d399'];
    const shapes = ['circle', 'rect', 'star'];

    // Create explosion from center
    for (let i = 0; i < 150; i++) {
      const angle = (Math.PI * 2 * i) / 150 + Math.random() * 0.5;
      const speed = 4 + Math.random() * 10;
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        size: 4 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        gravity: 0.15 + Math.random() * 0.1,
        opacity: 1,
        decay: 0.008 + Math.random() * 0.008
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        if (p.opacity <= 0) return;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;
        p.opacity -= p.decay;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          // Star shape
          ctx.beginPath();
          for (let j = 0; j < 5; j++) {
            const a = (j * 4 * Math.PI) / 5 - Math.PI / 2;
            const r = j % 2 === 0 ? p.size / 2 : p.size / 4;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      });

      frame++;
      if (alive && frame < 180) {
        requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    };
    animate();
  }
};
