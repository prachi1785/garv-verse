import React, { useEffect, useRef, useState } from 'react';
import soundSystem from '../../utils/soundSystem';

const UltronSurvivalGame = ({ onWin, onLoss, onScoreUpdate, onComboUpdate, onHealthUpdate, isPaused }) => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);

  const player = useRef({
    x: 180,
    y: 100,
    radius: 11,
    speed: 3.2,
    shieldActive: false,
    quadActive: false,
    upgradeTimer: 0
  });

  const bots = useRef([]);
  const bullets = useRef([]);
  const itemDrops = useRef([]);
  const particles = useRef([]);
  const keys = useRef({ KeyW: false, KeyS: false, KeyA: false, KeyD: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false });
  const mousePos = useRef({ x: 0, y: 0 });
  const spawnTimer = useRef(0);

  // 1. Controls listener - attached EXACTLY ONCE on mount
  useEffect(() => {
    console.log('[DEBUG] UltronSurvivalGame: Controls attached (once)');
    const handleKeyDown = (e) => {
      if (e.code in keys.current) keys.current[e.code] = true;
    };
    const handleKeyUp = (e) => {
      if (e.code in keys.current) keys.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      console.log('[DEBUG] UltronSurvivalGame: Controls detached');
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 2. Physics & Draw animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 200;

    player.current.x = canvas.width / 2;
    player.current.y = canvas.height / 2;

    console.log('[DEBUG] UltronSurvivalGame: Initializing physics loop');
    let frameId;

    const render = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      ctx.restore();

      if (!isPaused) {
        updateGame(canvas);
      }

      // Draw Item drops
      ctx.save();
      itemDrops.current.forEach((item) => {
        if (!item.active) return;
        const glowColor = item.type === 'shield' ? '#00F5FF' : item.type === 'quad' ? '#FFD84A' : '#7F5CFF';
        ctx.shadowBlur = 8;
        ctx.shadowColor = glowColor;
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.rect(item.x - 6, item.y - 6, 12, 12);
        ctx.fill();
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.type[0].toUpperCase(), item.x, item.y + 3);
        ctx.restore();
      });

      // Draw Bullets
      ctx.save();
      ctx.fillStyle = '#00F5FF';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00F5FF';
      bullets.current.forEach((b) => {
        if (!b.active) return;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // Draw Bots
      ctx.save();
      bots.current.forEach((bot) => {
        if (!bot.active) return;
        ctx.fillStyle = '#E62429';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#E62429';
        ctx.beginPath();
        ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(bot.x - 2, bot.y - 1, 1.5, 0, Math.PI * 2);
        ctx.arc(bot.x + 2, bot.y - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // Draw Player
      const p = player.current;
      ctx.save();
      ctx.translate(p.x, p.y);
      
      if (p.shieldActive) {
        ctx.strokeStyle = 'rgba(0, 245, 255, 0.6)';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00F5FF';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius + 7, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#00F5FF';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00F5FF';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      drawSparks(ctx);

      frameId = requestAnimationFrame(render);
    };

    render();

    // Attach canvas aims & clicks
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mousePos.current.x = e.clientX - rect.left;
      mousePos.current.y = e.clientY - rect.top;
    };

    const handleShoot = () => {
      fireLaser();
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleShoot);

    return () => {
      console.log('[DEBUG] UltronSurvivalGame: Terminating loop');
      cancelAnimationFrame(frameId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleShoot);
    };
  }, [isPaused, score]);

  const updateGame = (canvas) => {
    const p = player.current;

    let dx = 0;
    let dy = 0;
    if (keys.current.KeyW || keys.current.ArrowUp) dy = -1;
    if (keys.current.KeyS || keys.current.ArrowDown) dy = 1;
    if (keys.current.KeyA || keys.current.ArrowLeft) dx = -1;
    if (keys.current.KeyD || keys.current.ArrowRight) dx = 1;

    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    p.x = Math.max(Math.min(p.x + dx * p.speed, canvas.width - p.radius), p.radius);
    p.y = Math.max(Math.min(p.y + dy * p.speed, canvas.height - p.radius), p.radius);

    if (p.upgradeTimer > 0) {
      p.upgradeTimer -= 16.6;
      if (p.upgradeTimer <= 0) {
        p.shieldActive = false;
        p.quadActive = false;
      }
    }

    spawnTimer.current += 16.6;
    if (spawnTimer.current > 1100) {
      const edge = Math.floor(Math.random() * 4);
      let sx = 0;
      let sy = 0;

      if (edge === 0) { sx = Math.random() * canvas.width; sy = -15; }
      else if (edge === 1) { sx = canvas.width + 15; sy = Math.random() * canvas.height; }
      else if (edge === 2) { sx = Math.random() * canvas.width; sy = canvas.height + 15; }
      else { sx = -15; sy = Math.random() * canvas.height; }

      bots.current.push({
        x: sx,
        y: sy,
        speed: 1.2 + Math.random() * 1.1,
        radius: 8.5,
        active: true
      });
      spawnTimer.current = 0;
    }

    bots.current.forEach((bot) => {
      if (!bot.active) return;

      const angle = Math.atan2(p.y - bot.y, p.x - bot.x);
      bot.x += Math.cos(angle) * bot.speed;
      bot.y += Math.sin(angle) * bot.speed;

      const dist = Math.hypot(p.x - bot.x, p.y - bot.y);
      if (dist < p.radius + bot.radius) {
        bot.active = false;
        triggerExplosion(bot.x, bot.y, '#E62429');
        soundSystem.playClick();

        if (p.shieldActive) {
          p.shieldActive = false;
          p.upgradeTimer = 0;
        } else {
          onHealthUpdate((prev) => {
            const next = Math.max(prev - 20, 0);
            if (next <= 0) {
              console.log('[DEBUG] UltronSurvivalGame: Mission exited/lost (battery depleted)');
              onLoss();
            }
            return next;
          });
        }
      }
    });

    bullets.current.forEach((b) => {
      if (!b.active) return;
      b.x += b.vx;
      b.y += b.vy;

      if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
        b.active = false;
        return;
      }

      bots.current.forEach((bot) => {
        if (!bot.active) return;
        const dist = Math.hypot(b.x - bot.x, b.y - bot.y);
        if (dist < bot.radius + 3) {
          bot.active = false;
          b.active = false;
          triggerExplosion(bot.x, bot.y, '#E62429');
          soundSystem.playTick();

          const nextScore = score + 100;
          setScore(nextScore);
          onScoreUpdate(nextScore);

          const comboIdx = Math.floor(nextScore / 500) + 1;
          onComboUpdate(comboIdx);

          if (Math.random() < 0.15) {
            const itemTypes = ['shield', 'quad', 'emp'];
            itemDrops.current.push({
              x: bot.x,
              y: bot.y,
              type: itemTypes[Math.floor(Math.random() * itemTypes.length)],
              active: true
            });
          }
        }
      });
    });

    itemDrops.current.forEach((item) => {
      if (!item.active) return;
      const dist = Math.hypot(p.x - item.x, p.y - item.y);
      if (dist < p.radius + 8) {
        item.active = false;
        activateUpgrade(item.type);
      }
    });
  };

  const fireLaser = () => {
    if (isPaused) return;

    const p = player.current;
    const angle = Math.atan2(mousePos.current.y - p.y, mousePos.current.x - p.x);
    const speed = 7.5;

    soundSystem.playTick();

    if (p.quadActive) {
      const angles = [angle, angle + Math.PI/2, angle + Math.PI, angle - Math.PI/2];
      angles.forEach((ang) => {
        bullets.current.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          active: true
        });
      });
    } else {
      bullets.current.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        active: true
      });
    }
  };

  const activateUpgrade = (type) => {
    soundSystem.playStoneSocket();
    const p = player.current;

    if (type === 'shield') {
      p.shieldActive = true;
      p.upgradeTimer = 8000;
    } 
    else if (type === 'quad') {
      p.quadActive = true;
      p.upgradeTimer = 7000;
    } 
    else if (type === 'emp') {
      bots.current.forEach((bot) => {
        if (bot.active) {
          bot.active = false;
          triggerExplosion(bot.x, bot.y, '#7F5CFF');
        }
      });
      triggerExplosion(p.x, p.y, '#FFFFFF');
      soundSystem.playSnap();
    }
  };

  const triggerExplosion = (x, y, color) => {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3.5;
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

  const drawSparks = (ctx) => {
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
    <canvas 
      ref={canvasRef} 
      className="game-canvas-element"
      style={{ height: '180px' }}
    />
  );
};

export default UltronSurvivalGame;
