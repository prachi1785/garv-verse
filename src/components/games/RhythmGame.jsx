import React, { useEffect, useRef, useState } from 'react';
import soundSystem from '../../utils/soundSystem';

const RhythmGame = ({ onWin }) => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState('playing'); // playing, won
  const [activeKeys, setActiveKeys] = useState({ A: false, S: false, D: false, F: false });

  const notes = useRef([]);
  const sparks = useRef([]);
  const keys = ['A', 'S', 'D', 'F'];
  const colors = ['#00F5FF', '#FFD84A', '#E62429', '#7F5CFF'];
  
  const nextNoteTime = useRef(0);
  const targetLineY = 190;
  const tolerance = 18; // collision pixel buffer
  const scoreToWin = 800;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 240;

    let frameId;
    let lastTime = 0;

    const render = (time) => {
      const delta = time - lastTime;
      lastTime = time;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const laneWidth = canvas.width / 4;

      // Draw Retro Synth Grid Backdrop
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 255, 102, 0.04)';
      ctx.lineWidth = 1;
      for (let y = 0; y < canvas.height; y += 15) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      ctx.restore();

      // Draw 4 Lanes divider
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * laneWidth, 0);
        ctx.lineTo(i * laneWidth, canvas.height);
        ctx.stroke();
      }
      ctx.restore();

      // Draw Hit Target line at the bottom
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 255, 102, 0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00FF66';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, targetLineY);
      ctx.lineTo(canvas.width, targetLineY);
      ctx.stroke();
      ctx.restore();

      // Draw active key press glows in lanes
      keys.forEach((key, idx) => {
        if (activeKeys[key]) {
          ctx.save();
          ctx.fillStyle = 'rgba(0, 255, 102, 0.12)';
          ctx.beginPath();
          ctx.rect(idx * laneWidth, 0, laneWidth, canvas.height);
          ctx.fill();
          ctx.restore();
        }

        // Draw letter indicators at the bottom
        ctx.save();
        ctx.fillStyle = activeKeys[key] ? '#00FF66' : 'rgba(255, 255, 255, 0.3)';
        ctx.font = 'bold 12px var(--font-hud)';
        ctx.textAlign = 'center';
        ctx.fillText(key, idx * laneWidth + laneWidth / 2, canvas.height - 12);
        ctx.restore();
      });

      // Spawning Notes dynamically
      if (gameState === 'playing' && time > nextNoteTime.current) {
        const randomLane = Math.floor(Math.random() * 4);
        notes.current.push({
          lane: randomLane,
          y: -10,
          speed: 2.8,
          active: true
        });
        nextNoteTime.current = time + 650 + Math.random() * 700; // time offset
      }

      // Update and Draw Notes
      notes.current.forEach((note) => {
        if (!note.active) return;
        note.y += note.speed;

        // Draw note (glowing oval cylinder)
        const nx = note.lane * laneWidth + laneWidth / 2;
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = colors[note.lane];
        ctx.fillStyle = colors[note.lane];
        ctx.beginPath();
        ctx.ellipse(nx, note.y, laneWidth * 0.28, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Check if note fell past bottom (Miss)
        if (note.y > canvas.height + 15) {
          note.active = false;
        }
      });

      // Update and Draw Sparks particles
      drawSparks(ctx);

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);

    // Event listener for Keyboard
    const handleKeyDown = (e) => {
      if (gameState !== 'playing') return;
      const key = e.key.toUpperCase();
      if (keys.includes(key)) {
        setActiveKeys(prev => ({ ...prev, [key]: true }));
        checkHit(key);
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toUpperCase();
      if (keys.includes(key)) {
        setActiveKeys(prev => ({ ...prev, [key]: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, activeKeys, score]);

  const checkHit = (key) => {
    const laneIdx = keys.indexOf(key);
    let hitFound = false;

    for (let i = 0; i < notes.current.length; i++) {
      const note = notes.current[i];
      if (note.active && note.lane === laneIdx) {
        const dist = Math.abs(note.y - targetLineY);
        if (dist <= tolerance) {
          // HIT!
          note.active = false;
          hitFound = true;
          soundSystem.playTick();
          
          // Calculate score based on precision
          const points = dist < tolerance / 2.5 ? 100 : 50;
          const nextScore = score + points;
          setScore(nextScore);

          const canvas = canvasRef.current;
          const laneWidth = canvas.width / 4;
          const px = laneIdx * laneWidth + laneWidth / 2;
          triggerHitSparks(px, targetLineY, colors[laneIdx]);

          if (nextScore >= scoreToWin) {
            setGameState('won');
            soundSystem.playStoneSocket();
            setTimeout(() => {
              onWin();
            }, 1500);
          }
          break;
        }
      }
    }

    if (!hitFound) {
      // Empty tap penalty/click sound
      soundSystem.playTick();
    }
  };

  const triggerHitSparks = (x, y, color) => {
    for (let i = 0; i < 15; i++) {
      const angle = -Math.PI/6 - Math.random() * (Math.PI * 2/3); // spray upwards
      const speed = 1.5 + Math.random() * 4.5;
      sparks.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2.5,
        alpha: 1,
        color,
        decay: 0.03 + Math.random() * 0.02
      });
    }
  };

  const drawSparks = (ctx) => {
    for (let i = sparks.current.length - 1; i >= 0; i--) {
      const s = sparks.current[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.08; // gravity
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

  // Tap handler for mobile layout buttons
  const handleButtonTap = (key) => {
    if (gameState !== 'playing') return;
    setActiveKeys(prev => ({ ...prev, [key]: true }));
    checkHit(key);
    setTimeout(() => {
      setActiveKeys(prev => ({ ...prev, [key]: false }));
    }, 100);
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h3 className="game-title">Guardians Tape Rhythm</h3>
        <p className="game-instructions">Press A, S, D, F (or tap buttons below) when falling nodes cross the green line in sync.</p>
      </div>

      <canvas ref={canvasRef} className="game-canvas-element" />

      {/* Button Row for touch click fallback */}
      <div style={{ display: 'flex', gap: '15px', width: '100%', justifyContent: 'center', marginTop: '10px' }}>
        {keys.map((key, idx) => (
          <button 
            key={key} 
            className="hud-btn" 
            style={{
              padding: '6px 16px',
              fontSize: '0.9rem',
              borderColor: colors[idx] + '99',
              color: colors[idx]
            }}
            onClick={() => handleButtonTap(key)}
          >
            {key}
          </button>
        ))}
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginTop: '5px' }}>
        <div style={{ fontFamily: 'var(--font-hud)', color: '#00FF66', fontSize: '1.2rem', fontWeight: 700 }}>
          POWER SCORE: {score} / {scoreToWin}
        </div>
        
        {gameState === 'won' && (
          <div style={{ color: '#00FF66', fontFamily: 'var(--font-hud)', fontSize: '1.2rem', fontWeight: 700 }}>
            BEAT HARMONIZED // TIME STONE SECURED
          </div>
        )}
      </div>
    </div>
  );
};

export default RhythmGame;
