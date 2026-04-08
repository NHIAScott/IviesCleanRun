import { useState, useEffect, useRef, useCallback } from "react";

const GAME_WIDTH = 390;
const GAME_HEIGHT = 700;
const IVIE_SIZE = 56;
const ENEMY_SIZE = 36;
const POWERUP_SIZE = 30;
const MOVE_SPEED = 6;

const COMBO_TIERS = [
  { threshold: 100, multiplier: 5, label: "ULTRA CLEAN x5", color: "#FFD700" },
  { threshold: 50, multiplier: 3, label: "STERILE STREAK x3", color: "#2ED573" },
  { threshold: 25, multiplier: 2, label: "CLEAN STREAK x2", color: "#29ABE2" },
];

function getComboMultiplier(streak) {
  for (const tier of COMBO_TIERS) {
    if (streak >= tier.threshold) return tier;
  }
  return { threshold: 0, multiplier: 1, label: "", color: "" };
}

const LEVELS = [
  {
    id: 1,
    name: "The Cleanroom",
    subtitle: "Pharmacy Compounding",
    bg: "linear-gradient(180deg, #e8f4f8 0%, #d0eaf2 40%, #b8dde8 100%)",
    description: "Dodge bacteria & mold in the compounding area!",
    enemies: [
      { type: "bacteria", emoji: "🦠", speed: 2.2, size: 34, spin: true },
      { type: "mold", emoji: "🍄", speed: 1.6, size: 32, spin: false },
      { type: "dust", emoji: "💨", speed: 2.8, size: 28, spin: false },
    ],
    powerup: { emoji: "🧤", name: "Sterile Gloves", effect: "shield" },
    baseSpawnRate: 1200,
    spawnVariance: 300,
    targetScore: 200,
  },
  {
    id: 2,
    name: "In Transit",
    subtitle: "Delivery Route",
    bg: "linear-gradient(180deg, #87CEEB 0%, #B0E0E6 30%, #d4d4d4 70%, #999 100%)",
    description: "Survive the journey to the patient!",
    enemies: [
      { type: "heat", emoji: "🌡️", speed: 2.5, size: 34, spin: false },
      { type: "pothole", emoji: "💥", speed: 3.2, size: 36, spin: false },
      { type: "sun", emoji: "☀️", speed: 1.8, size: 40, spin: true },
      { type: "rain", emoji: "🌧️", speed: 3.5, size: 30, spin: false },
    ],
    powerup: { emoji: "❄️", name: "Cold Pack", effect: "freeze" },
    baseSpawnRate: 1000,
    spawnVariance: 250,
    targetScore: 300,
  },
  {
    id: 3,
    name: "Patient's Home",
    subtitle: "Safe Delivery",
    bg: "linear-gradient(180deg, #FFF8E7 0%, #FFECD2 40%, #f5e1c8 100%)",
    description: "Keep Ivie safe for the patient!",
    enemies: [
      { type: "pet", emoji: "🐱", speed: 3.0, size: 36, spin: false },
      { type: "germ", emoji: "🦠", speed: 2.6, size: 30, spin: true },
      { type: "spill", emoji: "💧", speed: 2.0, size: 32, spin: false },
      { type: "dust2", emoji: "🌫️", speed: 3.4, size: 34, spin: false },
    ],
    powerup: { emoji: "🧴", name: "Hand Sanitizer", effect: "blast" },
    baseSpawnRate: 850,
    spawnVariance: 200,
    targetScore: 400,
  },
];

