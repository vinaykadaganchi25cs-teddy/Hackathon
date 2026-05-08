/* ========================================
   Active Pulse — 3D WebGL Background
   Floating geometry with depth, glow & parallax
   ======================================== */

window.ActivePulse = window.ActivePulse || {};

window.ActivePulse.Particles = {
  canvas: null,
  gl: null,
  program: null,
  animId: null,
  startTime: 0,
  mouse: { x: 0, y: 0 },

  // Vertex shader: 3D perspective, rotation, depth-based size
  VERT: `
    attribute vec3 aPos;
    attribute float aSize;
    attribute vec3 aColor;
    attribute float aSpeed;
    attribute float aPhase;
    attribute float aShape;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform vec2 uRes;
    varying vec3 vColor;
    varying float vAlpha;
    varying float vShape;

    void main() {
      float t = uTime * aSpeed;
      
      // Orbital motion in 3D
      float x = aPos.x + sin(t + aPhase) * 0.3;
      float y = aPos.y + cos(t * 0.7 + aPhase * 1.3) * 0.25;
      float z = aPos.z + sin(t * 0.5 + aPhase * 0.7) * 0.4;
      
      // Mouse parallax (subtle)
      x += uMouse.x * (0.05 + aPos.z * 0.02);
      y += uMouse.y * (0.05 + aPos.z * 0.02);
      
      // Wrap z for infinite depth feel
      z = mod(z + 3.0, 6.0) - 3.0;
      
      // Perspective projection
      float perspective = 1.0 / (z + 4.0);
      float aspect = uRes.x / uRes.y;
      
      gl_Position = vec4(x * perspective / aspect, y * perspective, z * 0.1, 1.0);
      gl_PointSize = aSize * perspective * min(uRes.x, uRes.y) * 0.8;
      
      // Depth-based fog
      float depth = smoothstep(3.0, -2.0, z);
      vAlpha = depth * 0.7;
      vColor = aColor;
      vShape = aShape;
    }
  `,

  // Fragment shader: glowing soft shapes
  FRAG: `
    precision mediump float;
    varying vec3 vColor;
    varying float vAlpha;
    varying float vShape;

    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float dist = length(uv);
      
      float alpha;
      if (vShape < 0.33) {
        // Circle with glow
        alpha = smoothstep(0.5, 0.1, dist);
      } else if (vShape < 0.66) {
        // Soft diamond
        float d = abs(uv.x) + abs(uv.y);
        alpha = smoothstep(0.5, 0.1, d);
      } else {
        // Ring
        float ring = abs(dist - 0.3);
        alpha = smoothstep(0.15, 0.0, ring);
      }
      
      // Glow
      float glow = exp(-dist * 4.0) * 0.5;
      alpha += glow;
      
      gl_FragColor = vec4(vColor, alpha * vAlpha);
    }
  `,

  init() {
    this.canvas = document.getElementById('bg-canvas');
    if (!this.canvas) return;

    // Try WebGL, fall back to 2D if not supported
    this.gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true });
    if (!this.gl) {
      console.warn('WebGL not supported, using 2D fallback');
      this._init2DFallback();
      return;
    }

    this.resize();
    this._setupShaders();
    this._createGeometry();
    this._bindEvents();
    this.startTime = performance.now();
    this._animate();
  },

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
  },

  _bindEvents() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
  },

  _compileShader(src, type) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader error:', gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  },

  _setupShaders() {
    const gl = this.gl;
    const vs = this._compileShader(this.VERT, gl.VERTEX_SHADER);
    const fs = this._compileShader(this.FRAG, gl.FRAGMENT_SHADER);
    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);
    gl.useProgram(this.program);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  },

  _createGeometry() {
    const gl = this.gl;
    const COUNT = 120;

    // Colors matching the theme
    const palette = [
      [0.39, 0.23, 0.93],  // purple
      [0.02, 0.71, 0.83],  // cyan
      [0.93, 0.28, 0.60],  // pink
      [0.39, 0.40, 0.95],  // indigo
      [0.06, 0.73, 0.50],  // green
      [0.65, 0.55, 0.98],  // lavender
      [0.96, 0.62, 0.04],  // amber
    ];

    const positions = [];
    const sizes = [];
    const colors = [];
    const speeds = [];
    const phases = [];
    const shapes = [];

    for (let i = 0; i < COUNT; i++) {
      // Spread particles in 3D space
      positions.push(
        (Math.random() - 0.5) * 4,   // x: -2 to 2
        (Math.random() - 0.5) * 4,   // y: -2 to 2
        (Math.random() - 0.5) * 6    // z: -3 to 3 (depth)
      );
      sizes.push(0.01 + Math.random() * 0.04);
      
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors.push(c[0], c[1], c[2]);
      
      speeds.push(0.1 + Math.random() * 0.4);
      phases.push(Math.random() * Math.PI * 2);
      shapes.push(Math.random());
    }

    this.particleCount = COUNT;

    // Create buffers
    this._createBuffer('aPos', new Float32Array(positions), 3);
    this._createBuffer('aSize', new Float32Array(sizes), 1);
    this._createBuffer('aColor', new Float32Array(colors), 3);
    this._createBuffer('aSpeed', new Float32Array(speeds), 1);
    this._createBuffer('aPhase', new Float32Array(phases), 1);
    this._createBuffer('aShape', new Float32Array(shapes), 1);

    // Get uniform locations
    this.uTime = gl.getUniformLocation(this.program, 'uTime');
    this.uMouse = gl.getUniformLocation(this.program, 'uMouse');
    this.uRes = gl.getUniformLocation(this.program, 'uRes');
  },

  _createBuffer(name, data, size) {
    const gl = this.gl;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.program, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  },

  _animate() {
    const gl = this.gl;
    const t = (performance.now() - this.startTime) / 1000;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform1f(this.uTime, t);
    gl.uniform2f(this.uMouse, this.mouse.x, this.mouse.y);
    gl.uniform2f(this.uRes, this.canvas.width, this.canvas.height);

    gl.drawArrays(gl.POINTS, 0, this.particleCount);

    this.animId = requestAnimationFrame(() => this._animate());
  },

  // === 2D Canvas Fallback (for browsers without WebGL) ===
  _init2DFallback() {
    const ctx = this.canvas.getContext('2d');
    const W = this.canvas.width = window.innerWidth;
    const H = this.canvas.height = window.innerHeight;
    
    const palette = ['124,58,237','6,182,212','236,72,153','99,102,241','16,185,129'];
    const particles = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        z: Math.random() * 3 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5,
        color: palette[Math.floor(Math.random() * palette.length)],
        alpha: Math.random() * 0.5 + 0.2
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        const s = p.r * (1 + p.z * 0.5);
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.alpha / p.z})`;
        ctx.fill();
      });
      requestAnimationFrame(animate);
    };
    window.addEventListener('resize', () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    });
    animate();
  }
};
