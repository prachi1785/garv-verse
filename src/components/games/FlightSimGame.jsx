import React, { useEffect, useRef, useState } from 'react';
import soundSystem from '../../utils/soundSystem';

const FlightSimGame = ({ onWin, onLoss, onScoreUpdate, onComboUpdate, onHealthUpdate, isPaused }) => {
  const canvasRef = useRef(null);
  const [coresCollected, setCoresCollected] = useState(0);
  const [armor, setArmor] = useState(100);

  const ironMan = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, rx: 0, ry: 0 });
  const objects3D = useRef([]);
  const laserBeams = useRef([]);
  const particles = useRef([]);

  const fov = 150;
  const targetCores = 8;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 200;

    generateObjects();
  }, []);

  const generateObjects = () => {
    const list = [];
    for (let i = 0; i < 35; i++) {
      const zDepth = 150 + i * 80;
      const typeRand = Math.random();
      
      let type = 'ring';
      if (typeRand < 0.35) type = 'drone';
      else if (typeRand < 0.70) type = 'core';

      list.push({
        id: i,
        type,
        x: (Math.random() - 0.5) * 220,
        y: (Math.random() - 0.5) * 110,
        z: zDepth,
        active: true
      });
    }
    objects3D.current = list;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    let frameId;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Star tunnels
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * cx * 1.5, cy + Math.sin(angle) * cy * 1.5);
        ctx.stroke();
      }
      ctx.restore();

      // Pause physics update if isPaused
      if (!isPaused) {
        updateGame(canvas);
      }

      // Sort and Draw 3D Objects
      objects3D.current.sort((a, b) => b.z - a.z);

      objects3D.current.forEach((obj) => {
        if (!obj.active || obj.z < 2) return;

        const scale = fov / obj.z;
        const sx = cx + obj.x * scale;
        const sy = cy + obj.y * scale;

        if (sx < -100 || sx > canvas.width + 100 || sy < -100 || sy > canvas.height + 100) return;

        ctx.save();
        ctx.shadowBlur = Math.min(scale * 12, 25);

        if (obj.type === 'ring') {
          ctx.strokeStyle = '#FFD84A';
          ctx.shadowColor = '#FFD84A';
          ctx.lineWidth = Math.max(scale * 3.5, 0.5);
          ctx.beginPath();
          ctx.arc(sx, sy, 35 * scale, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = 'rgba(255, 216, 74, 0.05)';
          ctx.fill();
        } 
        else if (obj.type === 'core') {
          ctx.fillStyle = '#00F5FF';
          ctx.shadowColor = '#00F5FF';
          ctx.beginPath();
          ctx.arc(sx, sy, 12 * scale, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(sx, sy, 5 * scale, 0, Math.PI * 2);
          ctx.fill();
        } 
        else if (obj.type === 'drone') {
          ctx.fillStyle = '#E62429';
          ctx.shadowColor = '#E62429';
          ctx.beginPath();
          ctx.rect(sx - 18 * scale, sy - 8 * scale, 36 * scale, 16 * scale);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(sx, sy, 4 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw Laser Beams
      ctx.save();
      laserBeams.current.forEach((beam) => {
        ctx.strokeStyle = '#00F5FF';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00F5FF';
        ctx.lineWidth = beam.alpha * 4;
        ctx.beginPath();
        ctx.moveTo(beam.x1, beam.y1);
        ctx.lineTo(beam.x2, beam.y2);
        ctx.stroke();
      });
      ctx.restore();

      drawPlayerHUD(ctx, canvas);
      drawSparks(ctx);

      frameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(frameId);
  }, [isPaused, coresCollected, armor]);

  const updateGame = (canvas) => {
    const im = ironMan.current;
    im.x += (im.targetX - im.x) * 0.12;
    im.y += (im.targetY - im.y) * 0.12;

    im.rx = (im.targetX - im.x) * 0.08;
    im.ry = (im.targetY - im.y) * 0.08;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    laserBeams.current.forEach((beam) => {
      beam.alpha -= 0.15;
    });
    laserBeams.current = laserBeams.current.filter((b) => b.alpha > 0);

    objects3D.current.forEach((obj) => {
      if (!obj.active) return;
      obj.z -= 2.6;

      if (obj.z < 2) {
        obj.z = 2500;
        obj.x = (Math.random() - 0.5) * 220;
        obj.y = (Math.random() - 0.5) * 110;
        obj.active = true;
        return;
      }

      if (obj.z < 18) {
        obj.active = false;
        
        const scale = fov / obj.z;
        const sx = cx + obj.x * scale;
        const sy = cy + obj.y * scale;

        const px = cx + im.x;
        const py = cy + im.y;
        
        const dist = Math.hypot(sx - px, sy - py);
        const radius = obj.type === 'ring' ? 35 * scale : obj.type === 'core' ? 12 * scale : 18 * scale;

        if (dist < radius + 15) {
          if (obj.type === 'core') {
            soundSystem.playTick();
            const nextCores = coresCollected + 1;
            setCoresCollected(nextCores);
            triggerExplosion(sx, sy, '#00F5FF');

            // Sync metrics to parent HUD
            onScoreUpdate(nextCores * 200);
            onComboUpdate(nextCores);

            if (nextCores >= targetCores) {
              onWin(nextCores * 200);
            }
          } 
          else if (obj.type === 'ring') {
            soundSystem.playStoneSocket();
            triggerExplosion(sx, sy, '#FFD84A');
            onScoreUpdate((coresCollected * 200) + 100);
          } 
          else if (obj.type === 'drone') {
            soundSystem.playClick();
            const nextArmor = Math.max(armor - 25, 0);
            setArmor(nextArmor);
            onHealthUpdate(nextArmor);

            if (nextArmor <= 0) {
              onLoss();
            }
            triggerExplosion(sx, sy, '#E62429');
          }
        }
      }
    });
  };

  const drawPlayerHUD = (ctx, canvas) => {
    const im = ironMan.current;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const px = cx + im.x;
    const py = cy + im.y;

    // HUD Target Crosshair
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(px - 14, py - 14, 28, 28);
    ctx.stroke();

    ctx.fillStyle = '#00F5FF';
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Stylized Iron Man
    ctx.save();
    ctx.translate(px, py + 22);
    ctx.rotate(im.rx * 0.5);

    const flameGlow = 10 + Math.sin(Date.now() * 0.05) * 5;
    ctx.shadowBlur = flameGlow;
    ctx.shadowColor = '#FF8800';
    ctx.fillStyle = '#FF4400';
    ctx.beginPath();
    ctx.moveTo(-5, 8);
    ctx.lineTo(0, 22 + Math.random() * 8);
    ctx.lineTo(5, 8);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 10;
    ctx.shadowColor = '#E62429';
    ctx.fillStyle = '#E62429';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(-18, 6);
    ctx.lineTo(-6, 2);
    ctx.lineTo(6, 2);
    ctx.lineTo(18, 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFD84A';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(-4, -2);
    ctx.lineTo(4, -2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  const handleFireLaser = (e) => {
    if (isPaused || gameState === 'won') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const px = cx + ironMan.current.x;
    const py = cy + ironMan.current.y;

    let hitTarget = null;
    let maxScale = 0;

    objects3D.current.forEach((obj) => {
      if (!obj.active || obj.type !== 'drone') return;
      const scale = fov / obj.z;
      const sx = cx + obj.x * scale;
      const sy = cy + obj.y * scale;

      const dist = Math.hypot(clickX - sx, clickY - sy);
      if (dist < 28 * scale) {
        if (scale > maxScale) {
          maxScale = scale;
          hitTarget = obj;
        }
      }
    });

    laserBeams.current.push({
      x1: px,
      y1: py,
      x2: clickX,
      y2: clickY,
      alpha: 1
    });

    soundSystem.playTick();

    if (hitTarget) {
      hitTarget.active = false;
      const scale = fov / hitTarget.z;
      const sx = cx + hitTarget.x * scale;
      const sy = cy + hitTarget.y * scale;
      
      triggerExplosion(sx, sy, '#E62429');
      soundSystem.playClick();
      onScoreUpdate((coresCollected * 200) + 150);
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ironMan.current.targetX = mx - cx;
    ironMan.current.targetY = my - cy - 10;
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
      onClick={handleFireLaser}
      onMouseMove={handleMouseMove}
      style={{ cursor: 'none', height: '180px' }} 
    />
  );
};

export default FlightSimGame;
