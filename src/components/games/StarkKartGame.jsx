import React, { useEffect, useRef, useState } from 'react';
import soundSystem from '../../utils/soundSystem';

const StarkKartGame = ({ onWin, onLoss, onScoreUpdate, onComboUpdate, isPaused }) => {
  const canvasRef = useRef(null);
  const [lap, setLap] = useState(1);

  // Player kart properties
  const player = useRef({
    x: 80,
    y: 70,
    vx: 0,
    vy: 0,
    angle: 0,
    speed: 0,
    maxSpeed: 4.8,
    accel: 0.15,
    decel: 0.08,
    radius: 9,
    drift: false,
    skids: [],
    crossedLine: false
  });

  // Opponent AI kart properties
  const opponent = useRef({
    x: 80,
    y: 85,
    angle: 0,
    speed: 3.5,
    radius: 9,
    nodeIdx: 0,
    crossedLine: false,
    lap: 1
  });

  const trackPath = useRef([
    { x: 80, y: 75 },
    { x: 260, y: 75 },
    { x: 310, y: 125 },
    { x: 260, y: 175 },
    { x: 80, y: 175 },
    { x: 40, y: 125 }
  ]);

  const particles = useRef([]);
  const keys = useRef({ ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, KeyW: false, KeyS: false, KeyA: false, KeyD: false });

  // 1. Controls listener - attached EXACTLY ONCE on mount
  useEffect(() => {
    console.log('[DEBUG] StarkKartGame: Controls attached (once)');
    const handleKeyDown = (e) => {
      if (e.code in keys.current) {
        keys.current[e.code] = true;
      }
    };
    const handleKeyUp = (e) => {
      if (e.code in keys.current) {
        keys.current[e.code] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      console.log('[DEBUG] StarkKartGame: Controls detached');
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

    console.log('[DEBUG] StarkKartGame: Initializing physics loop');
    let frameId;

    const render = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawTrack(ctx, canvas);

      if (!isPaused) {
        updatePlayer(canvas);
        updateOpponent(canvas);
      }

      // Draw drift skids
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 2.5;
      player.current.skids.forEach((skid) => {
        if (skid.length > 1) {
          ctx.beginPath();
          ctx.moveTo(skid[0].x, skid[0].y);
          for (let i = 1; i < skid.length; i++) {
            ctx.lineTo(skid[i].x, skid[i].y);
          }
          ctx.stroke();
        }
      });
      ctx.restore();

      // Draw Opponent Kart
      drawKart(ctx, opponent.current.x, opponent.current.y, opponent.current.angle, '#FFD84A');

      // Draw Player Kart
      const p = player.current;
      drawKart(ctx, p.x, p.y, p.angle, '#7F5CFF');

      drawSmoke(ctx);

      frameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      console.log('[DEBUG] StarkKartGame: Terminating loop and clearing animations');
      cancelAnimationFrame(frameId);
    };
  }, [isPaused, lap]); // React to isPaused and lap changes cleanly

  const drawTrack = (ctx, canvas) => {
    ctx.fillStyle = '#05070B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 42;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(trackPath.current[0].x, trackPath.current[0].y);
    for (let i = 1; i < trackPath.current.length; i++) {
      ctx.lineTo(trackPath.current[i].x, trackPath.current[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 245, 255, 0.15)';
    ctx.lineWidth = 36;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(110, 54);
    ctx.lineTo(110, 96);
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(108, 56, 4, 4);
    ctx.fillRect(112, 60, 4, 4);
    ctx.fillRect(108, 64, 4, 4);
    ctx.fillRect(112, 68, 4, 4);
    ctx.fillRect(108, 72, 4, 4);
    ctx.fillRect(112, 76, 4, 4);
    ctx.fillRect(108, 80, 4, 4);
    ctx.fillRect(112, 84, 4, 4);
    ctx.fillRect(108, 88, 4, 4);
    ctx.fillRect(112, 92, 4, 4);
    ctx.restore();
  };

  const drawKart = (ctx, x, y, angle, color) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(-8, -6, 4, 2);
    ctx.fillRect(4, -6, 4, 2);
    ctx.fillRect(-8, 4, 4, 2);
    ctx.fillRect(4, 4, 4, 2);

    ctx.fillStyle = color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.rect(-6, -4, 12, 8);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-1, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const updatePlayer = (canvas) => {
    const p = player.current;

    if (keys.current.ArrowUp || keys.current.KeyW) {
      p.speed = Math.min(p.speed + p.accel, p.maxSpeed);
    } else if (keys.current.ArrowDown || keys.current.KeyS) {
      p.speed = Math.max(p.speed - p.decel * 1.5, -p.maxSpeed * 0.4);
    } else {
      if (p.speed > 0) p.speed = Math.max(p.speed - p.decel, 0);
      else p.speed = Math.min(p.speed + p.decel, 0);
    }

    const steerSpeed = 0.058 * (p.speed / p.maxSpeed + 0.15);
    if (keys.current.ArrowLeft || keys.current.KeyA) {
      p.angle -= steerSpeed;
      if (p.speed > 2.5) triggerDrift();
    } else if (keys.current.ArrowRight || keys.current.KeyD) {
      p.angle += steerSpeed;
      if (p.speed > 2.5) triggerDrift();
    } else {
      p.drift = false;
    }

    p.vx = Math.cos(p.angle) * p.speed;
    p.vy = Math.sin(p.angle) * p.speed;
    p.x += p.vx;
    p.y += p.vy;

    const offRoad = checkOffRoad(p.x, p.y);
    if (offRoad) {
      p.speed *= 0.88;
    }

    // Lap Checks
    if (p.x > 105 && p.x < 115 && p.y > 54 && p.y < 96) {
      if (!p.crossedLine) {
        p.crossedLine = true;
        
        if (p.vx > 0) {
          const nextLap = lap + 1;
          
          const currentLapScore = lap * 500;
          onScoreUpdate(currentLapScore);
          onComboUpdate(lap);

          if (nextLap > 3) {
            console.log('[DEBUG] StarkKartGame: Mission completed (player won)');
            onWin(1500);
          } else {
            setLap(nextLap);
            soundSystem.playStoneSocket();
          }
        }
      }
    } else {
      p.crossedLine = false;
    }
  };

  const triggerDrift = () => {
    const p = player.current;
    p.drift = true;

    const skidX = p.x - Math.cos(p.angle) * 5;
    const skidY = p.y - Math.sin(p.angle) * 5;

    if (p.skids.length === 0 || p.skids[p.skids.length - 1].length > 10) {
      p.skids.push([{ x: skidX, y: skidY }]);
    } else {
      p.skids[p.skids.length - 1].push({ x: skidX, y: skidY });
    }

    for (let i = 0; i < 2; i++) {
      particles.current.push({
        x: skidX,
        y: skidY,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: 3 + Math.random() * 4,
        alpha: 0.6,
        decay: 0.04
      });
    }
  };

  const checkOffRoad = (x, y) => {
    let minWaypointDist = 99999;
    const wps = trackPath.current;
    for (let i = 0; i < wps.length; i++) {
      const p1 = wps[i];
      const p2 = wps[(i + 1) % wps.length];
      
      const segmentDist = distToSegment({ x, y }, p1, p2);
      if (segmentDist < minWaypointDist) {
        minWaypointDist = segmentDist;
      }
    }
    return minWaypointDist > 30;
  };

  const distToSegment = (p, v, w) => {
    const l2 = Math.hypot(v.x - w.x, v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  };

  const updateOpponent = (canvas) => {
    const o = opponent.current;
    const target = trackPath.current[o.nodeIdx];
    const dx = target.x - o.x;
    const dy = target.y - o.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 15) {
      o.nodeIdx = (o.nodeIdx + 1) % trackPath.current.length;
    }

    o.angle = Math.atan2(dy, dx);
    o.x += Math.cos(o.angle) * o.speed;
    o.y += Math.sin(o.angle) * o.speed;

    if (o.x > 105 && o.x < 115 && o.y > 54 && o.y < 96) {
      if (!o.crossedLine) {
        o.crossedLine = true;
        o.lap += 1;
        if (o.lap > 3) {
          console.log('[DEBUG] StarkKartGame: Mission exited/lost (opponent won)');
          onLoss();
        }
      }
    } else {
      o.crossedLine = false;
    }
  };

  const drawSmoke = (ctx) => {
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
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
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

export default StarkKartGame;
