import React, { useEffect, useRef, useState } from 'react';
import soundSystem from '../../utils/soundSystem';

const SpiderSwingGame = ({ 
  difficulty = 'Normal', 
  onWin, 
  onLoss, 
  onScoreUpdate, 
  onComboUpdate, 
  onHealthUpdate, 
  isPaused 
}) => {
  const canvasRef = useRef(null);

  // States
  const [score, setScore] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [health, setHealth] = useState(100);
  const [distance, setDistance] = useState(0);
  const [combo, setCombo] = useState(1);
  const [maxCombo, setMaxCombo] = useState(1);
  const [gamePhase, setGamePhase] = useState('playing'); // playing -> victory_landing -> complete
  
  // F.R.I.D.A.Y subtitles
  const [fridayText, setFridayText] = useState('F.R.I.D.A.Y.: Secure connection established. Commencing swing simulation.');

  // Difficulty Settings Map
  const difficultySettings = {
    Easy: { baseSpeed: 3.2, droneTimer: 2200, multiplier: 1.0, maxTime: 55 },
    Normal: { baseSpeed: 4.8, droneTimer: 1500, multiplier: 1.5, maxTime: 40 },
    Hard: { baseSpeed: 6.5, droneTimer: 850, multiplier: 2.5, maxTime: 30 }
  };

  const settings = difficultySettings[difficulty] || difficultySettings.Normal;

  const player = useRef({
    x: 0,
    y: 135,
    targetX: 0,
    lane: 1, // 0 = Left, 1 = Center, 2 = Right
    radius: 11,
    invulnerable: false,
    invulnTimer: 0,
    flashState: false,
    webSide: 0,
    webLength: 0
  });

  const collectibles = useRef([]);
  const drones = useRef([]);
  const lasers = useRef([]);
  const particles = useRef([]);
  const buildings = useRef([]);

  // Camera and visual dynamics
  const cameraShake = useRef(0);
  const cameraZoom = useRef(1.0);
  const zoomTimer = useRef(0);
  const orbitAngle = useRef(0);
  const scrollSpeed = useRef(settings.baseSpeed);
  const maxDistance = 1500;

  // Floating Combo notification text
  const comboAlert = useRef({ text: '', duration: 0, scale: 1 });
  const touchStart = useRef({ x: 0, y: 0 });

  // Sync state refs for animations
  const scoreRef = useRef(0);
  const tokensRef = useRef(0);
  const healthRef = useRef(100);
  const distanceRef = useRef(0);
  const comboRef = useRef(1);
  const maxComboRef = useRef(1);

  scoreRef.current = score;
  tokensRef.current = tokens;
  healthRef.current = health;
  distanceRef.current = distance;
  comboRef.current = combo;
  maxComboRef.current = maxCombo;

  // Audio start & stop
  useEffect(() => {
    soundSystem.startWindAmbience();

    return () => {
      soundSystem.stopWindAmbience();
      soundSystem.stopHeartbeat();
    };
  }, []);

  // Controls configuration
  useEffect(() => {
    console.log('[DEBUG] SpiderSwingGame: Controls activated');
    const handleKeyDown = (e) => {
      if (isPaused || gamePhase !== 'playing') return;
      const p = player.current;

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        p.lane = Math.max(p.lane - 1, 0);
        soundSystem.playTick();
        p.webSide = 0;
        p.webLength = 0;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        p.lane = Math.min(p.lane + 1, 2);
        soundSystem.playTick();
        p.webSide = 1;
        p.webLength = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPaused, gamePhase]);

  // Main render loops
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 180;

    const laneWidth = canvas.width / 4;
    player.current.x = laneWidth * 2;
    player.current.targetX = laneWidth * 2;

    generateBuildings(canvas);

    let frameId;
    let spawnTimer = 0;

    const render = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      
      // 1. Camera Shake
      if (cameraShake.current > 0) {
        const dx = (Math.random() - 0.5) * cameraShake.current;
        const dy = (Math.random() - 0.5) * cameraShake.current;
        ctx.translate(dx, dy);
        cameraShake.current -= 0.5;
      }

      // 2. Camera Zoom (on token collection)
      if (zoomTimer.current > 0) {
        cameraZoom.current = 1.05;
        zoomTimer.current--;
      } else {
        cameraZoom.current = 1.0;
      }

      if (cameraZoom.current !== 1.0) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(cameraZoom.current, cameraZoom.current);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
      }

      // Draw background Space sky
      ctx.fillStyle = '#05070b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Skyline parallax
      drawBuildings(ctx, canvas);

      if (!isPaused && gamePhase === 'playing') {
        updatePhysics(canvas);

        spawnTimer += 16.6;
        if (spawnTimer > 1100) {
          spawnRandomElements(canvas);
          spawnTimer = 0;
        }
      }

      if (gamePhase === 'playing') {
        drawWebs(ctx, canvas);
      }

      drawCollectibles(ctx, canvas);
      drawDrones(ctx, canvas);

      // Draw camera circular grid orbit during victory landing
      if (gamePhase === 'victory_landing') {
        drawVictoryOrbit(ctx, canvas);
      }

      drawPlayer(ctx);
      drawParticles(ctx);

      // Draw float alert notifications on canvas
      drawComboAlert(ctx, canvas);

      ctx.restore();

      frameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isPaused, gamePhase, difficulty]);

  const generateBuildings = (canvas) => {
    buildings.current = [];
    for (let i = 0; i < 6; i++) {
      buildings.current.push({
        x: i * (canvas.width / 5),
        y: 40 + Math.random() * 50,
        w: 50 + Math.random() * 25,
        h: 150
      });
    }
  };

  const drawBuildings = (ctx, canvas) => {
    ctx.fillStyle = '#0a101d';
    buildings.current.forEach((b) => {
      if (gamePhase === 'playing' && !isPaused) {
        b.y += scrollSpeed.current * 0.25;
        if (b.y > canvas.height) {
          b.y = -50;
          b.w = 50 + Math.random() * 25;
        }
      }
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    });
  };

  const drawWebs = (ctx, canvas) => {
    const p = player.current;
    if (p.webLength < 1) p.webLength += 0.08;

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffffff';
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 8);
    const anchorX = p.webSide === 0 ? 10 : canvas.width - 10;
    const targetAnchorX = p.x + (anchorX - p.x) * p.webLength;
    const targetAnchorY = p.y - 8 + (0 - (p.y - 8)) * p.webLength;

    ctx.lineTo(targetAnchorX, targetAnchorY);
    ctx.stroke();
    ctx.restore();
  };

  const drawPlayer = (ctx) => {
    const p = player.current;
    if (p.invulnerable) {
      p.flashState = !p.flashState;
      if (p.flashState) return;
    }

    ctx.save();
    ctx.translate(p.x, p.y);

    if (gamePhase === 'victory_landing') {
      // Crouching Hero landing pose drawing
      ctx.fillStyle = '#E62429';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#E62429';
      
      // torso crouch
      ctx.beginPath();
      ctx.moveTo(-10, 8);
      ctx.lineTo(0, -10);
      ctx.lineTo(10, 8);
      ctx.closePath();
      ctx.fill();

      // blue legs
      ctx.fillStyle = '#00F5FF';
      ctx.fillRect(-11, 8, 5, 4);
      ctx.fillRect(6, 8, 5, 4);

      // eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-3, -2, 2.5, 0, Math.PI * 2);
      ctx.arc(3, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Standard swing round model representation
      ctx.fillStyle = '#E62429';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#E62429';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // spider suit web pattern
      ctx.strokeStyle = '#05070b';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-p.radius, 0);
      ctx.lineTo(p.radius, 0);
      ctx.moveTo(0, -p.radius);
      ctx.lineTo(0, p.radius);
      ctx.stroke();

      // eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(-4, -3, 3, 2, -Math.PI / 4, 0, Math.PI * 2);
      ctx.ellipse(4, -3, 3, 2, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  const drawCollectibles = (ctx, canvas) => {
    ctx.save();
    collectibles.current.forEach((col) => {
      if (!col.active) return;
      const pulse = Math.sin(Date.now() * 0.012 + col.y) * 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#FFD84A';
      ctx.fillStyle = '#FFD84A';
      ctx.beginPath();
      ctx.arc(col.x, col.y + pulse, 7.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#05070B';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('S', col.x, col.y + pulse + 3);
    });
    ctx.restore();
  };

  const drawDrones = (ctx, canvas) => {
    ctx.save();
    
    // Lasers
    ctx.fillStyle = '#00ff66';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ff66';
    lasers.current.forEach((l) => {
      if (!l.active) return;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Patrol Drones
    drones.current.forEach((dr) => {
      if (!dr.active) return;
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#e62429';
      ctx.lineWidth = 1.2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#e62429';
      ctx.beginPath();
      ctx.rect(dr.x - 12, dr.y - 7, 24, 14);
      ctx.fill();
      ctx.stroke();

      // sensor core
      ctx.fillStyle = '#00ff66';
      ctx.beginPath();
      ctx.arc(dr.x, dr.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  };

  const drawVictoryOrbit = (ctx, canvas) => {
    const p = player.current;
    orbitAngle.current += 0.045;

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 8]);
    
    // Draw concentric rotating grid lines around Spider-Man
    ctx.beginPath();
    ctx.arc(p.x, p.y + 4, 25, orbitAngle.current, orbitAngle.current + Math.PI * 2);
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(255, 216, 74, 0.3)';
    ctx.beginPath();
    ctx.arc(p.x, p.y + 4, 38, -orbitAngle.current, -orbitAngle.current + Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  const drawComboAlert = (ctx, canvas) => {
    const alert = comboAlert.current;
    if (alert.duration > 0) {
      alert.duration--;
      ctx.save();
      ctx.fillStyle = '#FFD84A';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#FFD84A';
      ctx.font = 'black 14px sans-serif';
      ctx.textAlign = 'center';
      
      const bounce = Math.sin(alert.duration * 0.15) * 4;
      ctx.fillText(alert.text, canvas.width / 2, canvas.height / 2 - 30 + bounce);
      ctx.restore();
    }
  };

  const updatePhysics = (canvas) => {
    const p = player.current;

    // Lane positioning
    const laneWidth = canvas.width / 4;
    p.targetX = laneWidth * (p.lane + 1);
    p.x += (p.targetX - p.x) * 0.16;

    // Advance distance status
    const nextDistance = distanceRef.current + scrollSpeed.current * 0.08;
    setDistance(nextDistance);

    // Halfway check announcement
    if (nextDistance >= maxDistance * 0.5 && distanceRef.current < maxDistance * 0.5) {
      setFridayText('F.R.I.D.A.Y.: Halfway point coordinates achieved. Enhancing local spatial grids.');
      soundSystem.playPortalSwoosh();
    }

    if (p.invulnerable) {
      p.invulnTimer -= 16.6;
      if (p.invulnTimer <= 0) {
        p.invulnerable = false;
      }
    }

    // Scroll tokens
    collectibles.current.forEach((col) => {
      if (!col.active) return;
      col.y += scrollSpeed.current;

      const dist = Math.hypot(p.x - col.x, p.y - col.y);
      if (dist < p.radius + 8.5) {
        col.active = false;
        
        soundSystem.playTick();
        triggerExplosion(col.x, col.y, '#FFD84A');
        
        zoomTimer.current = 6; // trigger brief zoom in

        const nextTokens = tokensRef.current + 1;
        const nextCombo = comboRef.current + 1;
        const scoreGain = Math.round(10 * settings.multiplier * (nextCombo >= 8 ? 2.5 : nextCombo >= 4 ? 1.8 : 1.0));
        const nextScore = scoreRef.current + scoreGain;

        setTokens(nextTokens);
        setCombo(nextCombo);
        setScore(nextScore);

        if (nextCombo > maxComboRef.current) setMaxCombo(nextCombo);

        onScoreUpdate(nextScore);
        onComboUpdate(nextTokens);

        // Check milestones
        triggerComboAlert(nextCombo);

        // flash brief brightness feedback
        canvasRef.current.style.filter = 'brightness(1.4)';
        setTimeout(() => {
          if (canvasRef.current) canvasRef.current.style.filter = 'none';
        }, 70);
      }
    });

    // Scroll drones and fire lasers
    drones.current.forEach((dr) => {
      if (!dr.active) return;
      dr.y += scrollSpeed.current * 0.85;

      dr.x += dr.vx;
      const laneWidth = canvas.width / 4;
      const leftBound = laneWidth * 0.8;
      const rightBound = laneWidth * 3.2;
      if (dr.x < leftBound || dr.x > rightBound) dr.vx = -dr.vx;

      dr.laserTimer += 16.6;
      if (dr.laserTimer > settings.droneTimer) {
        lasers.current.push({
          x: dr.x,
          y: dr.y + 10,
          active: true
        });
        dr.laserTimer = 0;
      }

      const dist = Math.hypot(p.x - dr.x, p.y - dr.y);
      if (dist < p.radius + 12 && !p.invulnerable) {
        dr.active = false;
        triggerDamageHit();
      }
    });

    // Move lasers
    lasers.current.forEach((l) => {
      if (!l.active) return;
      l.y += scrollSpeed.current * 1.6;

      const dist = Math.hypot(p.x - l.x, p.y - l.y);
      if (dist < p.radius + 6 && !p.invulnerable) {
        l.active = false;
        triggerDamageHit();
      }
    });

    // Clean offscreen items
    collectibles.current = collectibles.current.filter((c) => c.y < canvas.height + 20 && c.active);
    drones.current = drones.current.filter((d) => d.y < canvas.height + 20 && d.active);
    lasers.current = lasers.current.filter((l) => l.y < canvas.height + 20 && l.active);

    // Verify Victory
    if (nextDistance >= maxDistance) {
      triggerVictoryLanding(canvas);
    }
  };

  const triggerDamageHit = () => {
    soundSystem.playClick();
    cameraShake.current = 18; // active canvas shake translation
    
    // reset combo and warn
    setCombo(1);
    onComboUpdate(1);
    setFridayText('F.R.I.D.A.Y.: WARNING! Suit displacement grids fluctuating.');

    const p = player.current;
    p.invulnerable = true;
    p.invulnTimer = 1500;

    const nextHealth = Math.max(healthRef.current - 20, 0);
    setHealth(nextHealth);
    onHealthUpdate(nextHealth);

    // Heartbeat double Beep sound on low health
    if (nextHealth < 35 && nextHealth > 0) {
      soundSystem.startHeartbeat();
      setFridayText('F.R.I.D.A.Y.: WARNING! Biological signatures collapsing. Clear anomalies!');
    }

    if (nextHealth <= 0) {
      console.log('[DEBUG] SpiderSwingGame: Defeat health depleted');
      soundSystem.stopHeartbeat();
      onLoss();
    }
  };

  const triggerComboAlert = (currentCombo) => {
    const alert = comboAlert.current;
    if (currentCombo === 3) {
      alert.text = 'COMBO x3 // AMAZING';
      alert.duration = 45;
      setFridayText('F.R.I.D.A.Y.: Spatial coordinate swing vectors are optimal.');
    } else if (currentCombo === 6) {
      alert.text = 'COMBO x6 // INCREDIBLE';
      alert.duration = 50;
      setFridayText('F.R.I.D.A.Y.: Dynamic trajectory accuracy in high profiles.');
    } else if (currentCombo === 10) {
      alert.text = 'COMBO x10 // LEGENDARY';
      alert.duration = 60;
      setFridayText('F.R.I.D.A.Y.: Agent Garv biometrics matched to legend levels.');
    }
  };

  const spawnRandomElements = (canvas) => {
    const lane = Math.floor(Math.random() * 3);
    const laneWidth = canvas.width / 4;
    const spawnX = laneWidth * (lane + 1);

    if (Math.random() > 0.42) {
      collectibles.current.push({
        x: spawnX,
        y: -15,
        lane,
        active: true
      });
    } else {
      drones.current.push({
        x: spawnX,
        y: -20,
        lane,
        vx: (Math.random() - 0.5) * 2.2,
        laserTimer: Math.random() * 700,
        active: true
      });
    }
  };

  const triggerVictoryLanding = (canvas) => {
    setGamePhase('victory_landing');
    console.log('[DEBUG] SpiderSwingGame: Landing victory coordinates initiated');
    setFridayText('F.R.I.D.A.Y.: Target coordinates reached. Commencing landing sequences.');
    
    soundSystem.stopHeartbeat();
    soundSystem.stopWindAmbience();

    const p = player.current;
    
    // Slow down speed
    scrollSpeed.current = 1.0;

    // Animate Spider-Man lerping to center bottom
    const tl = window.gsap ? window.gsap.timeline() : null;
    if (tl) {
      tl.to(p, {
        x: canvas.width / 2,
        y: canvas.height - 35,
        duration: 1.5,
        ease: 'power3.out',
        onComplete: () => {
          setFridayText('F.R.I.D.A.Y.: Mission complete. Excellent work, Agent Garv.');
          setTimeout(() => {
            onWin(scoreRef.current);
          }, 1200);
        }
      });
    } else {
      // Manual lerp fallback
      p.x = canvas.width / 2;
      p.y = canvas.height - 35;
      setTimeout(() => {
        onWin(scoreRef.current);
      }, 1200);
    }
  };

  const triggerExplosion = (x, y, color) => {
    for (let i = 0; i < 11; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 3.5;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 2,
        alpha: 1,
        color,
        decay: 0.045
      });
    }
  };

  const drawParticles = (ctx) => {
    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        particles.current.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas 
        ref={canvasRef} 
        className="game-canvas-element"
        style={{ height: '150px' }}
      />
      
      {/* Dynamic F.R.I.D.A.Y AI holographic console subtitles */}
      <div 
        style={{
          width: '100%',
          textAlign: 'center',
          backgroundColor: 'rgba(5, 7, 11, 0.85)',
          color: '#00F5FF',
          fontFamily: 'var(--font-hud)',
          fontSize: '0.75rem',
          padding: '4px 0',
          borderTop: '1px solid rgba(0, 245, 255, 0.15)',
          letterSpacing: '1px',
          textShadow: '0 0 6px #00F5FF'
        }}
      >
        {fridayText}
      </div>
    </div>
  );
};

export default SpiderSwingGame;
