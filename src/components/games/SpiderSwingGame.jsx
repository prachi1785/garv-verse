import React, { useEffect, useRef, useState } from 'react';
import soundSystem from '../../utils/soundSystem';

const SpiderSwingGame = ({ onWin, onLoss, onScoreUpdate, onComboUpdate, onHealthUpdate, isPaused }) => {
  const canvasRef = useRef(null);
  
  // Game states
  const [score, setScore] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [health, setHealth] = useState(100);
  const [distance, setDistance] = useState(0);
  const [gamePhase, setGamePhase] = useState('playing'); // playing -> victory_landing -> complete

  const player = useRef({
    x: 0,
    y: 140,
    targetX: 0,
    lane: 1, // 0 = Left, 1 = Center, 2 = Right
    radius: 12,
    invulnerable: false,
    invulnTimer: 0,
    flashState: false,
    webSide: 0, // 0 = left hand web, 1 = right hand web
    webLength: 0
  });

  const collectibles = useRef([]); // { x, y, lane, type, active }
  const drones = useRef([]); // { x, y, lane, vx, laserTimer, active }
  const lasers = useRef([]); // { x, y, active }
  const particles = useRef([]);
  const buildings = useRef([]);

  // Camera settings
  const cameraShake = useRef(0);
  const scrollSpeed = useRef(4.5);
  const maxDistance = 1500;
  
  // Swipe controls tracking
  const touchStart = useRef({ x: 0, y: 0 });

  // Refs for state values inside animation loop
  const scoreRef = useRef(0);
  const tokensRef = useRef(0);
  const healthRef = useRef(100);
  const distanceRef = useRef(0);
  scoreRef.current = score;
  tokensRef.current = tokens;
  healthRef.current = health;
  distanceRef.current = distance;

  // 1. Controls listener - registered EXACTLY ONCE on mount
  useEffect(() => {
    console.log('[DEBUG] SpiderSwingGame: Controls attached');
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
      console.log('[DEBUG] SpiderSwingGame: Controls detached');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPaused, gamePhase]);

  // 2. Main Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 180;

    // Center player initially
    const laneWidth = canvas.width / 4;
    player.current.x = laneWidth * 2;
    player.current.targetX = laneWidth * 2;

    // Generate initial buildings background
    generateBuildings(canvas);

    console.log('[DEBUG] SpiderSwingGame: Main physics loop starting');
    let frameId;
    let spawnTimer = 0;

    const render = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply camera shake if hit
      ctx.save();
      if (cameraShake.current > 0) {
        const dx = (Math.random() - 0.5) * cameraShake.current;
        const dy = (Math.random() - 0.5) * cameraShake.current;
        ctx.translate(dx, dy);
        cameraShake.current -= 0.55;
      }

      // Draw background space sky
      ctx.fillStyle = '#05070b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw scrolling buildings parallax
      drawBuildings(ctx, canvas);

      if (!isPaused && gamePhase === 'playing') {
        updatePhysics(canvas);

        // Spawn logic
        spawnTimer += 16.6;
        if (spawnTimer > 1300) {
          spawnRandomElements(canvas);
          spawnTimer = 0;
        }
      }

      // Draw webs
      if (gamePhase === 'playing') {
        drawWebs(ctx, canvas);
      }

      // Draw Collectibles
      drawCollectibles(ctx, canvas);

      // Draw Drones & Lasers
      drawDrones(ctx, canvas);

      // Draw Spider-Man
      drawPlayer(ctx);

      // Draw particles
      drawParticles(ctx);

      // Draw progress bar overlay
      drawProgressBar(ctx, canvas);

      ctx.restore(); // restore camera shake translation

      frameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      console.log('[DEBUG] SpiderSwingGame: Terminating animation loops');
      cancelAnimationFrame(frameId);
    };
  }, [isPaused, gamePhase]);

  const generateBuildings = (canvas) => {
    buildings.current = [];
    for (let i = 0; i < 6; i++) {
      buildings.current.push({
        x: i * (canvas.width / 5),
        y: 40 + Math.random() * 50,
        w: 45 + Math.random() * 30,
        h: 150
      });
    }
  };

  const drawBuildings = (ctx, canvas) => {
    ctx.fillStyle = '#0d131f';
    buildings.current.forEach((b) => {
      if (gamePhase === 'playing' && !isPaused) {
        b.y += scrollSpeed.current * 0.3; // parallax scroll
        if (b.y > canvas.height) {
          b.y = -40;
          b.w = 45 + Math.random() * 30;
        }
      }
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    });
  };

  const drawProgressBar = (ctx, canvas) => {
    const pct = Math.min(distanceRef.current / maxDistance, 1);
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(10, 10, canvas.width - 20, 6);
    
    ctx.fillStyle = '#00F5FF';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00F5FF';
    ctx.fillRect(10, 10, (canvas.width - 20) * pct, 6);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(pct * 100)}% DIST`, canvas.width - 10, 24);
    ctx.restore();
  };

  const drawWebs = (ctx, canvas) => {
    const p = player.current;
    
    // Animate web line drawing
    if (p.webLength < 1) p.webLength += 0.08;

    ctx.save();
    ctx.strokeStyle = '#FFFFFF';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#FFFFFF';
    ctx.lineWidth = 1.6;

    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 8);
    // Draw web anchor path to left or right screen ceiling coordinates
    const anchorX = p.webSide === 0 ? 0 : canvas.width;
    const targetAnchorX = p.x + (anchorX - p.x) * p.webLength;
    const targetAnchorY = p.y - 8 + (0 - (p.y - 8)) * p.webLength;

    ctx.lineTo(targetAnchorX, targetAnchorY);
    ctx.stroke();
    ctx.restore();
  };

  const drawPlayer = (ctx) => {
    const p = player.current;

    // Flash player when invulnerable
    if (p.invulnerable) {
      p.flashState = !p.flashState;
      if (p.flashState) return; // skip drawing frame
    }

    ctx.save();
    ctx.translate(p.x, p.y);

    if (gamePhase === 'victory_landing') {
      // Classic Crouching Hero pose visual sticking out
      ctx.fillStyle = '#E62429';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#E62429';
      // crouch body
      ctx.beginPath();
      ctx.moveTo(-10, 10);
      ctx.lineTo(0, -10);
      ctx.lineTo(10, 10);
      ctx.closePath();
      ctx.fill();

      // blue legs
      ctx.fillStyle = '#00F5FF';
      ctx.fillRect(-12, 10, 6, 4);
      ctx.fillRect(6, 10, 6, 4);

      // eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-3, -2, 2.5, 0, Math.PI * 2);
      ctx.arc(3, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Swinging / Flying circle avatar representation
      ctx.fillStyle = '#E62429';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#E62429';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Spider insignia
      ctx.strokeStyle = '#05070b';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-p.radius, 0);
      ctx.lineTo(p.radius, 0);
      ctx.moveTo(0, -p.radius);
      ctx.lineTo(0, p.radius);
      ctx.stroke();

      // white eyes
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
      
      const bounce = Math.sin(Date.now() * 0.01 + col.y) * 3;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#FFD84A';
      ctx.fillStyle = '#FFD84A';
      ctx.beginPath();
      ctx.arc(col.x, col.y + bounce, 7, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#05070B';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('S', col.x, col.y + bounce + 3);
    });
    ctx.restore();
  };

  const drawDrones = (ctx, canvas) => {
    ctx.save();
    
    // Draw lasers
    ctx.fillStyle = '#00ff66';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ff66';
    lasers.current.forEach((l) => {
      if (!l.active) return;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Drones
    drones.current.forEach((dr) => {
      if (!dr.active) return;

      ctx.fillStyle = '#5c3a21'; // Oscorp dark metallic
      ctx.strokeStyle = '#e62429';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(dr.x - 12, dr.y - 7, 24, 14);
      ctx.fill();
      ctx.stroke();

      // glowing green sensor eye
      ctx.fillStyle = '#00ff66';
      ctx.beginPath();
      ctx.arc(dr.x, dr.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  };

  const updatePhysics = (canvas) => {
    const p = player.current;
    
    // Smooth lane coordinates lerping
    const laneWidth = canvas.width / 4;
    p.targetX = laneWidth * (p.lane + 1);
    p.x += (p.targetX - p.x) * 0.15;

    // Advance distance
    const nextDistance = distanceRef.current + scrollSpeed.current * 0.08;
    setDistance(nextDistance);

    // Invulnerable timer decay
    if (p.invulnerable) {
      p.invulnTimer -= 16.6;
      if (p.invulnTimer <= 0) {
        p.invulnerable = false;
      }
    }

    // Scroll collectibles down
    collectibles.current.forEach((col) => {
      if (!col.active) return;
      col.y += scrollSpeed.current;

      // collide check
      const dist = Math.hypot(p.x - col.x, p.y - col.y);
      if (dist < p.radius + 7) {
        col.active = false;
        soundSystem.playTick();
        triggerExplosion(col.x, col.y, '#FFD84A');

        const nextTokens = tokensRef.current + 1;
        const nextScore = scoreRef.current + 10;
        
        setTokens(nextTokens);
        setScore(nextScore);
        
        // Sync outer managers
        onScoreUpdate(nextScore);
        onComboUpdate(nextTokens);

        // Flash canvas briefly (visual splash feedback)
        canvasRef.current.style.filter = 'brightness(1.5)';
        setTimeout(() => {
          if (canvasRef.current) canvasRef.current.style.filter = 'none';
        }, 80);
      }
    });

    // Scroll Drones and handle laser shooting
    drones.current.forEach((dr) => {
      if (!dr.active) return;
      dr.y += scrollSpeed.current * 0.85;

      // Move horizontally (patrol)
      dr.x += dr.vx;
      const laneWidth = canvas.width / 4;
      const leftBound = laneWidth * 0.8;
      const rightBound = laneWidth * 3.2;
      if (dr.x < leftBound || dr.x > rightBound) {
        dr.vx = -dr.vx;
      }

      // Shoot lasers down
      dr.laserTimer += 16.6;
      if (dr.laserTimer > 1800) {
        lasers.current.push({
          x: dr.x,
          y: dr.y + 10,
          active: true
        });
        dr.laserTimer = 0;
      }

      // Collide check
      const dist = Math.hypot(p.x - dr.x, p.y - dr.y);
      if (dist < p.radius + 11 && !p.invulnerable) {
        dr.active = false;
        triggerHit();
      }
    });

    // Move lasers
    lasers.current.forEach((l) => {
      if (!l.active) return;
      l.y += scrollSpeed.current * 1.5;

      // collide check
      const dist = Math.hypot(p.x - l.x, p.y - l.y);
      if (dist < p.radius + 5.5 && !p.invulnerable) {
        l.active = false;
        triggerHit();
      }
    });

    // Clean inactive offscreen arrays
    collectibles.current = collectibles.current.filter((c) => c.y < canvas.height + 20 && c.active);
    drones.current = drones.current.filter((d) => d.y < canvas.height + 20 && d.active);
    lasers.current = lasers.current.filter((l) => l.y < canvas.height + 20 && l.active);

    // Check Victory
    if (nextDistance >= maxDistance) {
      triggerVictory(canvas);
    }
  };

  const triggerHit = () => {
    soundSystem.playClick();
    cameraShake.current = 15; // activate camera shake translation
    
    // Set invulnerable and timers
    const p = player.current;
    p.invulnerable = true;
    p.invulnTimer = 1500;

    const nextHealth = Math.max(healthRef.current - 20, 0);
    setHealth(nextHealth);
    onHealthUpdate(nextHealth);

    if (nextHealth <= 0) {
      console.log('[DEBUG] SpiderSwingGame: Defeat coordinates triggered');
      onLoss();
    }
  };

  const spawnRandomElements = (canvas) => {
    const lane = Math.floor(Math.random() * 3);
    const laneWidth = canvas.width / 4;
    const spawnX = laneWidth * (lane + 1);

    if (Math.random() > 0.45) {
      // Spawn token
      collectibles.current.push({
        x: spawnX,
        y: -15,
        lane,
        active: true
      });
    } else {
      // Spawn patrol drone
      drones.current.push({
        x: spawnX,
        y: -20,
        lane,
        vx: (Math.random() - 0.5) * 2,
        laserTimer: Math.random() * 1000,
        active: true
      });
    }
  };

  const triggerVictory = (canvas) => {
    setGamePhase('victory_landing');
    console.log('[DEBUG] SpiderSwingGame: Entering victory landing phase');

    // Position player crouching in center
    const p = player.current;
    gsap.to(p, {
      x: canvas.width / 2,
      y: canvas.height - 35,
      duration: 1.2,
      ease: 'power3.out',
      onComplete: () => {
        // Play final snap trigger and complete stats
        soundSystem.playAvengersFanfare();
        onWin(scoreRef.current);
      }
    });
  };

  const triggerExplosion = (x, y, color) => {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 2,
        alpha: 1,
        color,
        decay: 0.04
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

  // Support swipe movements for mobile
  const handleTouchStart = (e) => {
    if (isPaused || gamePhase !== 'playing') return;
    touchStart.current.x = e.touches[0].clientX;
    touchStart.current.y = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (isPaused || gamePhase !== 'playing') return;
    const diffX = e.changedTouches[0].clientX - touchStart.current.x;
    
    const p = player.current;
    if (diffX < -50) {
      // swipe left
      p.lane = Math.max(p.lane - 1, 0);
      soundSystem.playTick();
    } else if (diffX > 50) {
      // swipe right
      p.lane = Math.min(p.lane + 1, 2);
      soundSystem.playTick();
    }
  };

  return (
    <canvas 
      ref={canvasRef} 
      className="game-canvas-element"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ height: '170px' }}
    />
  );
};

export default SpiderSwingGame;
