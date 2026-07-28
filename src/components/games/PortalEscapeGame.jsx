import React, { useEffect, useRef, useState } from 'react';
import soundSystem from '../../utils/soundSystem';

const PortalEscapeGame = ({ onWin, onLoss, onScoreUpdate, onComboUpdate, onHealthUpdate, isPaused }) => {
  const canvasRef = useRef(null);

  const player = useRef({
    x: 80,
    y: 160,
    vy: 0,
    radius: 11,
    angle: 0,
    gravity: 0.38,
    jumpForce: -6.4,
    groundY: 145,
    ceilingY: 45,
    gravityDir: 1,
    onGround: true
  });

  const obstacles = useRef([]);
  const particles = useRef([]);
  const keys = useRef({ Space: false });
  const mapProgress = useRef(0);
  const mapWidth = 2600;

  // 1. Controls listener - attached EXACTLY ONCE on mount
  useEffect(() => {
    console.log('[DEBUG] PortalEscapeGame: Controls attached (once)');
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        keys.current.Space = true;
        triggerJump();
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') keys.current.Space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      console.log('[DEBUG] PortalEscapeGame: Controls detached');
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

    generateLevel();

    console.log('[DEBUG] PortalEscapeGame: Initializing physics loop');
    let frameId;

    const render = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawBackdrop(ctx, canvas);

      // Platforms (Ground & Ceiling)
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#FF9900';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, player.current.ceilingY - player.current.radius);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.rect(0, player.current.groundY + player.current.radius, canvas.width, canvas.height - player.current.groundY);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Draw Spikes / Portals
      obstacles.current.forEach((obj) => {
        if (!obj.active) return;
        const drawX = obj.x - mapProgress.current;
        if (drawX > -40 && drawX < canvas.width + 40) {
          ctx.save();
          if (obj.type === 'spike') {
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#E62429';
            ctx.fillStyle = '#E62429';
            ctx.beginPath();
            if (obj.gravSide === -1) {
              ctx.moveTo(drawX - 8, player.current.ceilingY - 11);
              ctx.lineTo(drawX + 8, player.current.ceilingY - 11);
              ctx.lineTo(drawX, player.current.ceilingY + 6);
            } else {
              ctx.moveTo(drawX - 8, player.current.groundY + 11);
              ctx.lineTo(drawX + 8, player.current.groundY + 11);
              ctx.lineTo(drawX, player.current.groundY - 6);
            }
            ctx.closePath();
            ctx.fill();
          } 
          else if (obj.type === 'gravity') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#7F5CFF';
            ctx.strokeStyle = '#7F5CFF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(drawX, 95, 8, 35, 0, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(127, 92, 255, 0.1)';
            ctx.fill();
          } 
          else if (obj.type === 'teleport') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FFD84A';
            ctx.strokeStyle = '#FFD84A';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(drawX, 95, 8, 35, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 216, 74, 0.1)';
            ctx.fill();
          }
          ctx.restore();
        }
      });

      // Update & Draw Player
      if (!isPaused) {
        updatePhysics(canvas);
      }

      const p = player.current;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      ctx.fillStyle = '#FF9900';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#FF9900';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-p.radius, 0);
      ctx.lineTo(p.radius, 0);
      ctx.moveTo(0, -p.radius);
      ctx.lineTo(0, p.radius);
      ctx.stroke();
      ctx.restore();

      drawSparks(ctx);

      frameId = requestAnimationFrame(render);
    };

    render();

    // Canvas click jump
    const handleCanvasMouseDown = () => {
      triggerJump();
    };
    canvas.addEventListener('mousedown', handleCanvasMouseDown);

    return () => {
      console.log('[DEBUG] PortalEscapeGame: Terminating loop');
      cancelAnimationFrame(frameId);
      canvas.removeEventListener('mousedown', handleCanvasMouseDown);
    };
  }, [isPaused]);

  const generateLevel = () => {
    obstacles.current = [];
    for (let i = 0; i < 22; i++) {
      const distance = 300 + i * 110;
      let type = 'spike';
      let gravSide = 1;
      
      if (i === 5 || i === 12) {
        type = 'gravity';
      } else if (i === 8 || i === 17) {
        type = 'teleport';
      } else {
        gravSide = Math.random() > 0.55 ? -1 : 1;
      }

      obstacles.current.push({
        id: i,
        type,
        x: distance,
        y: type === 'spike' ? (gravSide === 1 ? 135 : 55) : 95,
        gravSide,
        active: true
      });
    }
  };

  const drawBackdrop = (ctx, canvas) => {
    ctx.fillStyle = '#05070B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 153, 0, 0.03)';
    ctx.lineWidth = 1;
    const scrollOffset = mapProgress.current % 30;
    for (let x = -scrollOffset; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + Math.sin(Date.now() * 0.002) * 20, canvas.height);
      ctx.stroke();
    }
    ctx.restore();
  };

  const updatePhysics = (canvas) => {
    const p = player.current;
    
    mapProgress.current += 3.8;
    const percent = Math.min((mapProgress.current / mapWidth) * 100, 100);
    
    onScoreUpdate(Math.round(percent * 15));
    onComboUpdate(Math.floor(percent / 10) + 1);

    if (percent >= 100) {
      console.log('[DEBUG] PortalEscapeGame: Mission completed');
      onWin(1500);
    }

    p.vy += p.gravity * p.gravityDir;
    p.y += p.vy;
    p.angle += 0.08 * p.gravityDir;

    if (p.gravityDir === 1) {
      if (p.y >= p.groundY) {
        p.y = p.groundY;
        p.vy = 0;
        p.onGround = true;
      } else {
        p.onGround = false;
      }
    } else {
      if (p.y <= p.ceilingY) {
        p.y = p.ceilingY;
        p.vy = 0;
        p.onGround = true;
      } else {
        p.onGround = false;
      }
    }

    obstacles.current.forEach((obj) => {
      if (!obj.active) return;

      const objDrawX = obj.x - mapProgress.current;
      if (Math.abs(objDrawX - p.x) < 16) {
        if (obj.type === 'spike') {
          const coll = obj.gravSide === 1 
            ? (p.y >= p.groundY - 14)
            : (p.y <= p.ceilingY + 14);

          if (coll) {
            obj.active = false;
            triggerExplosion(p.x, p.y, '#E62429');
            soundSystem.playClick();

            onHealthUpdate(0);
            console.log('[DEBUG] PortalEscapeGame: Mission exited/failed (spike hit)');
            onLoss();
          }
        } 
        else if (obj.type === 'gravity') {
          obj.active = false;
          p.gravityDir = -p.gravityDir;
          p.vy = 0;
          triggerExplosion(obj.x - mapProgress.current, obj.y, '#7F5CFF');
          soundSystem.playStoneSocket();
        } 
        else if (obj.type === 'teleport') {
          obj.active = false;
          p.y = p.y === p.groundY ? p.ceilingY : p.groundY;
          p.vy = 0;
          triggerExplosion(obj.x - mapProgress.current, obj.y, '#FFD84A');
          soundSystem.playPortalSwoosh();
        }
      }
    });
  };

  const triggerJump = () => {
    const p = player.current;
    if (p.onGround && !isPaused) {
      p.vy = p.jumpForce * p.gravityDir;
      p.onGround = false;
      soundSystem.playTick();
    }
  };

  const triggerExplosion = (x, y, color) => {
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2.5,
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
      style={{ height: '180px' }}
    />
  );
};

export default PortalEscapeGame;
