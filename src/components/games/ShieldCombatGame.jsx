import React, { useEffect, useRef, useState } from 'react';
import soundSystem from '../../utils/soundSystem';

const ShieldCombatGame = ({ onWin, onLoss, onScoreUpdate, onComboUpdate, isPaused }) => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);

  const shield = useRef({
    x: 40,
    y: 120,
    vx: 0,
    vy: 0,
    radius: 13,
    launched: false,
    angle: 0
  });

  const bots = useRef([
    { id: 1, x: 260, y: 50, radius: 14, vx: 2, active: true },
    { id: 2, x: 330, y: 110, radius: 14, vx: -1.5, active: true },
    { id: 3, x: 260, y: 170, radius: 14, vx: 2.5, active: true },
    { id: 4, x: 340, y: 190, radius: 14, vx: -2, active: true }
  ]);

  const crates = useRef([
    { id: 1, x: 190, y: 40, w: 20, h: 40, active: true },
    { id: 2, x: 190, y: 130, w: 20, h: 40, active: true },
    { id: 3, x: 130, y: 85, w: 20, h: 40, active: true }
  ]);

  const particles = useRef([]);
  const mousePos = useRef({ x: 0, y: 0 });
  const hitCountThisLaunch = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 200;

    shield.current.x = 45;
    shield.current.y = canvas.height / 2;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let frameId;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.strokeStyle = 'rgba(230, 36, 41, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      ctx.restore();

      if (!shield.current.launched && !isPaused) {
        ctx.save();
        ctx.strokeStyle = 'rgba(230, 36, 41, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(shield.current.x, shield.current.y);
        ctx.lineTo(mousePos.current.x, mousePos.current.y);
        ctx.stroke();
        ctx.restore();
      }

      // Draw barriers
      crates.current.forEach((crate) => {
        if (!crate.active) return;
        ctx.save();
        ctx.fillStyle = 'rgba(255, 216, 74, 0.12)';
        ctx.strokeStyle = '#FFD84A';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(crate.x, crate.y, crate.w, crate.h);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 216, 74, 0.3)';
        ctx.beginPath();
        ctx.moveTo(crate.x, crate.y);
        ctx.lineTo(crate.x + crate.w, crate.y + crate.h);
        ctx.moveTo(crate.x + crate.w, crate.y);
        ctx.lineTo(crate.x, crate.y + crate.h);
        ctx.stroke();
        ctx.restore();
      });

      // Update & Draw Shield
      if (!isPaused) {
        updatePhysics(canvas);
      }
      drawShield(ctx);

      // Move & Draw Bots
      bots.current.forEach((bot) => {
        if (!bot.active) return;

        if (!isPaused) {
          bot.x += bot.vx;
          if (bot.x - bot.radius < 180 || bot.x + bot.radius > canvas.width - 20) {
            bot.vx = -bot.vx;
          }
        }

        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#E62429';
        ctx.fillStyle = '#E62429';
        ctx.beginPath();
        ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(bot.x - 3, bot.y - 2, 2.2, 0, Math.PI * 2);
        ctx.arc(bot.x + 3, bot.y - 2, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      drawSparks(ctx);

      frameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(frameId);
  }, [isPaused, score]);

  const updatePhysics = (canvas) => {
    const s = shield.current;
    if (!s.launched) return;

    s.x += s.vx;
    s.y += s.vy;
    s.angle += 0.28;

    if (s.x - s.radius < 0) {
      s.x = s.radius;
      s.vx = -s.vx;
      soundSystem.playTick();
    }
    if (s.x + s.radius > canvas.width) {
      s.x = canvas.width - s.radius;
      s.vx = -s.vx;
      soundSystem.playTick();
    }
    if (s.y - s.radius < 0) {
      s.y = s.radius;
      s.vy = -s.vy;
      soundSystem.playTick();
    }
    if (s.y + s.radius > canvas.height) {
      s.y = canvas.height - s.radius;
      s.vy = -s.vy;
      soundSystem.playTick();
    }

    crates.current.forEach((crate) => {
      if (!crate.active) return;

      const closestX = Math.max(crate.x, Math.min(s.x, crate.x + crate.w));
      const closestY = Math.max(crate.y, Math.min(s.y, crate.y + crate.h));
      const dist = Math.hypot(s.x - closestX, s.y - closestY);

      if (dist < s.radius) {
        crate.active = false;
        triggerExplosion(closestX, closestY, '#FFD84A');
        soundSystem.playClick();

        const diffX = s.x - (crate.x + crate.w / 2);
        const diffY = s.y - (crate.y + crate.h / 2);
        if (Math.abs(diffX / crate.w) > Math.abs(diffY / crate.h)) {
          s.vx = -s.vx;
        } else {
          s.vy = -s.vy;
        }
      }
    });

    bots.current.forEach((bot) => {
      if (!bot.active) return;
      const dist = Math.hypot(s.x - bot.x, s.y - bot.y);
      if (dist < s.radius + bot.radius) {
        bot.active = false;
        triggerExplosion(bot.x, bot.y, '#E62429');
        soundSystem.playClick();
        
        hitCountThisLaunch.current += 1;
        const nextScore = score + (100 * hitCountThisLaunch.current);
        setScore(nextScore);
        
        // Notify HUD
        onScoreUpdate(nextScore);
        onComboUpdate(hitCountThisLaunch.current);

        const remaining = bots.current.filter((b) => b.active).length;

        s.vx = -s.vx * 0.98;
        s.vy = -s.vy * 0.98;

        if (remaining === 0) {
          onWin(nextScore);
        }
      }
    });

    const speed = Math.hypot(s.vx, s.vy);
    if (speed < 0.75) {
      s.launched = false;
      s.vx = 0;
      s.vy = 0;
      s.x = 45;
      s.y = canvas.height / 2;
      hitCountThisLaunch.current = 0;
      onComboUpdate(1);
    } else {
      s.vx *= 0.993;
      s.vy *= 0.993;
    }
  };

  const drawShield = (ctx) => {
    const s = shield.current;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);

    ctx.fillStyle = '#E62429';
    ctx.shadowBlur = s.launched ? 12 : 4;
    ctx.shadowColor = '#E62429';
    ctx.beginPath();
    ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#C0C0C0';
    ctx.beginPath();
    ctx.arc(0, 0, s.radius * 0.75, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#E62429';
    ctx.beginPath();
    ctx.arc(0, 0, s.radius * 0.52, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00F5FF';
    ctx.beginPath();
    ctx.arc(0, 0, s.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

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

  const handleLaunch = () => {
    if (shield.current.launched || isPaused) return;

    const angle = Math.atan2(
      mousePos.current.y - shield.current.y,
      mousePos.current.x - shield.current.x
    );
    const speed = 12.5;

    shield.current.vx = Math.cos(angle) * speed;
    shield.current.vy = Math.sin(angle) * speed;
    shield.current.launched = true;
    hitCountThisLaunch.current = 0;
    onComboUpdate(1);

    soundSystem.playClick();
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    mousePos.current.x = e.clientX - rect.left;
    mousePos.current.y = e.clientY - rect.top;
  };

  const triggerExplosion = (x, y, color) => {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.2 + Math.random() * 2,
        alpha: 1,
        color,
        decay: 0.03
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
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;
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
      onMouseMove={handleMouseMove}
      onClick={handleLaunch}
      style={{ height: '180px' }}
    />
  );
};

export default ShieldCombatGame;
