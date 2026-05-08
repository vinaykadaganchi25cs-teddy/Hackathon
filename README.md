# 💓 Active Pulse — Sedentary Behavior Intelligence Platform

> **Problem Statement 9: The Sedentary Generation**  
> Real-time sedentary behavior detection, analysis, and intervention system.

---

## 🎯 What It Does

Active Pulse is a web-based platform that uses **real device sensors** (accelerometer via the Web DeviceMotion API) to detect sedentary behavior in real-time and provide actionable health insights.

### Key Features

| Feature | Description |
|---------|-------------|
| **📡 Live Monitor** | Real-time motion detection using phone/laptop sensors with live charting |
| **📊 Analytics Dashboard** | 30-day activity history with daily timelines, weekly patterns, and trend analysis |
| **⚠️ Risk Assessment** | 8-question weighted questionnaire with composite risk scoring and radar visualization |
| **💡 Smart Insights** | AI-style natural language analysis of sedentary patterns and personalized recommendations |
| **🔔 Break Alerts** | Automatic notification after 60 minutes of continuous inactivity |
| **🖥️ Desktop Fallback** | Mouse/keyboard idle detection when no accelerometer is available |

---

## 🛠️ Tech Stack

- **HTML5** — Semantic structure
- **CSS3** — Custom dark-mode design system with glassmorphism
- **Vanilla JavaScript** — No frameworks, zero dependencies (except Chart.js)
- **Chart.js 4** — Animated data visualizations (6 chart types)
- **Web DeviceMotion API** — Real-time accelerometer access
- **LocalStorage** — Client-side data persistence

**No backend required. No build step. Just open `index.html`.**

---

## 🚀 How to Run

1. Open `index.html` in any modern browser
2. For sensor demo: open on a **mobile phone** or use Chrome DevTools sensor emulation
3. Navigate between sections using the sidebar

---

## 📐 Architecture

```
index.html          → Single Page Application entry
css/styles.css      → Complete design system
js/data.js          → 30-day simulated data generator
js/sensors.js       → DeviceMotion API + desktop fallback
js/risk.js          → Weighted risk scoring engine
js/analytics.js     → Chart.js visualization engine
js/app.js           → SPA controller + break notifications
```

---

## 👥 Team

Built for Hackathon 2026 — Problem Statement 9: The Sedentary Generation

---

## 📄 License

MIT License
