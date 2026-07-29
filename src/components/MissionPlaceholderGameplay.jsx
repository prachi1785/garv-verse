import React, { useEffect, useRef, useState } from 'react';
import soundSystem from '../utils/soundSystem';

const MissionPlaceholderGameplay = ({ onWin, onLoss, onScoreUpdate, onComboUpdate, onHealthUpdate, isPaused }) => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [combo, setCombo] = useState(1);

  const core = useRef({
    x: 100,
    y: 100,
    vx: 2.2,
    vy: 1.8,
    radius: 20,
    color: '#00f5ff'
  });

  const anomaly = useRef({
    active: false,
    x: 0,
    y: 0,
    radius: 0,
    maxRadius: 60,
    growthSpeed: 1.5
  });

  const particles = useRef([]);
  const mousePos = useRef({ x: 0, y: 0 });

  // Refs to read state variables without re-running effects
  const scoreRef = useRef(0);
  const healthRef = useRef(100);
  const comboRef = useRef(1);
  scoreRef.current = score;
  healthRef.current = health;
  comboRef.current = combo;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 180;

    console.log('[DEBUG] MissionPlaceholderGameplay: Initializing loop');
    let frameId;

    const render = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Cyber Grid Background
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      ctx.restore();

      if (!isPaused) {
        updatePhysics(canvas);
      }

      // Draw Anomaly wave (red ring)
      const a = anomaly.current;
      if (a.active) {
        ctx.save();
        ctx.strokeStyle = '#e62429';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#e62429';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Core Target
      const c = core.current;
      ctx.save();
      const pulsingGlow = 10 + Math.sin(Date.now() * 0.015) * 5;
      ctx.shadowBlur = pulsingGlow;
      ctx.shadowColor = c.color;
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();

      // inner detail
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw click particles
      drawParticles(ctx);

      frameId = requestAnimationFrame(render);
    };

    render();

    // Attach local mouse coordinates
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mousePos.current.x = e.clientX - rect.left;
      mousePos.current.y = e.clientY - rect.top;
    };

    const handleCanvasClick = () => {
      if (isPaused) return;

      const c = core.current;
      const dist = Math.hypot(mousePos.current.x - c.x, mousePos.current.y - c.y);

      if (dist < c.radius + 10) {
        // Success hit
        soundSystem.playTick();
        triggerExplosion(c.x, c.y, '#00f5ff');

        const nextCombo = comboRef.current + 1;
        const nextScore = scoreRef.current + (100 * nextCombo);
        
        setScore(nextScore);
        setCombo(nextCombo);
        onScoreUpdate(nextScore);
        onComboUpdate(nextCombo);

        // Move core to random position instantly
        c.x = 40 + Math.random() * (canvas.width - 80);
        c.y = 40 + Math.random() * (canvas.height - 80);
        c.vx = (Math.random() - 0.5) * 4.4;
        c.vy = (Math.random() - 0.5) * 4.4;

        if (nextScore >= 500) {
          console.log('[DEBUG] MissionPlaceholderGameplay: Victory score threshold reached');
          onWin(nextScore);
        }
      } else {
        // Miss click
        soundSystem.playClick();
        triggerExplosion(mousePos.current.x, mousePos.current.y, '#ffd84a');
        
        setCombo(1);
        onComboUpdate(1);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleCanvasClick);

    return () => {
      console.log('[DEBUG] MissionPlaceholderGameplay: Disposing animation loop and canvas listeners');
      cancelAnimationFrame(frameId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleCanvasClick);
    };
  }, [isPaused]);

  const updatePhysics = (canvas) => {
    const c = core.current;

    // Move Core
    c.x += c.vx;
    c.y += c.vy;

    if (c.x - c.radius < 0) { c.x = c.radius; c.vx = -c.vx; }
    if (c.x + c.radius > canvas.width) { c.x = canvas.width - c.radius; c.vx = -c.vx; }
    if (c.y - c.radius < 0) { c.y = c.radius; c.vy = -c.vy; }
    if (c.y + c.radius > canvas.height) { c.y = canvas.height - c.radius; c.vy = -c.vy; }

    // Update anomaly
    const a = anomaly.current;
    if (a.active) {
      a.radius += a.growthSpeed;
      if (a.radius >= a.maxRadius) {
        // Explodes and damages player
        a.active = false;
        triggerExplosion(a.x, a.y, '#e62429');
        soundSystem.playClick();

        const nextHealth = Math.max(healthRef.current - 25, 0);
        setHealth(nextHealth);
        onHealthUpdate(nextHealth);

        if (nextHealth <= 0) {
          console.log('[DEBUG] MissionPlaceholderGameplay: Defeat health depleted');
          onLoss();
        }
      }
    } else {
      // Chance to spawn new anomaly surge (1.5% rate)
      if (Math.random() < 0.015) {
        a.active = true;
        a.x = 40 + Math.random() * (canvas.width - 80);
        a.y = 40 + Math.random() * (canvas.height - 80);
        a.radius = 5;
      }
    }
  };

  const triggerExplosion = (x, y, color) => {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2,
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

  return (
    <canvas 
      ref={canvasRef} 
      className="game-canvas-element"
      style={{ height: '170px', cursor: 'crosshair' }}
    />
  );
};

export default MissionPlaceholderGameplay;
