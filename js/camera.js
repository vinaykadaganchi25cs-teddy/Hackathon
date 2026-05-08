/* ========================================
   Active Pulse — AI Camera Posture Engine
   TensorFlow.js + MoveNet Pose Detection
   ======================================== */

window.ActivePulse = window.ActivePulse || {};

window.ActivePulse.CameraAI = {
  detector: null,
  video: null,
  canvas: null,
  ctx: null,
  isRunning: false,
  isModelLoaded: false,
  currentPosture: 'unknown',
  postureScore: 100,
  baselineShoulderY: null,
  frameCount: 0,
  absentFrames: 0,
  standingFrames: 0,
  sittingFrames: 0,
  lastPose: null,

  // Callbacks
  onPostureUpdate: null,
  onStandDetected: null,
  onAbsentDetected: null,
  onSlouchDetected: null,

  // Config
  CONFIDENCE_THRESHOLD: 0.3,
  SLOUCH_ANGLE_THRESHOLD: 22,
  STANDING_RATIO_THRESHOLD: 0.55,
  ABSENT_FRAME_THRESHOLD: 30,
  STANDING_FRAME_THRESHOLD: 10,
  BASELINE_FRAMES: 15,

  // Neon colors for skeleton
  COLORS: {
    good: '#10b981',
    warning: '#f59e0b',
    bad: '#ef4444',
    skeleton: '#06b6d4',
    joint: '#a78bfa'
  },

  // MoveNet keypoint connections for skeleton drawing
  SKELETON_CONNECTIONS: [
    ['left_ear', 'left_eye'], ['right_ear', 'right_eye'],
    ['left_eye', 'nose'], ['right_eye', 'nose'],
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_elbow'], ['right_shoulder', 'right_elbow'],
    ['left_elbow', 'left_wrist'], ['right_elbow', 'right_wrist'],
    ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    ['left_hip', 'left_knee'], ['right_hip', 'right_knee'],
    ['left_knee', 'left_ankle'], ['right_knee', 'right_ankle']
  ],

  async init() {
    this.canvas = document.getElementById('pose-canvas');
    this.video = document.getElementById('camera-feed');
    if (this.canvas) this.ctx = this.canvas.getContext('2d');
  },

  async loadModel() {
    if (this.isModelLoaded) return true;
    try {
      const statusEl = document.getElementById('camera-status');
      if (statusEl) statusEl.textContent = 'Loading AI Model...';

      // Wait for tf to be ready
      await tf.ready();
      await tf.setBackend('webgl');

      const model = poseDetection.SupportedModels.MoveNet;
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true
      };
      this.detector = await poseDetection.createDetector(model, detectorConfig);
      this.isModelLoaded = true;

      if (statusEl) statusEl.textContent = 'AI Model Ready ✓';
      return true;
    } catch (e) {
      console.error('Failed to load MoveNet:', e);
      const statusEl = document.getElementById('camera-status');
      if (statusEl) statusEl.textContent = 'AI Model failed to load';
      return false;
    }
  },

  async startCamera() {
    if (this.isRunning) return;
    try {
      const statusEl = document.getElementById('camera-status');
      if (statusEl) statusEl.textContent = 'Requesting camera...';

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });

      this.video.srcObject = stream;
      await this.video.play();

      // Set canvas size to match video
      this.canvas.width = this.video.videoWidth || 640;
      this.canvas.height = this.video.videoHeight || 480;

      // Load model if not loaded
      if (!this.isModelLoaded) {
        const loaded = await this.loadModel();
        if (!loaded) return;
      }

      this.isRunning = true;
      this.baselineShoulderY = null;
      this.frameCount = 0;
      this.absentFrames = 0;
      this.standingFrames = 0;
      this.sittingFrames = 0;

      if (statusEl) statusEl.textContent = 'AI Active — Analyzing Posture';
      this._detectLoop();
    } catch (e) {
      console.error('Camera error:', e);
      const statusEl = document.getElementById('camera-status');
      if (statusEl) statusEl.textContent = 'Camera access denied';
    }
  },

  stopCamera() {
    this.isRunning = false;
    if (this.video && this.video.srcObject) {
      this.video.srcObject.getTracks().forEach(t => t.stop());
      this.video.srcObject = null;
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    const statusEl = document.getElementById('camera-status');
    if (statusEl) statusEl.textContent = 'Camera Off';
  },

  async _detectLoop() {
    if (!this.isRunning || !this.detector) return;

    try {
      const poses = await this.detector.estimatePoses(this.video);

      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      if (poses && poses.length > 0 && poses[0].keypoints) {
        const keypoints = poses[0].keypoints;
        this.lastPose = keypoints;
        this.frameCount++;

        // Analyze posture
        const analysis = this._analyzePosture(keypoints);

        // Draw skeleton
        this._drawSkeleton(keypoints, analysis);

        // Draw posture HUD
        this._drawHUD(analysis);

        // Handle state changes
        this._processState(analysis);

        // Fire callback
        if (this.onPostureUpdate) {
          this.onPostureUpdate(analysis);
        }
      } else {
        // No person detected
        this.absentFrames++;
        this._drawAbsentOverlay();

        if (this.absentFrames >= this.ABSENT_FRAME_THRESHOLD) {
          // Person left - they took a break!
          if (this.onAbsentDetected) this.onAbsentDetected();
          this.absentFrames = 0; // Reset so it doesn't fire repeatedly
        }
      }
    } catch (e) {
      // Silently continue
    }

    // Next frame
    if (this.isRunning) {
      requestAnimationFrame(() => this._detectLoop());
    }
  },

  _analyzePosture(keypoints) {
    const kp = {};
    keypoints.forEach(k => { kp[k.name] = k; });

    // Check visibility of main body parts
    const mainParts = ['nose', 'left_shoulder', 'right_shoulder', 'left_hip', 'right_hip'];
    const visibleParts = mainParts.filter(p => kp[p] && kp[p].score > this.CONFIDENCE_THRESHOLD);

    if (visibleParts.length < 3) {
      this.absentFrames++;
      return { status: 'absent', postureScore: 0, angle: 0, isSlouching: false, isStanding: false };
    }

    this.absentFrames = 0;

    // Shoulder midpoint
    const lSh = kp.left_shoulder, rSh = kp.right_shoulder;
    const shoulderMidX = (lSh.score > 0.3 && rSh.score > 0.3)
      ? (lSh.x + rSh.x) / 2 : (lSh.score > rSh.score ? lSh.x : rSh.x);
    const shoulderMidY = (lSh.score > 0.3 && rSh.score > 0.3)
      ? (lSh.y + rSh.y) / 2 : (lSh.score > rSh.score ? lSh.y : rSh.y);

    // Hip midpoint
    const lHip = kp.left_hip, rHip = kp.right_hip;
    const hipMidY = (lHip.score > 0.3 && rHip.score > 0.3)
      ? (lHip.y + rHip.y) / 2 : (lHip.score > rHip.score ? lHip.y : rHip.y);

    // === SLOUCH DETECTION ===
    // Measure how far forward the nose/head is relative to shoulders
    const noseX = kp.nose.x;
    const noseY = kp.nose.y;
    const dx = noseX - shoulderMidX;
    const dy = shoulderMidY - noseY; // positive = head above shoulders

    // Forward lean angle from vertical
    const forwardAngle = Math.atan2(Math.abs(dx), Math.max(dy, 1)) * (180 / Math.PI);

    // Head drop: if nose is close to shoulder level = slouching
    const headDrop = shoulderMidY - noseY;
    const torsoLength = hipMidY - shoulderMidY;
    const headRatio = torsoLength > 0 ? headDrop / torsoLength : 1;

    // Combined slouch score
    let postureScore = 100;
    if (forwardAngle > 15) postureScore -= (forwardAngle - 15) * 2.5;
    if (headRatio < 0.3) postureScore -= 20; // Head dropping
    postureScore = Math.max(0, Math.min(100, Math.round(postureScore)));

    const isSlouching = postureScore < 60;

    // === STANDING DETECTION ===
    // Set baseline on first good frames
    if (this.frameCount <= this.BASELINE_FRAMES && this.frameCount > 3) {
      if (!this.baselineShoulderY) {
        this.baselineShoulderY = shoulderMidY;
      } else {
        // Running average
        this.baselineShoulderY = this.baselineShoulderY * 0.8 + shoulderMidY * 0.2;
      }
    }

    // Detect standing: shoulders move UP significantly from baseline
    // In video coords, Y=0 is top, so standing = smaller Y value
    let isStanding = false;
    if (this.baselineShoulderY) {
      const moveUp = this.baselineShoulderY - shoulderMidY;
      const frameH = this.canvas.height || 480;
      const moveRatio = moveUp / frameH;

      // If shoulders moved up by more than 15% of frame height = standing
      if (moveRatio > 0.15) {
        this.standingFrames++;
        if (this.standingFrames >= this.STANDING_FRAME_THRESHOLD) {
          isStanding = true;
        }
      } else {
        this.standingFrames = Math.max(0, this.standingFrames - 1);
      }

      // Also detect if torso-to-frame ratio changed (standing = taller body visible)
      const visibleHeight = hipMidY - noseY;
      const frameRatio = visibleHeight / frameH;
      if (frameRatio > this.STANDING_RATIO_THRESHOLD) {
        this.standingFrames += 2;
      }
    }

    // Check if person is stretching (arms raised above shoulders)
    const lWrist = kp.left_wrist, rWrist = kp.right_wrist;
    const armsRaised = (lWrist.score > 0.3 && lWrist.y < shoulderMidY - 30) ||
                       (rWrist.score > 0.3 && rWrist.y < shoulderMidY - 30);

    return {
      status: isStanding ? 'standing' : 'sitting',
      postureScore,
      angle: Math.round(forwardAngle),
      isSlouching,
      isStanding,
      armsRaised,
      shoulderY: shoulderMidY,
      headRatio: Math.round(headRatio * 100)
    };
  },

  _processState(analysis) {
    // Standing detected -> break taken!
    if (analysis.isStanding && this.currentPosture !== 'standing') {
      this.currentPosture = 'standing';
      if (this.onStandDetected) this.onStandDetected();
      // Reset baseline after they sit back down
      setTimeout(() => {
        this.baselineShoulderY = null;
        this.frameCount = 0;
        this.standingFrames = 0;
      }, 5000);
    }

    // Slouch detected
    if (analysis.isSlouching && this.currentPosture !== 'slouching') {
      this.currentPosture = 'slouching';
      if (this.onSlouchDetected) this.onSlouchDetected(analysis.postureScore);
    }

    // Good posture
    if (!analysis.isSlouching && !analysis.isStanding && analysis.status !== 'absent') {
      this.currentPosture = 'good';
    }
  },

  _drawSkeleton(keypoints, analysis) {
    const ctx = this.ctx;
    const kpMap = {};
    keypoints.forEach(k => { kpMap[k.name] = k; });

    // Choose color based on posture
    let lineColor = this.COLORS.good;
    if (analysis.isSlouching) lineColor = this.COLORS.bad;
    else if (analysis.postureScore < 80) lineColor = this.COLORS.warning;

    // Draw connections
    ctx.lineWidth = 3;
    ctx.strokeStyle = lineColor;
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 8;

    this.SKELETON_CONNECTIONS.forEach(([a, b]) => {
      const kpA = kpMap[a], kpB = kpMap[b];
      if (kpA && kpB && kpA.score > this.CONFIDENCE_THRESHOLD && kpB.score > this.CONFIDENCE_THRESHOLD) {
        ctx.beginPath();
        ctx.moveTo(kpA.x, kpA.y);
        ctx.lineTo(kpB.x, kpB.y);
        ctx.stroke();
      }
    });

    // Draw joints
    ctx.shadowBlur = 12;
    keypoints.forEach(kp => {
      if (kp.score > this.CONFIDENCE_THRESHOLD) {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = this.COLORS.joint;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    ctx.shadowBlur = 0;
  },

  _drawHUD(analysis) {
    const ctx = this.ctx;
    const w = this.canvas.width;

    // Background bar at top
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, 44);

    // Posture label
    ctx.font = 'bold 14px Inter, sans-serif';
    let label, color;
    if (analysis.isStanding) {
      label = '🧍 STANDING — Break Taken!'; color = this.COLORS.good;
    } else if (analysis.isSlouching) {
      label = '⚠️ SLOUCHING — Fix Your Posture!'; color = this.COLORS.bad;
    } else if (analysis.armsRaised) {
      label = '🙌 STRETCHING — Great Job!'; color = this.COLORS.good;
    } else {
      label = '✅ GOOD POSTURE'; color = this.COLORS.good;
    }
    ctx.fillStyle = color;
    ctx.fillText(label, 12, 28);

    // Score on right
    ctx.fillStyle = analysis.postureScore >= 70 ? this.COLORS.good : this.COLORS.bad;
    ctx.textAlign = 'right';
    ctx.fillText(`Posture Score: ${analysis.postureScore}/100`, w - 12, 28);
    ctx.textAlign = 'left';

    // Angle indicator
    if (analysis.angle > 0) {
      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(`Head tilt: ${analysis.angle}°`, 12, 42);
    }
  },

  _drawAbsentOverlay() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, w, h);

    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'center';
    ctx.fillText('👤 No person detected', w / 2, h / 2 - 10);
    ctx.font = '14px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('Sit in front of the camera to begin', w / 2, h / 2 + 15);
    ctx.textAlign = 'left';
  },

  getStatus() {
    return {
      isRunning: this.isRunning,
      isModelLoaded: this.isModelLoaded,
      currentPosture: this.currentPosture,
      postureScore: this.postureScore
    };
  }
};
