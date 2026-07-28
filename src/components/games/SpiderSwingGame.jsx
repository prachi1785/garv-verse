import React, { useEffect, useRef, useState } from 'react';
import soundSystem from '../../utils/soundSystem';

const SpiderSwingGame = ({ onWin, onLoss, onScoreUpdate, onComboUpdate, isPaused }) => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [tokens, setTokens] = useState(0);

  const player = useRef({
    x: 80,
    y: 120,
    vx: 3.2,
    vy: 0,
    radius: 12,
    mass: 1,
    rotation: 0,
    isSwinging: false,
    anchor: { x: 0, y: 0 },
    restLength: 100
  });

  const anchorPoints = useRef([]);
  const drones = useRef([]);
  const spiderTokens = useRef([]);
  const progress = useRef(0);
  const gravity = 0.22;
  const finishDistance = 2500;
  
  // Track sparks
  const particles = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 200; // slightly smaller height to fit HUD inside portal

    // Generate anchors
    for (let i = 0; i < 20; i++) {
      anchorPoints.current.push({
        x: 120 + i * 160 + (Math.random() - 0.5) * 40,
        y: 15 + Math.random() * 25
      });
    }

    // Generate tokens
    for (let i = 0; i < 15; i++) {
      spiderTokens.current.push({
        x: 200 + i * 180 + (Math.random() - 0.5) * 60,
        y: 60 + Math.random() * 70,
        active: true
      });
    }

    // Generate drones
    for (let i = 0; i < 10; i++) {
      drones.current.push({
        x: 350 + i * 280 + (Math.random() - 0.5) * 80,
        y: 50 + Math.random() * 80,
        active: true,
        phase: Math.random() * Math.PI * 2
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let frameId;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw city grid scrolling
      ctx.save();
      ctx.strokeStyle = 'rgba(230, 36, 41, 0.03)';
      ctx.lineWidth = 1;
      const scrollOffset = progress.current % 40;
      for (let x = -scrollOffset; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      ctx.restore();

      // Only update physics if NOT paused
      if (!isPaused) {
        updatePhysics(canvas);
      }

      // Draw anchors
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      anchorPoints.current.forEach((pt) => {
        const drawX = pt.x - progress.current;
        if (drawX > -20 && drawX < canvas.width + 20) {
          ctx.beginPath();
          ctx.arc(drawX, pt.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();

      // Draw Web string
      const p = player.current;
      if (p.isSwinging) {
        const drawAnchorX = p.anchor.x - progress.current;
        const drawPlayerX = p.x - progress.current;

        ctx.save();
        ctx.strokeStyle = '#FFFFFF';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#FFFFFF';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(drawPlayerX, p.y);
        ctx.lineTo(drawAnchorX, p.anchor.y);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Tokens
      ctx.save();
      spiderTokens.current.forEach((tok) => {
        if (!tok.active) return;
        const drawX = tok.x - progress.current;
        if (drawX > -20 && drawX < canvas.width + 20) {
          const bounce = Math.sin(Date.now() * 0.01 + tok.x) * 4;
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#FFD84A';
          ctx.fillStyle = '#FFD84A';
          ctx.beginPath();
          ctx.arc(drawX, tok.y + bounce, 7, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#05070B';
          ctx.font = 'bold 7px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('S', drawX, tok.y + bounce + 2.5);
        }
      });
      ctx.restore();

      // Draw Drones
      ctx.save();
      drones.current.forEach((drone) => {
        if (!drone.active) return;
        const drawX = drone.x - progress.current;
        if (drawX > -20 && drawX < canvas.width + 20) {
          const hoverY = drone.y + Math.sin(Date.now() * 0.008 + drone.phase) * 12;
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#E62429';
          ctx.fillStyle = '#E62429';
          ctx.beginPath();
          ctx.rect(drawX - 10, hoverY - 6, 20, 12);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(drawX, hoverY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();

      // Draw Spidey
      const drawPX = p.x - progress.current;
      ctx.save();
      ctx.translate(drawPX, p.y);
      ctx.rotate(p.rotation);

      ctx.fillStyle = '#E62429';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#E62429';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#05070B';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-p.radius, 0);
      ctx.lineTo(p.radius, 0);
      ctx.moveTo(0, -p.radius);
      ctx.lineTo(0, p.radius);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(-4, -3, 3.5, 2, -Math.PI / 4, 0, Math.PI * 2);
      ctx.ellipse(4, -3, 3.5, 2, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      drawSparks(ctx);

      frameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(frameId);
  }, [isPaused]);

  const updatePhysics = (canvas) => {
    const p = player.current;
    p.vy += gravity;

    if (p.isSwinging) {
      const dx = p.x - p.anchor.x;
      const dy = p.y - p.anchor.y;
      const dist = Math.hypot(dx, dy);

      const tensionForce = (dist - p.restLength) * 0.052;
      const dirX = dx / dist;
      const dirY = dy / dist;

      p.vx -= dirX * tensionForce;
      p.vy -= dirY * tensionForce;
      p.rotation = Math.atan2(dy, dx) - Math.PI / 2;
    } else {
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 4.5) {
        p.rotation += 0.12;
      }
    }

    p.vx = Math.max(Math.min(p.vx, 8.5), 1.5);
    p.vy = Math.max(Math.min(p.vy, 7.5), -7.5);

    p.x += p.vx;
    p.y += p.vy;

    progress.current = p.x - 80;

    if (p.y - p.radius < 5) {
      p.y = p.radius + 5;
      p.vy = -p.vy * 0.5;
    }
    if (p.y + p.radius > canvas.height - 15) {
      p.y = canvas.height - p.radius - 15;
      p.vy = -p.vy * 0.6;
    }

    // Token checks
    spiderTokens.current.forEach((tok) => {
      if (!tok.active) return;
      const dist = Math.hypot(p.x - tok.x, p.y - tok.y);
      if (dist < p.radius + 7) {
        tok.active = false;
        soundSystem.playTick();
        
        const nextTokens = tokens + 1;
        const nextScore = score + 150;
        setTokens(nextTokens);
        setScore(nextScore);

        // Sync with HUD wrapper
        onScoreUpdate(nextScore);
        onComboUpdate(nextTokens);
      }
    });

    // Drone checks
    drones.current.forEach((drone) => {
      if (!drone.active) return;
      const hoverY = drone.y + Math.sin(Date.now() * 0.008 + drone.phase) * 12;
      const dist = Math.hypot(p.x - drone.x, p.y - hoverY);
      if (dist < p.radius + 10) {
        drone.active = false;
        p.vx = 1.0;
        p.vy = 2.0;
        
        const nextScore = Math.max(score - 200, 0);
        setScore(nextScore);
        onScoreUpdate(nextScore);
        
        triggerExplosion(p.x - progress.current, p.y, '#E62429');
        soundSystem.playClick();
      }
    });

    // Reach finish check
    if (p.x >= finishDistance) {
      onWin(score);
    }
  };

  const handleMouseDown = () => {
    if (isPaused) return;

    const p = player.current;
    let closest = null;
    let minDist = 999999;

    anchorPoints.current.forEach((pt) => {
      if (pt.x > p.x - 20) {
        const dist = Math.hypot(pt.x - p.x, pt.y - p.y);
        if (dist < minDist && dist < 220) {
          minDist = dist;
          closest = pt;
        }
      }
    });

    if (closest) {
      p.anchor = closest;
      p.restLength = Math.min(minDist * 0.85, 120);
      p.isSwinging = true;
      soundSystem.playPortalSwoosh();
    }
  };

  const handleMouseUp = () => {
    player.current.isSwinging = false;
  };

  const triggerExplosion = (x, y, color) => {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 2,
        alpha: 1,
        color,
        decay: 0.035
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
      onMouseDown={handleMouseDown} 
      onMouseUp={handleMouseUp}
      style={{ cursor: 'pointer', height: '180px' }} 
    />
  );
};

export default SpiderSwingGame;
