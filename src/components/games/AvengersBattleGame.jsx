import React, { useEffect, useRef, useState } from 'react';
import soundSystem from '../../utils/soundSystem';

const AvengersBattleGame = ({ onWin, onLoss, onScoreUpdate, onComboUpdate, onHealthUpdate, isPaused }) => {
  const canvasRef = useRef(null);
  const [activeHero, setActiveHero] = useState('IronMan');
  const [thorCooldown, setThorCooldown] = useState(0);
  const [thanosHP, setThanosHP] = useState(100);

  const thanos = useRef({
    x: 290,
    y: 100,
    radius: 26,
    vy: 1.2,
    shield: false,
    attackTimer: 0
  });

  const player = useRef({
    x: 60,
    y: 100,
    radius: 12
  });

  const attacks = useRef([]);
  const bossProjectiles = useRef([]);
  const particles = useRef([]);
  const gameCompleted = useRef(false);

  // Keep a ref of active hero for key handlers to access without trigger updates
  const heroRef = useRef('IronMan');
  const cdRef = useRef(0);
  heroRef.current = activeHero;
  cdRef.current = thorCooldown;

  // 1. Controls listener - attached EXACTLY ONCE on mount
  useEffect(() => {
    console.log('[DEBUG] AvengersBattleGame: Controls attached (once)');
    const handleKeyDown = (e) => {
      if (isPaused) return;
      if (e.code === 'Digit1') setActiveHero('IronMan');
      if (e.code === 'Digit2') setActiveHero('Cap');
      if (e.code === 'Digit3' && cdRef.current === 0) setActiveHero('Thor');
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      console.log('[DEBUG] AvengersBattleGame: Controls detached');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPaused]);

  // 2. Physics & Draw animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 200;

    thanos.current.x = canvas.width - 90;
    thanos.current.y = canvas.height / 2;
    player.current.y = canvas.height / 2;

    console.log('[DEBUG] AvengersBattleGame: Initializing physics loop');
    let frameId;

    const render = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawBackdrop(ctx, canvas);

      if (!isPaused && !gameCompleted.current) {
        updateGame(canvas);
      }

      // Draw Thanos
      ctx.save();
      const t = thanos.current;
      const pulsingGlow = 10 + Math.sin(Date.now() * 0.015) * 5;
      ctx.shadowBlur = pulsingGlow;
      ctx.shadowColor = '#7F5CFF';
      
      ctx.fillStyle = '#7F5CFF';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFD84A';
      ctx.beginPath();
      ctx.arc(t.x, t.y - 8, t.radius * 0.65, -Math.PI / 1.1, -Math.PI / 10);
      ctx.fill();

      ctx.fillStyle = '#E62429';
      ctx.beginPath();
      ctx.arc(t.x - 6, t.y - 4, 2, 0, Math.PI * 2);
      ctx.arc(t.x + 6, t.y - 4, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw Thanos projectiles
      ctx.save();
      ctx.fillStyle = '#7F5CFF';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#7F5CFF';
      bossProjectiles.current.forEach((proj) => {
        if (!proj.active) return;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // Draw Player attacks
      ctx.save();
      attacks.current.forEach((att) => {
        if (!att.active) return;
        
        if (att.type === 'laser') {
          ctx.strokeStyle = '#00F5FF';
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#00F5FF';
          ctx.lineWidth = att.alpha * 3;
          ctx.beginPath();
          ctx.moveTo(player.current.x, player.current.y);
          ctx.lineTo(att.tx, att.ty);
          ctx.stroke();
        } 
        else if (att.type === 'shield') {
          ctx.strokeStyle = '#E62429';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#E62429';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(att.x, att.y, 9, 0, Math.PI * 2);
          ctx.stroke();
        } 
        else if (att.type === 'lightning') {
          ctx.strokeStyle = '#F7FFFF';
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#00F5FF';
          ctx.lineWidth = att.alpha * 6;
          
          ctx.beginPath();
          ctx.moveTo(player.current.x, player.current.y);
          ctx.lineTo(att.mx, att.my);
          ctx.lineTo(att.tx, att.ty);
          ctx.stroke();
        }
      });
      ctx.restore();

      drawActiveHero(ctx);
      drawSparks(ctx);

      frameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      console.log('[DEBUG] AvengersBattleGame: Terminating loop');
      cancelAnimationFrame(frameId);
    };
  }, [isPaused, activeHero, thorCooldown, thanosHP]);

  const drawBackdrop = (ctx, canvas) => {
    ctx.fillStyle = '#05070B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.strokeStyle = 'rgba(127, 92, 255, 0.02)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawActiveHero = (ctx) => {
    const p = player.current;
    ctx.save();
    ctx.translate(p.x, p.y);

    if (activeHero === 'IronMan') {
      ctx.fillStyle = '#E62429';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#E62429';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFD84A';
      ctx.fillRect(-5, -5, 10, 10);
    } 
    else if (activeHero === 'Cap') {
      ctx.fillStyle = '#00F5FF';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00F5FF';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', 0, 3.5);
    } 
    else if (activeHero === 'Thor') {
      ctx.fillStyle = '#C0C0C0';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00F5FF';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#E62429';
      ctx.fillRect(-12, -4, 4, 8);
    }
    ctx.restore();
  };

  const updateGame = (canvas) => {
    const t = thanos.current;
    const p = player.current;

    t.y += t.vy;
    if (t.y - t.radius < 20 || t.y + t.radius > canvas.height - 20) {
      t.vy = -t.vy;
    }

    t.attackTimer += 16.6;
    if (t.attackTimer > 1500) {
      const angle = Math.atan2(p.y - t.y, p.x - t.x);
      bossProjectiles.current.push({
        x: t.x - 15,
        y: t.y,
        vx: Math.cos(angle) * 3.4,
        vy: Math.sin(angle) * 3.4,
        active: true
      });
      t.attackTimer = 0;
      soundSystem.playPortalSwoosh();
    }

    bossProjectiles.current.forEach((proj) => {
      if (!proj.active) return;
      proj.x += proj.vx;
      proj.y += proj.vy;

      const directDist = Math.hypot(p.x - proj.x, p.y - proj.y);
      if (directDist < p.radius + 6) {
        proj.active = false;
        triggerExplosion(p.x, p.y, '#7F5CFF');
        soundSystem.playClick();

        onHealthUpdate((prev) => {
          const next = Math.max(prev - 15, 0);
          if (next <= 0) {
            console.log('[DEBUG] AvengersBattleGame: Mission exited/lost (team defeated)');
            onLoss();
          }
          return next;
        });
      }
    });

    attacks.current.forEach((att) => {
      if (!att.active) return;

      if (att.type === 'laser') {
        att.alpha -= 0.15;
        if (att.alpha <= 0) att.active = false;
      } 
      else if (att.type === 'lightning') {
        att.alpha -= 0.08;
        if (att.alpha <= 0) att.active = false;
      } 
      else if (att.type === 'shield') {
        if (att.returning) {
          const dx = p.x - att.x;
          const dy = p.y - att.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 15) {
            att.active = false;
          } else {
            att.x += (dx / dist) * 7.5;
            att.y += (dy / dist) * 7.5;
          }
        } else {
          const dx = t.x - att.x;
          const dy = t.y - att.y;
          const dist = Math.hypot(dx, dy);
          if (dist < t.radius) {
            att.returning = true;
            triggerExplosion(t.x, t.y, '#E62429');
            soundSystem.playClick();
            
            damageThanos(8);
            t.vy = 0;
            setTimeout(() => { t.vy = Math.random() > 0.5 ? 1.2 : -1.2; }, 1500);
          } else {
            att.x += (dx / dist) * 7.5;
            att.y += (dy / dist) * 7.5;
          }
        }
      }
    });

    if (thorCooldown > 0) {
      setThorCooldown((prev) => Math.max(prev - 16.6, 0));
    }
  };

  const damageThanos = (amount) => {
    setThanosHP((prev) => {
      const next = Math.max(prev - amount, 0);
      onScoreUpdate(Math.round((100 - next) * 30));
      onComboUpdate(Math.floor((100 - next) / 10) + 1);
      
      if (next <= 0 && !gameCompleted.current) {
        triggerQTE();
      }
      return next;
    });
  };

  const handleShoot = () => {
    if (isPaused || gameCompleted.current) return;

    const p = player.current;
    const t = thanos.current;

    soundSystem.playTick();

    if (heroRef.current === 'IronMan') {
      attacks.current.push({
        type: 'laser',
        tx: t.x,
        ty: t.y,
        alpha: 1,
        active: true
      });
      triggerExplosion(t.x, t.y, '#00F5FF');
      damageThanos(3.2);
    } 
    else if (heroRef.current === 'Cap') {
      const shieldAtt = attacks.current.find(a => a.type === 'shield' && a.active);
      if (!shieldAtt) {
        attacks.current.push({
          type: 'shield',
          x: p.x,
          y: p.y,
          returning: false,
          active: true
        });
      }
    } 
    else if (heroRef.current === 'Thor' && cdRef.current === 0) {
      const midX = (p.x + t.x) / 2 + (Math.random() - 0.5) * 80;
      const midY = (p.y + t.y) / 2 + (Math.random() - 0.5) * 80;

      attacks.current.push({
        type: 'lightning',
        tx: t.x,
        ty: t.y,
        mx: midX,
        my: midY,
        alpha: 1,
        active: true
      });

      triggerExplosion(t.x, t.y, '#F7FFFF');
      soundSystem.playStoneSocket();
      damageThanos(18);

      setThorCooldown(3000);
      setActiveHero('IronMan');
    }
  };

  const triggerQTE = () => {
    gameCompleted.current = true;
    soundSystem.playSnap();

    setTimeout(() => {
      triggerExplosion(thanos.current.x, thanos.current.y, '#F7FFFF');
      triggerExplosion(thanos.current.x, thanos.current.y, '#00F5FF');
      triggerExplosion(thanos.current.x, thanos.current.y, '#7F5CFF');
      soundSystem.playSnap();

      console.log('[DEBUG] AvengersBattleGame: Mission completed');
      onWin(3000);
    }, 1200);
  };

  const triggerExplosion = (x, y, color) => {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 3,
        alpha: 1,
        color,
        decay: 0.04
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

  const selectHero = (e, hero) => {
    e.stopPropagation();
    if (hero === 'Thor' && thorCooldown > 0) return;
    setActiveHero(hero);
  };

  return (
    <div className="game-container" onClick={handleShoot} style={{ height: '100%' }}>
      {/* Hero Switching Panel */}
      <div style={{ display: 'flex', gap: '15px', width: '100%', justifyContent: 'center', marginBottom: '8px', zIndex: 5 }}>
        <button 
          className={`hud-btn ${activeHero === 'IronMan' ? 'gold' : ''}`} 
          style={{ padding: '4px 12px', fontSize: '0.8rem' }}
          onClick={(e) => selectHero(e, 'IronMan')}
        >
          [1] IRON MAN
        </button>
        <button 
          className={`hud-btn ${activeHero === 'Cap' ? 'gold' : ''}`} 
          style={{ padding: '4px 12px', fontSize: '0.8rem' }}
          onClick={(e) => selectHero(e, 'Cap')}
        >
          [2] CAP AMERICA
        </button>
        <button 
          className={`hud-btn ${activeHero === 'Thor' ? 'gold' : ''}`} 
          disabled={thorCooldown > 0}
          style={{ padding: '4px 12px', fontSize: '0.8rem', opacity: thorCooldown > 0 ? 0.3 : 1 }}
          onClick={(e) => selectHero(e, 'Thor')}
        >
          [3] THOR
        </button>
      </div>

      <canvas 
        ref={canvasRef} 
        className="game-canvas-element" 
        style={{ height: '150px' }}
      />
    </div>
  );
};

export default AvengersBattleGame;