function drawIvie(ctx, x, y, size, shieldActive, frame) {
  const s = size;
  const cx = x + s / 2;
  const cy = y + s / 2;
  const bob = Math.sin(frame * 0.08) * 2;

  ctx.save();
  ctx.translate(0, bob);

  const bagW = s * 0.82;
  const bagH = s * 0.88;
  const bagX = cx - bagW / 2;
  const bagY = y + s * 0.08;

  ctx.beginPath();
  ctx.roundRect(bagX, bagY, bagW, bagH, [s * 0.12, s * 0.12, s * 0.06, s * 0.06]);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fill();
  ctx.strokeStyle = "rgba(200,210,220,0.6)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const fluidY = bagY + bagH * 0.28;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(bagX + 2, fluidY, bagW - 4, bagH * 0.68, [0, 0, s * 0.05, s * 0.05]);
  ctx.clip();
  const fluidGrad = ctx.createLinearGradient(bagX, fluidY, bagX, bagY + bagH);
  fluidGrad.addColorStop(0, "#FFD4CC");
  fluidGrad.addColorStop(1, "#FFB8AA");
  ctx.fillStyle = fluidGrad;
  ctx.fillRect(bagX, fluidY, bagW, bagH);
  ctx.restore();

  const bandY = bagY + bagH * 0.12;
  const bandH = bagH * 0.2;
  ctx.beginPath();
  ctx.rect(bagX + 1, bandY, bagW - 2, bandH);
  const bandGrad = ctx.createLinearGradient(bagX, bandY, bagX, bandY + bandH);
  bandGrad.addColorStop(0, "#29ABE2");
  bandGrad.addColorStop(1, "#1C8FC0");
  ctx.fillStyle = bandGrad;
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${s * 0.16}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("NHIA", cx, bandY + bandH / 2);

  const eyeY = bagY + bagH * 0.48;
  const eyeSpacing = s * 0.15;
  const eyeR = s * 0.09;
  [cx - eyeSpacing, cx + eyeSpacing].forEach((ex) => {
    ctx.beginPath();
    ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ex, eyeY, eyeR * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = "#2288CC";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex, eyeY, eyeR * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a2e";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + eyeR * 0.2, eyeY - eyeR * 0.25, eyeR * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    for (let i = -2; i <= 2; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 10;
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(angle) * eyeR, eyeY + Math.sin(angle) * eyeR);
      ctx.lineTo(ex + Math.cos(angle) * (eyeR + 4), eyeY + Math.sin(angle) * (eyeR + 4));
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  });

  ctx.beginPath();
  ctx.arc(cx, eyeY + s * 0.1, s * 0.08, 0.1, Math.PI - 0.1);
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(cx - s * 0.08, bagY - s * 0.06, s * 0.16, s * 0.1, 3);
  ctx.fillStyle = "#29ABE2";
  ctx.fill();

  [-1, 0, 1].forEach((i) => {
    ctx.beginPath();
    ctx.arc(cx + i * s * 0.15, bagY + bagH + s * 0.02, s * 0.04, 0, Math.PI * 2);
    ctx.fillStyle = "#29ABE2";
    ctx.fill();
  });

  if (shieldActive) {
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.6, 0, Math.PI * 2);
    const shieldGrad = ctx.createRadialGradient(cx, cy, s * 0.3, cx, cy, s * 0.6);
    shieldGrad.addColorStop(0, "rgba(41,171,226,0.0)");
    shieldGrad.addColorStop(0.7, "rgba(41,171,226,0.15)");
    shieldGrad.addColorStop(1, "rgba(41,171,226,0.35)");
    ctx.fillStyle = shieldGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(41,171,226,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

function drawEnemy(ctx, enemy, frame) {
  ctx.save();
  const cx = enemy.x + enemy.size / 2;
  const cy = enemy.y + enemy.size / 2;
  if (enemy.spin) {
    ctx.translate(cx, cy);
    ctx.rotate(frame * 0.04);
    ctx.translate(-cx, -cy);
  }
  ctx.beginPath();
  ctx.ellipse(cx, enemy.y + enemy.size + 2, enemy.size * 0.35, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fill();
  ctx.font = `${enemy.size}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(enemy.emoji, cx, cy);
  ctx.restore();
}

function drawPowerup(ctx, p, frame) {
  ctx.save();
  const cx = p.x + POWERUP_SIZE / 2;
  const cy = p.y + POWERUP_SIZE / 2;
  const pulse = 1 + Math.sin(frame * 0.1) * 0.1;
  ctx.beginPath();
  ctx.arc(cx, cy, POWERUP_SIZE * 0.7 * pulse, 0, Math.PI * 2);
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, POWERUP_SIZE * 0.7);
  glow.addColorStop(0, "rgba(255,215,0,0.4)");
  glow.addColorStop(1, "rgba(255,215,0,0)");
  ctx.fillStyle = glow;
  ctx.fill();
  ctx.font = `${POWERUP_SIZE * pulse}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(p.emoji, cx, cy);
  ctx.restore();
}

function drawBgCleanroom(ctx, w, h, frame) {
  ctx.strokeStyle = "rgba(41,171,226,0.06)";
  ctx.lineWidth = 1;
  for (let i = 0; i < w; i += 40) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
  }
  for (let i = 0; i < h; i += 40) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const px = ((i * 53 + frame * 0.3) % w);
    const py = ((i * 97 + frame * 0.5) % h);
    ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(41,171,226,0.12)"; ctx.fill();
  }
}

function drawBgRoad(ctx, w, h, frame) {
  ctx.fillStyle = "#777";
  ctx.fillRect(w * 0.15, 0, w * 0.7, h);
  ctx.setLineDash([30, 20]);
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.lineDashOffset = -(frame * 3) % 50;
  ctx.moveTo(w * 0.5, 0); ctx.lineTo(w * 0.5, h); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#eee";
  ctx.fillRect(w * 0.15, 0, 4, h);
  ctx.fillRect(w * 0.85 - 4, 0, 4, h);
}

