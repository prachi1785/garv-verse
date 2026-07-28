import React, { useEffect, useRef, useState } from 'react';
import soundSystem from '../../utils/soundSystem';

const ShieldPhysicsGame = ({ onWin }) => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('playing'); // playing, won
  const [botsLeft, setBotsLeft] = useState(3);
  const [score, setScore] = useState(0);

  const shield = useRef({
    x: 50,
    y: 120,
    vx: 0,
    vy: 0,
    radius: 14,
    launched: false,
    angle: 0
  });

  const bots = useRef([
    { id: 1, x: 260, y: 60, radius: 15, active: true },
    { id: 2, x: 340, y: 120, radius: 15, active: true },
    { id: 3, x: 260, y: 180, radius: 15, active: true }
  ]);

  const barriers = useRef([
    { x: 180, y: 40, w: 20, h: 60 },
    { x: 180, y: 140, w: 20, h: 60 }
  ]);

  const particles = useRef([]);
  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 240;

    // Center layout coordinates
    shield.current.x = 40;
    shield.current.y = canvas.height / 2;

    let frameId;

    const render = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw aim line if shield not launched
      if (!shield.current.launched && gameState === 'playing') {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 245, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(shield.current.x, shield.current.y);
        ctx.lineTo(mousePos.current.x, mousePos.current.y);
        ctx.stroke();
        ctx.restore();
      }

      // Draw barriers
      barriers.current.forEach((bar) => {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 245, 255, 0.15)';
        ctx.strokeStyle = '#00F5FF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(bar.x, bar.y, bar.w, bar.h);
        ctx.fill();
        ctx.stroke();
        
        // tech details on barrier
        ctx.fillStyle = 'rgba(0, 245, 255, 0.4)';
        ctx.font = '7px sans-serif';
        ctx.fillText('SHIELD-BARRIER', bar.x + 2, bar.y + 10);
        ctx.restore();
      });

      // Update and Draw Shield
      updateShield(canvas);
      drawShield(ctx);

      // Draw Bots
      bots.current.forEach((bot) => {
        if (!bot.active) return;
        
        // Pulsing glow
        const glow = 5 + Math.sin(Date.now() * 0.015) * 3;
        
        ctx.save();
        ctx.shadowBlur = glow;
        ctx.shadowColor = '#E62429';
        ctx.fillStyle = '#E62429';
        ctx.beginPath();
        ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
        ctx.fill();

        // draw bot eye/light core
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(bot.x - 3, bot.y, 2, 0, Math.PI * 2);
        ctx.arc(bot.x + 3, bot.y, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });

      // Draw particles (explosions)
      drawExplosions(ctx);

      frameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(frameId);
  }, [gameState]);

  const updateShield = (canvas) => {
    const s = shield.current;
    if (!s.launched) return;

    // Movement
    s.x += s.vx;
    s.y += s.vy;
    s.angle += 0.25; // rotation speed

    // Bounce off walls (Elastic collision)
    // Left Wall
    if (s.x - s.radius < 0) {
      s.x = s.radius;
      s.vx = -s.vx;
      soundSystem.playTick();
    }
    // Right Wall
    if (s.x + s.radius > canvas.width) {
      s.x = canvas.width - s.radius;
      s.vx = -s.vx;
      soundSystem.playTick();
    }
    // Top Wall
    if (s.y - s.radius < 0) {
      s.y = s.radius;
      s.vy = -s.vy;
      soundSystem.playTick();
    }
    // Bottom Wall
    if (s.y + s.radius > canvas.height) {
      s.y = canvas.height - s.radius;
      s.vy = -s.vy;
      soundSystem.playTick();
    }

    // Bounce off barriers
    barriers.current.forEach((bar) => {
      // Find closest point on barrier rectangle to shield circle
      const closestX = Math.max(bar.x, Math.min(s.x, bar.x + bar.w));
      const closestY = Math.max(bar.y, Math.min(s.y, bar.y + bar.h));
      const dist = Math.hypot(s.x - closestX, s.y - closestY);

      if (dist < s.radius) {
        soundSystem.playTick();
        // Determine collision normal face
        const diffX = s.x - (bar.x + bar.w / 2);
        const diffY = s.y - (bar.y + bar.h / 2);

        // Normalize barrier ratios
        if (Math.abs(diffX / bar.w) > Math.abs(diffY / bar.h)) {
          s.vx = -s.vx;
          s.x = closestX + (s.vx > 0 ? s.radius : -s.radius);
        } else {
          s.vy = -s.vy;
          s.y = closestY + (s.vy > 0 ? s.radius : -s.radius);
        }
      }
    });

    // Check collisions with active Bots
    bots.current.forEach((bot) => {
      if (!bot.active) return;
      const dist = Math.hypot(s.x - bot.x, s.y - bot.y);
      if (dist < s.radius + bot.radius) {
        bot.active = false;
        triggerExplosion(bot.x, bot.y, '#E62429');
        soundSystem.playClick();
        
        const remaining = bots.current.filter(b => b.active).length;
        setBotsLeft(remaining);
        setScore(prev => prev + 100);

        // bounce shield slightly back
        s.vx = -s.vx * 0.95;
        s.vy = -s.vy * 0.95;

        if (remaining === 0) {
          setGameState('won');
          soundSystem.playStoneSocket();
          setTimeout(() => {
            onWin();
          }, 1500);
        }
      }
    });

    // Friction slowdown and return to base after low speed
    const currentSpeed = Math.hypot(s.vx, s.vy);
    if (currentSpeed < 0.8) {
      s.launched = false;
      s.vx = 0;
      s.vy = 0;
      s.x = 40;
      s.y = canvas.height / 2;
    } else {
      // Subtly reduce velocity over time
      s.vx *= 0.994;
      s.vy *= 0.994;
    }
  };

  const drawShield = (ctx) => {
    const s = shield.current;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);

    // Draw Cap's Shield rings
    // Outer red ring
    ctx.fillStyle = '#E62429';
    ctx.beginPath();
    ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
    ctx.fill();

    // Silver ring
    ctx.fillStyle = '#C0C0C0';
    ctx.beginPath();
    ctx.arc(0, 0, s.radius * 0.75, 0, Math.PI * 2);
    ctx.fill();

    // Inner red ring
    ctx.fillStyle = '#E62429';
    ctx.beginPath();
    ctx.arc(0, 0, s.radius * 0.52, 0, Math.PI * 2);
    ctx.fill();

    // Central Blue circle
    ctx.fillStyle = '#00F5FF';
    ctx.beginPath();
    ctx.arc(0, 0, s.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // White Star
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const rx = Math.cos(angle) * s.radius * 0.28;
      const ry = Math.sin(angle) * s.radius * 0.28;
      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
      
      const innerAngle = ((i + 0.5) / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(innerAngle) * s.radius * 0.1, Math.sin(innerAngle) * s.radius * 0.1);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  const triggerExplosion = (x, y, color) => {
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        alpha: 1,
        color,
        decay: 0.02 + Math.random() * 0.02
      });
    }
  };

  const drawExplosions = (ctx) => {
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
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const handleLaunch = () => {
    if (shield.current.launched || gameState !== 'playing') return;

    // Launch vector based on mouse angle
    const angle = Math.atan2(
      mousePos.current.y - shield.current.y,
      mousePos.current.x - shield.current.x
    );
    const speed = 11; // constant speed

    shield.current.vx = Math.cos(angle) * speed;
    shield.current.vy = Math.sin(angle) * speed;
    shield.current.launched = true;

    soundSystem.playClick();
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    mousePos.current.x = e.clientX - rect.left;
    mousePos.current.y = e.clientY - rect.top;
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h3 className="game-title">Cap's Shield Ricochet</h3>
        <p className="game-instructions">Aim at the walls/bots with cursor. Click to launch shield, ricocheting it to defeat red Ultron bots.</p>
      </div>

      <canvas 
        ref={canvasRef} 
        className="game-canvas-element"
        onMouseMove={handleMouseMove}
        onClick={handleLaunch}
      />

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '20px', fontFamily: 'var(--font-hud)', color: '#E62429', fontSize: '1.2rem', fontWeight: 700 }}>
          <div>BOTS REMAINING: {botsLeft}</div>
          <div>SCORE: {score}</div>
        </div>
        
        {gameState === 'won' && (
          <div style={{ color: '#00FF66', fontFamily: 'var(--font-hud)', fontSize: '1.2rem', fontWeight: 700 }}>
            TARGETS ELIMINATED // REALITY STONE SECURED
          </div>
        )}
      </div>
    </div>
  );
};

export default ShieldPhysicsGame;
