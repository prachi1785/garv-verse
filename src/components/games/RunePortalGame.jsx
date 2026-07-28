import React, { useEffect, useRef, useState } from 'react';
import soundSystem from '../../utils/soundSystem';

const RunePortalGame = ({ onWin }) => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('playing'); // playing, won
  const [progress, setProgress] = useState(0);

  const isDrawing = useRef(false);
  const tracedPoints = useRef([]);
  const runeNodes = useRef([]);
  const activeNodeIdx = useRef(0);
  const sparks = useRef([]);

  // Generate target nodes for a pentagram-like or triangular magic rune
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 240;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = 70;

    // Define 5 points of a star (pentagram) rune
    const nodes = [];
    const order = [0, 2, 4, 1, 3, 0]; // Drawing order for a 5-pointed star
    
    // Generate standard 5 points on a circle
    const basePoints = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      basePoints.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r
      });
    }

    // Map according to draw order
    order.forEach((index) => {
      nodes.push(basePoints[index]);
    });

    runeNodes.current = nodes;
  }, []);

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let frameId;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Draw background rune circle
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 216, 74, 0.08)';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, 70, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 216, 74, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 70, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Draw target template lines connecting nodes
      if (runeNodes.current.length > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(runeNodes.current[0].x, runeNodes.current[0].y);
        for (let i = 1; i < runeNodes.current.length; i++) {
          ctx.lineTo(runeNodes.current[i].x, runeNodes.current[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Draw already completed segments
      if (runeNodes.current.length > 0 && activeNodeIdx.current > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 216, 74, 0.8)';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FFD84A';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(runeNodes.current[0].x, runeNodes.current[0].y);
        for (let i = 1; i <= activeNodeIdx.current; i++) {
          ctx.lineTo(runeNodes.current[i].x, runeNodes.current[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Draw user drawing stroke line
      if (isDrawing.current && tracedPoints.current.length > 1) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 245, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tracedPoints.current[0].x, tracedPoints.current[0].y);
        for (let i = 1; i < tracedPoints.current.length; i++) {
          ctx.lineTo(tracedPoints.current[i].x, tracedPoints.current[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Draw rune nodes (vertices)
      runeNodes.current.forEach((node, idx) => {
        const isCompleted = idx <= activeNodeIdx.current;
        const isActive = idx === activeNodeIdx.current;

        ctx.save();
        ctx.shadowBlur = isCompleted ? 10 : 0;
        ctx.shadowColor = '#FFD84A';
        ctx.fillStyle = isCompleted ? '#FFD84A' : 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, isActive ? 10 : 6, 0, Math.PI * 2);
        ctx.fill();

        if (isActive) {
          ctx.strokeStyle = '#00F5FF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 14, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      });

      // Draw sparks
      drawSparks(ctx);

      frameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(frameId);
  }, [gameState]);

  const drawSparks = (ctx) => {
    for (let i = sparks.current.length - 1; i >= 0; i--) {
      const s = sparks.current[i];
      s.x += s.vx;
      s.y += s.vy;
      s.alpha -= 0.04;

      if (s.alpha <= 0) {
        sparks.current.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#FFD84A';
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#FFD84A';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const spawnSparks = (x, y) => {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2.5;
      sparks.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 2,
        alpha: 1
      });
    }
  };

  // Mouse/Touch controls
  const handleStartDraw = (e) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if start is near active target node (or the first node)
    const target = runeNodes.current[activeNodeIdx.current];
    const dist = Math.hypot(x - target.x, y - target.y);

    if (dist < 20) {
      isDrawing.current = true;
      tracedPoints.current = [{ x, y }];
      soundSystem.playTick();
    }
  };

  const handleDraw = (e) => {
    if (!isDrawing.current || gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    tracedPoints.current.push({ x, y });

    // Check if mouse is close to the next target node
    const nextIdx = activeNodeIdx.current + 1;
    if (nextIdx < runeNodes.current.length) {
      const nextTarget = runeNodes.current[nextIdx];
      const dist = Math.hypot(x - nextTarget.x, y - nextTarget.y);

      if (dist < 18) {
        // Core node reached! Advance progress
        activeNodeIdx.current = nextIdx;
        spawnSparks(nextTarget.x, nextTarget.y);
        soundSystem.playClick();
        setProgress(Math.round((nextIdx / (runeNodes.current.length - 1)) * 100));

        // Clear drawn points and reset line starting at the node
        tracedPoints.current = [{ x: nextTarget.x, y: nextTarget.y }];

        // Check if finished
        if (nextIdx === runeNodes.current.length - 1) {
          isDrawing.current = false;
          setGameState('won');
          soundSystem.playStoneSocket();
          setTimeout(() => {
            onWin();
          }, 1200);
        }
      }
    }
  };

  const handleEndDraw = () => {
    isDrawing.current = false;
    tracedPoints.current = [];
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h3 className="game-title">Rune Tracing Gateway</h3>
        <p className="game-instructions">Hold down click and drag cursor to trace the golden star rune starting at the glowing node.</p>
      </div>

      <canvas 
        ref={canvasRef} 
        className="game-canvas-element"
        onMouseDown={handleStartDraw}
        onMouseMove={handleDraw}
        onMouseUp={handleEndDraw}
        onMouseLeave={handleEndDraw}
        style={{ cursor: 'crosshair' }}
      />

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <div style={{ fontFamily: 'var(--font-hud)', color: '#FFD84A', fontSize: '1.2rem', fontWeight: 700 }}>
          RUNE TRACING SYNC: {progress}%
        </div>
        
        {gameState === 'won' && (
          <div style={{ color: '#00FF66', fontFamily: 'var(--font-hud)', fontSize: '1.2rem', fontWeight: 700 }}>
            RUNE SIGNED // MIND STONE SECURED
          </div>
        )}
      </div>
    </div>
  );
};

export default RunePortalGame;
