import React, { useEffect, useRef, useState } from 'react';
import soundSystem from '../../utils/soundSystem';

const ArcCalibrationGame = ({ onWin }) => {
  const canvasRef = useRef(null);
  const [activeRing, setActiveRing] = useState(0); // 0, 1, 2
  const [calibratedCount, setCalibratedCount] = useState(0);
  const [gameState, setGameState] = useState('playing'); // playing, won, lost

  const ringAngles = useRef([0, Math.PI / 2, Math.PI]);
  const ringSpeeds = useRef([0.04, -0.06, 0.08]);
  const ringLocked = useRef([false, false, false]);
  const targetWindow = useRef({ start: -0.2, end: 0.2 }); // Target slice around 0 rads

  // Particles system for sparks
  const particles = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 240;

    let frameId;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Draw Target Area slice (glowing wedge)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 95, targetWindow.current.start, targetWindow.current.end);
      ctx.strokeStyle = 'rgba(255, 216, 74, 0.15)';
      ctx.lineWidth = 15;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 95, targetWindow.current.start, targetWindow.current.end);
      ctx.strokeStyle = 'rgba(255, 216, 74, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Render 3 Calibration Rings
      const radii = [90, 70, 50];
      const colors = ['#00F5FF', '#7F5CFF', '#E62429'];

      radii.forEach((radius, idx) => {
        // Update angle if not locked
        if (!ringLocked.current[idx]) {
          ringAngles.current[idx] += ringSpeeds.current[idx];
          // normalize angle
          ringAngles.current[idx] = ringAngles.current[idx] % (Math.PI * 2);
          if (ringAngles.current[idx] < 0) {
            ringAngles.current[idx] += Math.PI * 2;
          }
        }

        // Draw track ring
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = ringLocked.current[idx] 
          ? 'rgba(0, 255, 102, 0.3)' 
          : 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw active node indicator
        const angle = ringAngles.current[idx];
        const nodeX = cx + Math.cos(angle) * radius;
        const nodeY = cy + Math.sin(angle) * radius;

        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = ringLocked.current[idx] ? '#00FF66' : colors[idx];
        ctx.fillStyle = ringLocked.current[idx] ? '#00FF66' : colors[idx];
        ctx.beginPath();
        ctx.arc(nodeX, nodeY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw current selection halo ring
        if (activeRing === idx && gameState === 'playing') {
          ctx.beginPath();
          ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 245, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // Render sparks particles
      drawSparks(ctx);

      // Core Reactor Energy glow
      ctx.save();
      const pulseRadius = 25 + Math.sin(Date.now() * 0.01) * 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00F5FF';
      ctx.fillStyle = '#00F5FF';
      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // core inner white
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      frameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(frameId);
  }, [activeRing, gameState, calibratedCount]);

  const drawSparks = (ctx) => {
    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // gravity
      p.alpha -= 0.03;

      if (p.alpha <= 0) {
        particles.current.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#00FF66';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#00FF66';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const spawnSparks = (x, y) => {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2,
        alpha: 1
      });
    }
  };

  const handleCalibrate = () => {
    if (gameState !== 'playing') return;

    soundSystem.playClick();

    const currentAngle = ringAngles.current[activeRing];
    const radii = [90, 70, 50];
    const radius = radii[activeRing];
    
    // Check if currentAngle is in target slice
    // Alignments center around 0. Allow tolerance.
    // e.g. angle between [0, 0.25] or [Math.PI * 2 - 0.25, Math.PI * 2]
    const margin = 0.28; // angle tolerance
    const normalizedAngle = currentAngle % (Math.PI * 2);
    
    const isMatched = normalizedAngle <= margin || normalizedAngle >= (Math.PI * 2 - margin);

    if (isMatched) {
      // Lock ring
      ringLocked.current[activeRing] = true;
      const cx = canvasRef.current.width / 2;
      const cy = canvasRef.current.height / 2;
      spawnSparks(cx + radius, cy);
      
      const nextCount = calibratedCount + 1;
      setCalibratedCount(nextCount);

      if (activeRing === 2) {
        setGameState('won');
        soundSystem.playStoneSocket();
        setTimeout(() => {
          onWin();
        }, 1200);
      } else {
        setActiveRing(activeRing + 1);
      }
    } else {
      // Fail calibration - reset
      soundSystem.playTick();
      ringLocked.current = [false, false, false];
      setCalibratedCount(0);
      setActiveRing(0);
    }
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h3 className="game-title">Arc Calibration Core</h3>
        <p className="game-instructions">Click CALIBRATE when the rotating nodes align with the glowing gold slice.</p>
      </div>

      <canvas ref={canvasRef} className="game-canvas-element" />

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <div style={{ fontFamily: 'var(--font-hud)', color: '#00F5FF', fontSize: '1.2rem', fontWeight: 700 }}>
          ALIGNMENT SYNC: {calibratedCount === 0 ? '0%' : calibratedCount === 1 ? '33%' : calibratedCount === 2 ? '66%' : '100%'}
        </div>
        
        {gameState === 'won' ? (
          <div style={{ color: '#00FF66', fontFamily: 'var(--font-hud)', fontSize: '1.2rem', fontWeight: 700 }}>
            CORE CALIBRATED // SPACE STONE SECURED
          </div>
        ) : (
          <button className="hud-btn gold" onClick={handleCalibrate} style={{ minWidth: '180px' }}>
            CALIBRATE REACTOR
          </button>
        )}
      </div>
    </div>
  );
};

export default ArcCalibrationGame;
