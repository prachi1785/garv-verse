import React, { useEffect, useRef, useState } from 'react';
import soundSystem from '../../utils/soundSystem';

const GhostRiderGame = ({ onWin, onLoss, onScoreUpdate, onComboUpdate, onHealthUpdate, isPaused }) => {
  const canvasRef = useRef(null);
  const [distance, setDistance] = useState(0);
  const [heat, setHeat] = useState(0);
  const [nitro, setNitro] = useState(40);
  const [score, setScore] = useState(0);

  const player = useRef({
    x: 180,
    y: 150,
    w: 12,
    h: 26,
    speed: 0,
    targetX: 180,
    targetY: 150,
    jumpZ: 0,
    jumpDir: 0,
    isJumping: false
  });

  const vehicles = useRef([]);
  const canisters = useRef([]);
  const ramps = useRef([]);
  
  const particles = useRef([]);
  const keys = useRef({ ArrowLeft: false, ArrowRight: false, KeyA: false, KeyD: false, Space: false });
  const roadScroll = useRef(0);
  const targetDistance = 2500;

  // 1. Controls listener - attached EXACTLY ONCE on mount
  useEffect(() => {
    console.log('[DEBUG] GhostRiderGame: Controls attached (once)');
    const handleKeyDown = (e) => {
      if (e.code in keys.current) keys.current[e.code] = true;
    };
    const handleKeyUp = (e) => {
      if (e.code in keys.current) keys.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      console.log('[DEBUG] GhostRiderGame: Controls detached');
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

    player.current.x = canvas.width / 2;
    player.current.targetX = canvas.width / 2;

    spawnElements();

    console.log('[DEBUG] GhostRiderGame: Initializing physics loop');
    let frameId;

    const render = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawHighway(ctx, canvas);

      if (!isPaused) {
        updateGame(canvas);
      }

      // Draw Ramps
      ramps.current.forEach((ramp) => {
        if (!ramp.active) return;
        ctx.save();
        ctx.fillStyle = '#C0C0C0';
        ctx.strokeStyle = '#00F5FF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(ramp.x - 12, ramp.y - 15, 24, 30);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#00F5FF';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▲', ramp.x, ramp.y);
        ctx.restore();
      });

      // Draw Canisters
      canisters.current.forEach((can) => {
        if (!can.active) return;
        const pulse = Math.sin(Date.now() * 0.01 + can.y) * 2;
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#FF9900';
        ctx.fillStyle = '#FF9900';
        ctx.beginPath();
        ctx.rect(can.x - 6, can.y - 8 + pulse, 12, 16);
        ctx.fill();
        ctx.restore();
      });

      // Draw Obstacles
      vehicles.current.forEach((veh) => {
        if (!veh.active) return;
        ctx.save();
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#FF5500';
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#FF4400';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(veh.x - 12, veh.y - 20, 24, 40);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#E62429';
        ctx.fillRect(veh.x - 10, veh.y + 16, 4, 3);
        ctx.fillRect(veh.x + 6, veh.y + 16, 4, 3);
        ctx.restore();
      });

      drawPlayerMotorcycle(ctx);
      drawFireParticles(ctx);

      frameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      console.log('[DEBUG] GhostRiderGame: Terminating loop and clearing animations');
      cancelAnimationFrame(frameId);
    };
  }, [isPaused, distance, heat, nitro]);

  const spawnElements = () => {
    vehicles.current = [];
    canisters.current = [];
    ramps.current = [];
    for (let i = 0; i < 20; i++) {
      const lane = Math.floor(Math.random() * 3);
      const laneX = 110 + lane * 60;
      
      vehicles.current.push({
        x: laneX,
        y: -150 - i * 380,
        speed: 1.5 + Math.random() * 2,
        active: true
      });
      
      if (i % 2 === 0) {
        const canLane = (lane + 1) % 3;
        canisters.current.push({
          x: 110 + canLane * 60,
          y: -250 - i * 380,
          active: true
        });
      }

      if (i % 4 === 1) {
        const rampLane = (lane + 2) % 3;
        ramps.current.push({
          x: 110 + rampLane * 60,
          y: -350 - i * 380,
          active: true
        });
      }
    }
  };

  const drawHighway = (ctx, canvas) => {
    ctx.fillStyle = '#05070B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#141822';
    ctx.fillRect(80, 0, canvas.width - 160, canvas.height);

    ctx.strokeStyle = '#FFD84A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(80, 0);
    ctx.lineTo(80, canvas.height);
    ctx.moveTo(canvas.width - 80, 0);
    ctx.lineTo(canvas.width - 80, canvas.height);
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 18]);
    ctx.lineDashOffset = -roadScroll.current;
    
    ctx.beginPath();
    ctx.moveTo(140, 0);
    ctx.lineTo(140, canvas.height);
    ctx.moveTo(200, 0);
    ctx.lineTo(200, canvas.height);
    ctx.stroke();
    ctx.restore();
  };

  const drawPlayerMotorcycle = (ctx) => {
    const p = player.current;
    const sizeScale = 1 + p.jumpZ * 0.45;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(sizeScale, sizeScale);

    ctx.fillStyle = '#05070B';
    ctx.fillRect(-2.5, -12, 5, 24);

    ctx.fillStyle = '#FF9900';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FF3300';
    ctx.fillRect(-1.5, -14, 3, 4);
    ctx.fillRect(-2, 10, 4, 6);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#E62429';
    ctx.fillRect(-4, -6, 8, 12);

    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(-6, 2, 2, 8);
    ctx.fillRect(4, 2, 2, 8);

    ctx.restore();
  };

  const updateGame = (canvas) => {
    const p = player.current;

    const steerSpeed = 4.2;
    if (keys.current.ArrowLeft || keys.current.KeyA) {
      p.x = Math.max(p.x - steerSpeed, 92);
    }
    if (keys.current.ArrowRight || keys.current.KeyD) {
      p.x = Math.min(p.x + steerSpeed, canvas.width - 92);
    }

    const isNitroActive = keys.current.Space && nitro > 10;
    const currentSpeed = isNitroActive ? 7.2 : 4.4;

    if (isNitroActive) {
      setNitro((prev) => Math.max(prev - 0.65, 0));
      setHeat((prev) => {
        const next = Math.min(prev + 0.8, 100);
        onHealthUpdate(100 - next);
        return next;
      });
    } else {
      setHeat((prev) => {
        const next = Math.max(prev - 0.2, 0);
        onHealthUpdate(100 - next);
        return next;
      });
    }

    roadScroll.current = (roadScroll.current + currentSpeed) % 30;
    const nextDistance = distance + currentSpeed * 0.12;
    setDistance(nextDistance);

    const distanceScore = Math.floor(nextDistance * 0.5);
    setScore(distanceScore);
    onScoreUpdate(distanceScore);

    if (nextDistance >= targetDistance) {
      console.log('[DEBUG] GhostRiderGame: Mission completed');
      onWin(distanceScore);
    }

    if (p.isJumping) {
      p.jumpZ += p.jumpDir * 0.08;
      if (p.jumpZ >= 0.6) {
        p.jumpDir = -1;
      }
      if (p.jumpZ <= 0) {
        p.jumpZ = 0;
        p.isJumping = false;
      }
    }

    const fireChance = isNitroActive ? 4 : 2;
    for (let i = 0; i < fireChance; i++) {
      particles.current.push({
        x: p.x + (Math.random() - 0.5) * 4,
        y: p.y + 12,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 1.5 + Math.random() * 3.5,
        size: 3 + Math.random() * 4.5,
        alpha: 0.8,
        color: Math.random() > 0.4 ? '#FF5500' : '#FF9900',
        decay: 0.04
      });
    }

    vehicles.current.forEach((veh) => {
      if (!veh.active) return;
      veh.y += currentSpeed - veh.speed;

      if (veh.y > canvas.height + 40) {
        veh.y = -100 - Math.random() * 200;
        veh.active = true;
      }

      if (!p.isJumping) {
        const dx = Math.abs(p.x - veh.x);
        const dy = Math.abs(p.y - veh.y);
        if (dx < 16 && dy < 30) {
          veh.active = false;
          triggerExplosion(veh.x, veh.y, '#FF5500');
          soundSystem.playClick();
          
          setHeat((prev) => {
            const next = prev + 35;
            onHealthUpdate(Math.max(100 - next, 0));
            if (next >= 100) {
              console.log('[DEBUG] GhostRiderGame: Mission exited/lost (meltdown)');
              onLoss();
              return 100;
            }
            return next;
          });
        }
      }
    });

    canisters.current.forEach((can) => {
      if (!can.active) return;
      can.y += currentSpeed;

      if (can.y > canvas.height + 20) {
        can.y = -200 - Math.random() * 300;
        can.active = true;
      }

      const dx = Math.abs(p.x - can.x);
      const dy = Math.abs(p.y - can.y);
      if (dx < 14 && dy < 16) {
        can.active = false;
        soundSystem.playTick();
        setNitro((prev) => Math.min(prev + 20, 100));
        
        const nextCombo = Math.floor(nitro / 20) + 1;
        onComboUpdate(nextCombo);
      }
    });

    ramps.current.forEach((ramp) => {
      if (!ramp.active) return;
      ramp.y += currentSpeed;

      if (ramp.y > canvas.height + 20) {
        ramp.y = -350 - Math.random() * 400;
        ramp.active = true;
      }

      const dx = Math.abs(p.x - ramp.x);
      const dy = Math.abs(p.y - ramp.y);
      if (dx < 16 && dy < 20) {
        if (!p.isJumping) {
          p.isJumping = true;
          p.jumpDir = 1;
          p.jumpZ = 0.05;
          soundSystem.playStoneSocket();
        }
      }
    });
  };

  const triggerExplosion = (x, y, color) => {
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2,
        alpha: 1,
        color,
        decay: 0.035
      });
    }
  };

  const drawFireParticles = (ctx) => {
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
      ctx.shadowBlur = 8;
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

export default GhostRiderGame;
