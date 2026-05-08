/* ========================================
   Active Pulse — Particle Background
   Animated starfield/particle canvas
   ======================================== */

window.ActivePulse = window.ActivePulse || {};

window.ActivePulse.Particles = {
  canvas: null,
  ctx: null,
  particles: [],
  connections: [],
  mouse: { x: -1000, y: -1000 },
  animId: null,
  COUNT: 80,
  MAX_DIST: 150,

  init() {
    this.canvas = document.getElementById('bg-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.createParticles();
    this.bindEvents();
    this.animate();
  },

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  },

  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.COUNT; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2 + 0.5,
        color: this.randomColor(),
        alpha: Math.random() * 0.5 + 0.2
      });
    }
  },

  randomColor() {
    const colors = [
      '124,58,237',   // purple
      '6,182,212',    // cyan
      '236,72,153',   // pink
      '99,102,241',   // indigo
      '16,185,129'    // green
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach((p, i) => {
      // Move
      p.x += p.vx;
      p.y += p.vy;

      // Wrap
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      // Mouse attraction
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 200) {
        p.vx += dx * 0.00008;
        p.vy += dy * 0.00008;
      }

      // Dampen velocity
      p.vx *= 0.999;
      p.vy *= 0.999;

      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      this.ctx.fill();

      // Connections
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const d = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
        if (d < this.MAX_DIST) {
          const alpha = (1 - d / this.MAX_DIST) * 0.15;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(${p.color},${alpha})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }
    });

    this.animId = requestAnimationFrame(() => this.animate());
  }
};