function drawBgHome(ctx, w, h, frame) {
  ctx.fillStyle = "#e8d5b8";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(180,150,110,0.3)";
  ctx.lineWidth = 1;
  for (let i = 0; i < h; i += 35) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
  }
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#8B4513";
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.7, w * 0.35, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles(ctx, particles) {
  particles.forEach((p) => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}

// Simple seeded RNG for per-run obstacle density variation
function createRNG(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export default function IviesCleanRun() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState("menu");
  const [currentLevel, setCurrentLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(0);
  const [showTutorial, setShowTutorial] = useState(true);

  const gameRef = useRef({
    ivie: { x: GAME_WIDTH / 2 - IVIE_SIZE / 2, y: GAME_HEIGHT - 120 },
    enemies: [],
    powerups: [],
    particles: [],
    frame: 0,
    score: 0,
    lives: 3,
    shield: 0,
    freeze: 0,
    lastSpawn: 0,
    lastPowerup: 0,
    touchStartX: null,
    ivieStartX: null,
    level: 0,
    combo: 0,
    bestCombo: 0,
    hitFlash: 0,
    levelScore: 0,
    screenShake: 0,
    rng: null,
    nextSpawnInterval: 0,
    comboPopup: null,
    totalDodged: 0,
  });
  const animRef = useRef(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayLives, setDisplayLives] = useState(3);
  const [displayShield, setDisplayShield] = useState(false);
  const [displayCombo, setDisplayCombo] = useState(0);
  const [displayMultiplier, setDisplayMultiplier] = useState(1);
  const [levelProgress, setLevelProgress] = useState(0);
  const [comboAlert, setComboAlert] = useState(null);

  const containerRef = useRef(null);
  const scaleRef = useRef(1);

  useEffect(() => {
    function resize() {
      if (containerRef.current) {
        scaleRef.current = Math.min(containerRef.current.clientWidth / GAME_WIDTH, 1);
      }
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const getRandomizedSpawnInterval = useCallback((g) => {
    const level = LEVELS[g.level];
    const baseRate = level.baseSpawnRate - g.levelScore * 0.8;
    const clampedBase = Math.max(baseRate, 400);
    const variance = level.spawnVariance;
    const offset = (g.rng() - 0.5) * 2 * variance;
    return Math.max(clampedBase + offset, 250) / 16.67;
  }, []);

  const spawnEnemy = useCallback((g) => {
    const level = LEVELS[g.level];
    const template = level.enemies[Math.floor(g.rng() * level.enemies.length)];
    const speedMult = 1 + g.levelScore / 800;
    // ~18% chance to spawn a pair for density variation
    const doubleSpawn = g.rng() > 0.82;
    const count = doubleSpawn ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const t = i === 0 ? template : level.enemies[Math.floor(g.rng() * level.enemies.length)];
      g.enemies.push({
        x: g.rng() * (GAME_WIDTH - ENEMY_SIZE - 20) + 10,
        y: -ENEMY_SIZE - (i * 40),
        speed: (t.speed + g.rng() * 0.8) * speedMult,
        ...t,
        wobble: g.rng() * Math.PI * 2,
        wobbleAmp: g.rng() * 1.5,
        id: g.frame + i,
      });
    }
  }, []);

  const spawnPowerup = useCallback((g) => {
    const level = LEVELS[g.level];
    g.powerups.push({
      x: g.rng() * (GAME_WIDTH - POWERUP_SIZE - 20) + 10,
      y: -POWERUP_SIZE,
      speed: 1.8,
      emoji: level.powerup.emoji,
      effect: level.powerup.effect,
    });
  }, []);

  const addParticles = useCallback((x, y, color, count = 6) => {
    const g = gameRef.current;
    for (let i = 0; i < count; i++) {
      g.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2,
        r: Math.random() * 4 + 2,
        alpha: 1,
        color,
        life: 30 + Math.random() * 20,
      });
    }
  }, []);

  const checkComboThreshold = useCallback((g) => {
    for (const t of COMBO_TIERS) {
      if (g.combo === t.threshold) {
        setComboAlert({ label: t.label, color: t.color });
        g.comboPopup = { label: t.label, color: t.color, timer: 120 };
        setTimeout(() => setComboAlert(null), 2000);
        break;
      }
    }
  }, []);

  const startLevel = useCallback((lvl) => {
    const g = gameRef.current;
    g.ivie = { x: GAME_WIDTH / 2 - IVIE_SIZE / 2, y: GAME_HEIGHT - 120 };
    g.enemies = [];
    g.powerups = [];
    g.particles = [];
    g.lastSpawn = 0;
    g.lastPowerup = 0;
    g.shield = 0;
    g.freeze = 0;
    g.level = lvl;
    g.levelScore = 0;
    g.hitFlash = 0;
    g.screenShake = 0;
    g.nextSpawnInterval = getRandomizedSpawnInterval(g);
    g.comboPopup = null;
    setCurrentLevel(lvl);
    setLevelProgress(0);
    setComboAlert(null);
    setGameState("levelIntro");
    setTimeout(() => setGameState("playing"), 4500);
  }, [getRandomizedSpawnInterval]);

  const startGame = useCallback(() => {
    const seed = Date.now() & 0xffffffff;
    const g = gameRef.current;
    g.score = 0;
    g.lives = 3;
    g.frame = 0;
    g.combo = 0;
    g.bestCombo = 0;
    g.totalDodged = 0;
    g.rng = createRNG(seed);
    setScore(0);
    setLives(3);
    setDisplayScore(0);
    setDisplayLives(3);
    setDisplayCombo(0);
    setDisplayMultiplier(1);
    setShowTutorial(false);
    startLevel(0);
  }, [startLevel]);

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function gameLoop() {
      const g = gameRef.current;
      g.frame++;
      const level = LEVELS[g.level];

      // Spawn enemies with randomized intervals
      if (g.frame - g.lastSpawn > g.nextSpawnInterval) {
        spawnEnemy(g);
        g.lastSpawn = g.frame;
        g.nextSpawnInterval = getRandomizedSpawnInterval(g);
      }

      // Spawn powerups
      if (g.frame - g.lastPowerup > 600) {
        spawnPowerup(g);
        g.lastPowerup = g.frame;
      }

      // Score increment with combo multiplier
      if (g.frame % 6 === 0) {
        const tier = getComboMultiplier(g.combo);
        g.score += tier.multiplier;
        g.levelScore++;
        setDisplayScore(g.score);
        setDisplayMultiplier(tier.multiplier);
        setLevelProgress(Math.min(g.levelScore / level.targetScore, 1));
      }

      // Combo popup timer
      if (g.comboPopup && g.comboPopup.timer > 0) g.comboPopup.timer--;

      // Shield/freeze timers
      if (g.shield > 0) g.shield--;
      if (g.freeze > 0) g.freeze--;
      setDisplayShield(g.shield > 0);

      if (g.hitFlash > 0) g.hitFlash--;
      if (g.screenShake > 0) g.screenShake--;

      // Move enemies
      const freezeMult = g.freeze > 0 ? 0.2 : 1;
      g.enemies.forEach((e) => {
        e.y += e.speed * freezeMult;
        e.x += Math.sin(e.wobble + g.frame * 0.03) * e.wobbleAmp;
      });

      g.powerups.forEach((p) => { p.y += p.speed; });

      g.particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.15;
        p.alpha -= 1 / p.life; p.r *= 0.97;
      });
      g.particles = g.particles.filter((p) => p.alpha > 0);

      const ivieBox = {
        x: g.ivie.x + 8, y: g.ivie.y + 8,
        w: IVIE_SIZE - 16, h: IVIE_SIZE - 16,
      };

      // Enemy collisions
      g.enemies = g.enemies.filter((e) => {
        if (e.y > GAME_HEIGHT + 20) {
          // Successfully dodged — increment streak
          g.combo++;
          g.totalDodged++;
          if (g.combo > g.bestCombo) g.bestCombo = g.combo;
          setDisplayCombo(g.combo);
          checkComboThreshold(g);
          return false;
        }
        const eBox = { x: e.x + 4, y: e.y + 4, w: e.size - 8, h: e.size - 8 };
        const hit =
          ivieBox.x < eBox.x + eBox.w &&
          ivieBox.x + ivieBox.w > eBox.x &&
          ivieBox.y < eBox.y + eBox.h &&
          ivieBox.y + ivieBox.h > eBox.y;
        if (hit) {
          if (g.shield > 0) {
            addParticles(e.x + e.size / 2, e.y + e.size / 2, "#29ABE2", 8);
            g.combo++;
            g.totalDodged++;
            if (g.combo > g.bestCombo) g.bestCombo = g.combo;
            setDisplayCombo(g.combo);
            checkComboThreshold(g);
            return false;
          }
          // HIT — streak broken
          g.lives--;
          g.hitFlash = 15;
          g.screenShake = 10;
          g.combo = 0;
          setDisplayCombo(0);
          setDisplayMultiplier(1);
          addParticles(g.ivie.x + IVIE_SIZE / 2, g.ivie.y + IVIE_SIZE / 2, "#FF4444", 10);
          setDisplayLives(g.lives);
          if (g.lives <= 0) {
            setScore(g.score);
            setHighScore((prev) => Math.max(prev, g.score));
            setGameState("gameOver");
          }
          return false;
        }
        return true;
      });

      // Powerup collisions
      g.powerups = g.powerups.filter((p) => {
        if (p.y > GAME_HEIGHT + 20) return false;
        const pBox = { x: p.x, y: p.y, w: POWERUP_SIZE, h: POWERUP_SIZE };
        const hit =
          ivieBox.x < pBox.x + pBox.w &&
          ivieBox.x + ivieBox.w > pBox.x &&
          ivieBox.y < pBox.y + pBox.h &&
          ivieBox.y + ivieBox.h > pBox.y;
        if (hit) {
          addParticles(p.x + POWERUP_SIZE / 2, p.y + POWERUP_SIZE / 2, "#FFD700", 12);
          if (p.effect === "shield") g.shield = 300;
          if (p.effect === "freeze") {
            g.freeze = 240;
            g.enemies.forEach((e) => addParticles(e.x + e.size / 2, e.y + e.size / 2, "#00BFFF", 4));
          }
          if (p.effect === "blast") {
            g.enemies.forEach((e) => {
              addParticles(e.x + e.size / 2, e.y + e.size / 2, "#FF6600", 6);
              g.combo++;
              g.totalDodged++;
            });
            const tier = getComboMultiplier(g.combo);
            g.score += g.enemies.length * 10 * tier.multiplier;
            if (g.combo > g.bestCombo) g.bestCombo = g.combo;
            setDisplayCombo(g.combo);
            checkComboThreshold(g);
            g.enemies = [];
          }
          g.score += 25;
          return false;
        }
        return true;
      });

      // Level completion
      if (g.levelScore >= level.targetScore) {
        if (g.level < LEVELS.length - 1) {
          startLevel(g.level + 1);
          return;
        } else {
          setScore(g.score);
          setHighScore((prev) => Math.max(prev, g.score));
          setGameState("victory");
          return;
        }
      }

      // --- RENDER ---
      ctx.save();
      if (g.screenShake > 0) {
        ctx.translate(
          (Math.random() - 0.5) * g.screenShake,
          (Math.random() - 0.5) * g.screenShake
        );
      }

      const bgGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      if (g.level === 0) {
        bgGrad.addColorStop(0, "#e8f4f8"); bgGrad.addColorStop(0.4, "#d0eaf2"); bgGrad.addColorStop(1, "#b8dde8");
      } else if (g.level === 1) {
        bgGrad.addColorStop(0, "#87CEEB"); bgGrad.addColorStop(0.3, "#B0E0E6"); bgGrad.addColorStop(0.7, "#d4d4d4"); bgGrad.addColorStop(1, "#aaa");
      } else {
        bgGrad.addColorStop(0, "#FFF8E7"); bgGrad.addColorStop(0.4, "#FFECD2"); bgGrad.addColorStop(1, "#f5e1c8");
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      if (g.level === 0) drawBgCleanroom(ctx, GAME_WIDTH, GAME_HEIGHT, g.frame);
      if (g.level === 1) drawBgRoad(ctx, GAME_WIDTH, GAME_HEIGHT, g.frame);
      if (g.level === 2) drawBgHome(ctx, GAME_WIDTH, GAME_HEIGHT, g.frame);

      if (g.hitFlash > 0) {
        ctx.fillStyle = `rgba(255,0,0,${g.hitFlash * 0.02})`;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }
      if (g.freeze > 0) {
        ctx.fillStyle = `rgba(0,191,255,${0.06 + Math.sin(g.frame * 0.1) * 0.03})`;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }

      g.powerups.forEach((p) => drawPowerup(ctx, p, g.frame));
      g.enemies.forEach((e) => drawEnemy(ctx, e, g.frame));
      drawParticles(ctx, g.particles);
      drawIvie(ctx, g.ivie.x, g.ivie.y, IVIE_SIZE, g.shield > 0, g.frame);

      // Combo popup on canvas
      if (g.comboPopup && g.comboPopup.timer > 0) {
        const alpha = Math.min(g.comboPopup.timer / 30, 1);
        const yOff = (120 - g.comboPopup.timer) * 0.3;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = g.comboPopup.color;
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 3;
        ctx.strokeText(g.comboPopup.label, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40 - yOff);
        ctx.fillText(g.comboPopup.label, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40 - yOff);
        ctx.restore();
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(gameLoop);
    }

    animRef.current = requestAnimationFrame(gameLoop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [gameState, spawnEnemy, spawnPowerup, addParticles, startLevel, getRandomizedSpawnInterval, checkComboThreshold]);

  // Touch handlers
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    gameRef.current.touchStartX = (touch.clientX - rect.left) / scaleRef.current;
    gameRef.current.ivieStartX = gameRef.current.ivie.x;
  }, []);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    if (gameRef.current.touchStartX === null) return;
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const tx = (touch.clientX - rect.left) / scaleRef.current;
    let newX = gameRef.current.ivieStartX + (tx - gameRef.current.touchStartX);
    newX = Math.max(4, Math.min(GAME_WIDTH - IVIE_SIZE - 4, newX));
    gameRef.current.ivie.x = newX;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    gameRef.current.touchStartX = null;
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (gameState !== "playing") return;
    const rect = canvasRef.current.getBoundingClientRect();
    let newX = (e.clientX - rect.left) / scaleRef.current - IVIE_SIZE / 2;
    newX = Math.max(4, Math.min(GAME_WIDTH - IVIE_SIZE - 4, newX));
    gameRef.current.ivie.x = newX;
  }, [gameState]);

  useEffect(() => {
    const handleKey = (e) => {
      if (gameState !== "playing") return;
      const g = gameRef.current;
      if (e.key === "ArrowLeft" || e.key === "a") g.ivie.x = Math.max(4, g.ivie.x - MOVE_SPEED * 3);
      if (e.key === "ArrowRight" || e.key === "d") g.ivie.x = Math.min(GAME_WIDTH - IVIE_SIZE - 4, g.ivie.x + MOVE_SPEED * 3);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState]);

  const levelData = LEVELS[currentLevel] || LEVELS[0];
  const g = gameRef.current;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%", maxWidth: GAME_WIDTH, margin: "0 auto",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        userSelect: "none", WebkitUserSelect: "none", touchAction: "none",
        overflow: "hidden", background: "#0a0a1a", minHeight: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}
    >
      <style>{`
        @keyframes float0 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes float1 { 0%,100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-15px) translateX(10px); } }
        @keyframes float2 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-25px); } }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 20px rgba(41,171,226,0.3); } 50% { box-shadow: 0 0 40px rgba(41,171,226,0.6); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes levelIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes barFill { from { width: 0%; } }
        @keyframes victoryPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes comboFlash { 0% { opacity: 0; transform: translateY(10px) scale(0.8); } 20% { opacity: 1; transform: translateY(0) scale(1.1); } 40% { transform: scale(1); } 100% { opacity: 0; transform: translateY(-20px); } }
      `}</style>

      {/* MENU */}
      {gameState === "menu" && (
        <div style={{
          width: "100%", height: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "linear-gradient(180deg, #0B1D3A 0%, #0F2847 30%, #1a3a5c 60%, #29ABE2 100%)",
          position: "relative", overflow: "hidden",
        }}>
          {[...Array(20)].map((_, i) => (
            <div key={i} style={{
              position: "absolute", width: 4 + (i % 3) * 3, height: 4 + (i % 3) * 3,
              borderRadius: "50%", background: `rgba(41,171,226,${0.1 + (i % 5) * 0.06})`,
              left: `${(i * 17) % 100}%`, top: `${(i * 23) % 100}%`,
              animation: `float${i % 3} ${3 + (i % 4)}s ease-in-out infinite`,
            }} />
          ))}

          <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 24px" }}>
            <div style={{
              width: 120, height: 120, margin: "0 auto 24px", borderRadius: 24,
              background: "rgba(255,255,255,0.08)", border: "2px solid rgba(41,171,226,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "bob 2.5s ease-in-out infinite", backdropFilter: "blur(10px)", overflow: "hidden",
            }}>
              <canvas ref={(el) => {
                if (el) { const c = el.getContext("2d"); el.width = 100; el.height = 100; drawIvie(c, 22, 10, 56, false, 0); }
              }} width={100} height={100} />
            </div>

            <h1 style={{ fontSize: 36, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.5px", lineHeight: 1.1, animation: "slideUp 0.6s ease-out" }}>
              Ivie's Clean Run
            </h1>
            <p style={{ fontSize: 15, color: "#29ABE2", margin: "8px 0 0", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", animation: "slideUp 0.6s ease-out 0.1s both" }}>
              Protect the Infusion
            </p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", margin: "24px auto 0", maxWidth: 280, lineHeight: 1.5, animation: "slideUp 0.6s ease-out 0.2s both" }}>
              Guide Ivie through 3 stages of the home infusion journey. Dodge contaminants, build combos, and deliver safe care!
            </p>

            {/* Combo legend */}
            <div style={{
              margin: "20px auto 0", maxWidth: 280, background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px",
              animation: "slideUp 0.6s ease-out 0.25s both",
            }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8, fontWeight: 600 }}>
                Combo Streaks
              </div>
              <div style={{ display: "flex", justifyContent: "space-around" }}>
                {COMBO_TIERS.slice().reverse().map((t) => (
                  <div key={t.threshold} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: t.color }}>{t.multiplier}x</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{t.threshold} dodges</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", margin: "20px 0 32px", animation: "slideUp 0.6s ease-out 0.3s both" }}>
              {LEVELS.map((l, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(41,171,226,0.2)",
                  borderRadius: 12, padding: "10px 14px", textAlign: "center", minWidth: 95,
                }}>
                  <div style={{ fontSize: 11, color: "#29ABE2", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>Lvl {i + 1}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{l.name}</div>
                </div>
              ))}
            </div>

            <button onClick={startGame} style={{
              background: "linear-gradient(135deg, #29ABE2 0%, #1C8FC0 100%)", color: "#fff",
              border: "none", borderRadius: 16, padding: "16px 56px", fontSize: 18, fontWeight: 700,
              cursor: "pointer", animation: "pulseGlow 2s ease-in-out infinite, slideUp 0.6s ease-out 0.4s both",
            }}>
              TAP TO START
            </button>

            {highScore > 0 && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 16 }}>Best: {highScore}</p>}
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 24, letterSpacing: "1px" }}>SWIPE OR MOVE TO DODGE</p>
          </div>
        </div>
      )}

      {/* LEVEL INTRO */}
      {gameState === "levelIntro" && (
        <div style={{
          width: "100%", height: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", background: levelData.bg, animation: "levelIn 0.5s ease-out",
        }}>
          <div style={{
            background: "rgba(255,255,255,0.9)", borderRadius: 24, padding: "32px 40px",
            textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", maxWidth: 320,
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>
              {currentLevel === 0 ? "🧪" : currentLevel === 1 ? "🚗" : "🏠"}
            </div>
            <div style={{ fontSize: 13, color: "#29ABE2", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px" }}>
              Level {currentLevel + 1}
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", margin: "8px 0 4px" }}>{levelData.name}</h2>
            <p style={{ fontSize: 13, color: "#666", margin: 0 }}>{levelData.subtitle}</p>
            <p style={{ fontSize: 14, color: "#444", margin: "16px 0 0", lineHeight: 1.5 }}>{levelData.description}</p>
            <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, background: "#f0f0f0", borderRadius: 8, padding: "4px 10px" }}>
                Dodge: {levelData.enemies.map((e) => e.emoji).join(" ")}
              </span>
              <span style={{ fontSize: 12, background: "#FFF3CD", borderRadius: 8, padding: "4px 10px" }}>
                Grab: {levelData.powerup.emoji} {levelData.powerup.name}
              </span>
            </div>
            <div style={{
              marginTop: 16, fontSize: 11, color: "#888",
              background: "rgba(41,171,226,0.06)", borderRadius: 8, padding: "6px 12px",
            }}>
              Build dodge streaks for 2x, 3x, 5x scoring!
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ width: 60, height: 3, background: "#29ABE2", borderRadius: 2, margin: "0 auto", animation: "barFill 4s ease-out" }} />
            </div>
          </div>
        </div>
      )}

      {/* PLAYING */}
      {gameState === "playing" && (
        <div style={{ position: "relative", width: "100%", maxWidth: GAME_WIDTH }}>
          {/* HUD */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, padding: "10px 16px 6px",
            background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 100%)",
            display: "flex", justifyContent: "space-between", alignItems: "flex-start", pointerEvents: "none",
          }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
                {levelData.name}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                {[...Array(3)].map((_, i) => (
                  <span key={i} style={{ fontSize: 18, filter: i < displayLives ? "none" : "grayscale(1) opacity(0.3)" }}>💙</span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, color: "#fff", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{displayScore}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", marginTop: 2 }}>
                {displayMultiplier > 1 && (
                  <span style={{
                    fontSize: 11, fontWeight: 800, color: getComboMultiplier(displayCombo).color,
                    background: `${getComboMultiplier(displayCombo).color}22`, padding: "2px 6px", borderRadius: 4,
                  }}>
                    {displayMultiplier}x
                  </span>
                )}
                {displayCombo > 0 && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>🔥 {displayCombo}</span>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
            height: 4, background: "rgba(0,0,0,0.15)", pointerEvents: "none",
          }}>
            <div style={{
              height: "100%", width: `${levelProgress * 100}%`,
              background: "linear-gradient(90deg, #29ABE2, #2ED573)",
              borderRadius: "0 2px 2px 0", transition: "width 0.3s",
            }} />
          </div>

          {displayShield && (
            <div style={{
              position: "absolute", top: 64, left: "50%", transform: "translateX(-50%)", zIndex: 10,
              background: "rgba(41,171,226,0.9)", color: "#fff", fontSize: 11, fontWeight: 700,
              padding: "4px 14px", borderRadius: 12, pointerEvents: "none", letterSpacing: "1px",
            }}>
              🛡️ SHIELD ACTIVE
            </div>
          )}

          {comboAlert && (
            <div style={{
              position: "absolute", top: 90, left: "50%", transform: "translateX(-50%)", zIndex: 10,
              color: comboAlert.color, fontSize: 18, fontWeight: 800,
              padding: "6px 20px", borderRadius: 12, pointerEvents: "none",
              textShadow: "0 2px 8px rgba(0,0,0,0.5)",
              animation: "comboFlash 2s ease-out forwards",
            }}>
              {comboAlert.label}
            </div>
          )}

          {showTutorial && (
            <div style={{
              position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", zIndex: 10,
              background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 13,
              padding: "8px 20px", borderRadius: 12, pointerEvents: "none", whiteSpace: "nowrap",
            }}>
              👆 Slide finger to move Ivie
            </div>
          )}

          <canvas
            ref={canvasRef} width={GAME_WIDTH} height={GAME_HEIGHT}
            style={{
              width: "100%", maxWidth: GAME_WIDTH, height: "auto",
              aspectRatio: `${GAME_WIDTH}/${GAME_HEIGHT}`, display: "block", cursor: "none",
            }}
            onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd} onMouseMove={handleMouseMove}
          />
        </div>
      )}

      {/* GAME OVER */}
      {gameState === "gameOver" && (
        <div style={{
          width: "100%", height: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "linear-gradient(180deg, #1a0a0a 0%, #2d1515 50%, #3a1a1a 100%)",
        }}>
          <div style={{ textAlign: "center", padding: "0 24px", animation: "slideUp 0.5s ease-out" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>💔</div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Contamination!</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "0 0 24px" }}>
              Ivie was compromised on Level {currentLevel + 1}: {levelData.name}
            </p>
            <div style={{
              background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "20px 32px",
              marginBottom: 12, border: "1px solid rgba(255,255,255,0.1)",
            }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#29ABE2", fontVariantNumeric: "tabular-nums" }}>{score}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "2px", marginTop: 4 }}>
                Final Score
              </div>
              {score >= highScore && score > 0 && (
                <div style={{ fontSize: 12, color: "#FFD700", fontWeight: 700, marginTop: 8 }}>✨ NEW HIGH SCORE ✨</div>
              )}
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 24, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
              <div>Best Streak: <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>{g.bestCombo}</span></div>
              <div>Dodged: <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>{g.totalDodged}</span></div>
            </div>
            <button onClick={startGame} style={{
              background: "linear-gradient(135deg, #29ABE2, #1C8FC0)", color: "#fff",
              border: "none", borderRadius: 16, padding: "16px 48px", fontSize: 16, fontWeight: 700, cursor: "pointer",
            }}>
              TRY AGAIN
            </button>
            <button onClick={() => setGameState("menu")} style={{
              background: "transparent", color: "rgba(255,255,255,0.5)",
              border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16,
              padding: "12px 32px", fontSize: 14, cursor: "pointer", marginTop: 12,
              display: "block", width: "fit-content", marginLeft: "auto", marginRight: "auto",
            }}>
              Main Menu
            </button>
          </div>
        </div>
      )}

      {/* VICTORY */}
      {gameState === "victory" && (
        <div style={{
          width: "100%", height: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "linear-gradient(180deg, #0B1D3A 0%, #0a2a1a 50%, #1a4a2a 100%)",
        }}>
          <div style={{ textAlign: "center", padding: "0 24px", animation: "victoryPulse 2s ease-in-out infinite" }}>
            <div style={{ fontSize: 64, marginBottom: 8 }}>🏆</div>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: "#2ED573", margin: "0 0 4px" }}>Safe Delivery!</h2>
            <p style={{ fontSize: 15, color: "#fff", margin: "0 0 4px", fontWeight: 600 }}>Ivie made it to the patient!</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "0 0 28px" }}>
              All 3 stages complete — clean, safe, and on time.
            </p>
            <div style={{
              background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "20px 32px",
              marginBottom: 12, border: "1px solid rgba(46,213,115,0.2)",
            }}>
              <div style={{ fontSize: 44, fontWeight: 800, color: "#FFD700", fontVariantNumeric: "tabular-nums" }}>{score}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "2px", marginTop: 4 }}>Total Score</div>
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 24, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
              <div>Best Streak: <span style={{ color: "#2ED573", fontWeight: 700 }}>{g.bestCombo}</span></div>
              <div>Dodged: <span style={{ color: "#2ED573", fontWeight: 700 }}>{g.totalDodged}</span></div>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 32 }}>
              {LEVELS.map((l, i) => (
                <div key={i} style={{
                  background: "rgba(46,213,115,0.1)", border: "1px solid rgba(46,213,115,0.3)",
                  borderRadius: 10, padding: "8px 14px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 10, color: "#2ED573", fontWeight: 700 }}>✓ LVL {i + 1}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{l.name}</div>
                </div>
              ))}
            </div>
            <button onClick={startGame} style={{
              background: "linear-gradient(135deg, #2ED573, #1aac54)", color: "#fff",
              border: "none", borderRadius: 16, padding: "16px 48px", fontSize: 16, fontWeight: 700, cursor: "pointer",
            }}>
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
