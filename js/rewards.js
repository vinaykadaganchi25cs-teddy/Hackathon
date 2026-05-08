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
    { code: 'STEPUP10', reward: '10% Off Running Shoes', rarity: 'common', emoji: '👟' },
    { code: 'GREENTEA', reward: '15% Off Organic Green Tea', rarity: 'common', emoji: '🍵' },
    { code: 'FLEXFIT30', reward: '30% Off Online Yoga Classes', rarity: 'rare', emoji: '🎯' },
    { code: 'WELLNESS50', reward: '50% Off Wellness App Premium', rarity: 'rare', emoji: '⭐' },
    { code: 'FITBAND40', reward: '40% Off Smart Fitness Band', rarity: 'rare', emoji: '⌚' },
    { code: 'MASSAGEPRO', reward: '35% Off Massage Gun', rarity: 'rare', emoji: '💆' },
    { code: 'ERGODESK', reward: '25% Off Standing Desk', rarity: 'rare', emoji: '🖥️' },
    { code: 'CHAMPION100', reward: 'FREE Month Gym Membership', rarity: 'legendary', emoji: '🏆' },
    { code: 'VITABOOST', reward: 'FREE Vitamin Subscription Box', rarity: 'legendary', emoji: '🎁' },
    { code: 'ULTRAMOVE', reward: 'FREE Ergonomic Desk Chair', rarity: 'legendary', emoji: '👑' },
    { code: 'FITWATCH', reward: 'FREE Premium Fitness Watch', rarity: 'legendary', emoji: '⌚' }
  ],

  SCRATCH_COST: 30, // Points needed per scratch card

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
      task.done = false;
      this.totalPoints = Math.max(0, this.totalPoints - task.points);
    } else {
      task.done = true;
      this.totalPoints += task.points;
    }
    // Points-based scratch cards: every 30 points = 1 card
    const totalEarned = Math.floor(this.totalPoints / this.SCRATCH_COST);
    this.scratchCardsAvailable = Math.max(0, totalEarned - this.earnedCoupons.length);
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

  getRiskTiers() {
    return {
      normal: {
        title: '🟢 Normal Risk — 1 Day Missed',
        subtitle: 'These early signs may appear. They\'re usually reversible if you act soon.',
        color: '#10b981',
        risks: [
          { icon: '🪑', title: 'Neck & Shoulder Stiffness', desc: 'You may start to feel tightness in your neck and upper shoulders from poor posture. This could develop into tension headaches if not addressed.' },
          { icon: '😶‍🌫️', title: 'Reduced Concentration', desc: 'Your focus might dip after prolonged inactivity. Studies suggest sitting for 6+ hours may reduce cognitive performance by up to 15%.' },
          { icon: '👁️', title: 'Eye Strain & Dryness', desc: 'Extended screen time without breaks could lead to digital eye strain, blurred vision, and discomfort that may persist into the evening.' },
          { icon: '🥱', title: 'Mild Fatigue', desc: 'You might feel unusually tired despite sleeping well. Lack of movement can reduce blood oxygen levels, potentially leaving you sluggish.' },
          { icon: '🍔', title: 'Snacking Urge', desc: 'Prolonged sitting may trigger idle snacking habits. This could contribute to excess calorie intake without you realizing it.' }
        ]
      },
      moderate: {
        title: '🟡 Moderate Risk — 3 to 7 Days Missed',
        subtitle: 'Your body may be adapting to inactivity. These conditions could become harder to reverse.',
        color: '#f59e0b',
        risks: [
          { icon: '🦴', title: 'Chronic Lower Back Pain', desc: 'Sitting for multiple days without movement may cause spinal disc compression. This could eventually lead to chronic pain that limits your mobility.' },
          { icon: '⚖️', title: 'Metabolic Slowdown', desc: 'Your metabolism might slow by up to 50% after several sedentary days. Fat-burning enzyme activity could drop significantly, potentially affecting weight management.' },
          { icon: '🩸', title: 'Blood Sugar Instability', desc: 'Insulin sensitivity may decrease after just a few days of inactivity. This could lead to energy crashes and increased hunger throughout the day.' },
          { icon: '🧍', title: 'Posture Degradation', desc: 'Without regular movement, your shoulders may round forward and your hip flexors could tighten. These changes might become semi-permanent over time.' },
          { icon: '😴', title: 'Sleep Quality Decline', desc: 'Physical inactivity during the day may disrupt your circadian rhythm, potentially causing difficulty falling asleep or staying asleep.' },
          { icon: '💪', title: 'Early Muscle Weakening', desc: 'Core and leg muscles you don\'t use may begin to lose tone. This could affect your balance and make everyday tasks feel more tiring.' }
        ]
      },
      high: {
        title: '🔴 High Risk — 2+ Weeks Missed',
        subtitle: 'Prolonged inactivity at this level is associated with serious health concerns. Please consider consulting a healthcare professional.',
        color: '#ef4444',
        risks: [
          { icon: '🫀', title: 'Cardiovascular Disease Risk', desc: 'Research suggests prolonged sedentary behavior may increase heart disease risk by up to 147%. Blood flow slows, and fatty acid buildup in vessels could accelerate.' },
          { icon: '🧬', title: 'Type 2 Diabetes Risk', desc: 'Studies indicate that extended inactivity could increase Type 2 diabetes risk by up to 112% due to impaired insulin regulation and glucose processing.' },
          { icon: '🩸', title: 'Deep Vein Thrombosis (DVT)', desc: 'Blood pooling in the legs from extended sitting may lead to dangerous blood clots. In rare cases, these could travel to the lungs, causing a pulmonary embolism.' },
          { icon: '🦴', title: 'Spinal Disc Damage', desc: 'Chronic sitting may compress spinal discs unevenly, potentially leading to herniation. This kind of structural damage can be very difficult to reverse.' },
          { icon: '🧠', title: 'Depression & Anxiety Risk', desc: 'Sedentary behavior is associated with a 25% higher risk of depression and 20% higher anxiety risk. Lack of movement may reduce endorphin and serotonin production.' },
          { icon: '💀', title: 'Muscle Atrophy', desc: 'Without regular use, major muscle groups may begin to waste. Studies suggest you could lose up to 1% of muscle mass per day when completely inactive.' }
        ]
      }
    };
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
