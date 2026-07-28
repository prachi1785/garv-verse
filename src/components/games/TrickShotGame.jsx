import React, { useEffect, useRef, useState } from 'react';
import soundSystem from '../../utils/soundSystem';

const TrickShotGame = ({ onWin }) => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('playing'); // playing, won
  const [targetsHit, setTargetsHit] = useState(0);
  const [shotsFired, setShotsFired] = useState(0);

  const bow = useRef({ x: 50, y: 120, pullX: 50, pullY: 120, active: false });
  const arrow = useRef({ x: 50, y: 120, vx: 0, vy: 0, active: false, angle: 0 });
  const target = useRef({ x: 320, y: 120, vx: 1.5, vy: 2, radius: 18 });
  const sparks = useRef([]);

  const gravity = 0.18; // vertical gravity
  const maxPullDist = 65;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 240;

    target.current.x = canvas.width - 60;
    target.current.y = canvas.height / 2;

    let frameId;

    const render = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw active background grid
      ctx.save();
      ctx.strokeStyle = 'rgba(127, 92, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      ctx.restore();

      // Move Target (moves up and down)
      if (gameState === 'playing') {
        target.current.y += target.current.vy;
        if (target.current.y - target.current.radius < 10 || target.current.y + target.current.radius > canvas.height - 10) {
          target.current.vy = -target.current.vy;
        }
      }

      // Draw Moving Target (concentric glowing rings)
      ctx.save();
      const glow = 4 + Math.sin(Date.now() * 0.02) * 2;
      ctx.shadowBlur = glow;
      ctx.shadowColor = '#7F5CFF';
      
      // outer ring
      ctx.strokeStyle = '#7F5CFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(target.current.x, target.current.y, target.current.radius, 0, Math.PI * 2);
      ctx.stroke();

      // inner gold dot
      ctx.fillStyle = '#FFD84A';
      ctx.beginPath();
      ctx.arc(target.current.x, target.current.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw Trajectory line if pulling
      if (bow.current.active && gameState === 'playing') {
        drawTrajectory(ctx);
      }

      // Draw Bow/Sling setup
      ctx.save();
      ctx.strokeStyle = '#F7FFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      // Bow shape
      ctx.arc(bow.current.x - 10, bow.current.y, 25, -Math.PI / 2.2, Math.PI / 2.2);
      ctx.stroke();
      
      // Draw elastic string
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bow.current.x - 10, bow.current.y - 23);
      ctx.lineTo(bow.current.pullX, bow.current.pullY);
      ctx.lineTo(bow.current.x - 10, bow.current.y + 23);
      ctx.stroke();
      ctx.restore();

      // Update and Draw Arrow
      updateArrow(canvas);
      drawArrow(ctx);

      // Draw Sparks
      drawSparks(ctx);

      frameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(frameId);
  }, [gameState, targetsHit]);

  const drawTrajectory = (ctx) => {
    const dx = bow.current.x - bow.current.pullX;
    const dy = bow.current.y - bow.current.pullY;
    const power = Math.hypot(dx, dy) * 0.16;
    const angle = Math.atan2(dy, dx);

    let tx = bow.current.x;
    let ty = bow.current.y;
    let tvx = Math.cos(angle) * power;
    let tvy = Math.sin(angle) * power;

    ctx.save();
    ctx.strokeStyle = 'rgba(127, 92, 255, 0.45)';
    ctx.setLineDash([3, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tx, ty);

    for (let i = 0; i < 40; i++) {
      tx += tvx;
      ty += tvy;
      tvy += gravity;
      ctx.lineTo(tx, ty);
    }
    ctx.stroke();
    ctx.restore();
  };

  const updateArrow = (canvas) => {
    const a = arrow.current;
    if (!a.active) return;

    // Apply gravity
    a.x += a.vx;
    a.y += a.vy;
    a.vy += gravity;

    // Calculate dynamic rotation angle based on velocity vector
    a.angle = Math.atan2(a.vy, a.vx);

    // Check collision with Target
    const dist = Math.hypot(a.x - target.current.x, a.y - target.current.y);
    if (dist < target.current.radius) {
      a.active = false;
      triggerExplosion(target.current.x, target.current.y, '#7F5CFF');
      soundSystem.playClick();
      
      const nextHits = targetsHit + 1;
      setTargetsHit(nextHits);

      if (nextHits >= 3) {
        setGameState('won');
        soundSystem.playStoneSocket();
        setTimeout(() => {
          onWin();
        }, 1500);
      }
    }

    // Bounds check
    if (a.x > canvas.width || a.y > canvas.height || a.x < 0 || a.y < 0) {
      a.active = false;
    }
  };

  const drawArrow = (ctx) => {
    const a = arrow.current;
    if (!a.active) return;

    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.angle);

    // Arrow body
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(15, 0);
    ctx.stroke();

    // Arrow head
    ctx.fillStyle = '#7F5CFF';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(8, -4);
    ctx.lineTo(8, 4);
    ctx.closePath();
    ctx.fill();

    // Arrow fletching (feathers)
    ctx.fillStyle = '#E62429';
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(-20, -5);
    ctx.lineTo(-14, -5);
    ctx.lineTo(-9, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  const triggerExplosion = (x, y, color) => {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3.5;
      sparks.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2.5,
        alpha: 1,
        color,
        decay: 0.025 + Math.random() * 0.02
      });
    }
  };

  const drawSparks = (ctx) => {
    for (let i = sparks.current.length - 1; i >= 0; i--) {
      const s = sparks.current[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.05; // light gravity on sparks
      s.alpha -= s.decay;

      if (s.alpha <= 0) {
        sparks.current.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = s.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  // Mouse Pulling Mechanics
  const handleStartPull = (e) => {
    if (gameState !== 'playing' || arrow.current.active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dist = Math.hypot(x - bow.current.x, y - bow.current.y);
    if (dist < 35) {
      bow.current.active = true;
      bow.current.pullX = x;
      bow.current.pullY = y;
      soundSystem.playTick();
    }
  };

  const handlePull = (e) => {
    if (!bow.current.active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    // Restrict pull distance to maxPullDist
    const dx = x - bow.current.x;
    const dy = y - bow.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist > maxPullDist) {
      const angle = Math.atan2(dy, dx);
      bow.current.pullX = bow.current.x + Math.cos(angle) * maxPullDist;
      bow.current.pullY = bow.current.y + Math.sin(angle) * maxPullDist;
    } else {
      bow.current.pullX = x;
      bow.current.pullY = y;
    }
  };

  const handleRelease = () => {
    if (!bow.current.active) return;
    bow.current.active = false;

    // Launch arrow
    const dx = bow.current.x - bow.current.pullX;
    const dy = bow.current.y - bow.current.pullY;
    const power = Math.hypot(dx, dy) * 0.16; // power constant multiplier
    const angle = Math.atan2(dy, dx);

    arrow.current.x = bow.current.x;
    arrow.current.y = bow.current.y;
    arrow.current.vx = Math.cos(angle) * power;
    arrow.current.vy = Math.sin(angle) * power;
    arrow.current.active = true;

    // Reset bow pull positions
    bow.current.pullX = bow.current.x;
    bow.current.pullY = bow.current.y;

    setShotsFired(prev => prev + 1);
    soundSystem.playClick();
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h3 className="game-title">Hawkeye's Precision Shot</h3>
        <p className="game-instructions">Click and drag elastic string backwards from the bow, aim, and release to shoot the moving purple target.</p>
      </div>

      <canvas 
        ref={canvasRef} 
        className="game-canvas-element"
        onMouseDown={handleStartPull}
        onMouseMove={handlePull}
        onMouseUp={handleRelease}
        onMouseLeave={handleRelease}
        style={{ cursor: bow.current.active ? 'grabbing' : 'grab' }}
      />

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '20px', fontFamily: 'var(--font-hud)', color: '#7F5CFF', fontSize: '1.2rem', fontWeight: 700 }}>
          <div>TARGETS ELIMINATED: {targetsHit} / 3</div>
          <div>SHOTS FIRED: {shotsFired}</div>
        </div>
        
        {gameState === 'won' && (
          <div style={{ color: '#00FF66', fontFamily: 'var(--font-hud)', fontSize: '1.2rem', fontWeight: 700 }}>
            TARGETS DESTROYED // POWER STONE SECURED
          </div>
        )}
      </div>
    </div>
  );
};

export default TrickShotGame;
