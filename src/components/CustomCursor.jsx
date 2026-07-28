import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const CustomCursor = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const requestRef = useRef(null);
  const trailCanvasRef = useRef(null);

  const [hovered, setHovered] = useState(false);
  const mouse = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });
  
  const particles = useRef([]);
  const canvasCtx = useRef(null);

  useEffect(() => {
    console.log('[DEBUG] CustomCursor: Initializing system and attaching window listeners');
    document.body.classList.add('custom-cursor-active');

    let activeTarget = null;

    const handleMouseMove = (e) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      
      // Instantly position the inner dot
      if (dotRef.current) {
        dotRef.current.style.left = `${e.clientX}px`;
        dotRef.current.style.top = `${e.clientY}px`;
      }

      // Event Delegation: Check if mouse is over an interactive element
      const target = e.target.closest(
        'button, a, .arcade-game-card, .memory-card-3d, input, select, textarea, [data-cursor="magnetic"], .hud-btn'
      );

      if (target) {
        if (activeTarget !== target) {
          activeTarget = target;
          setHovered(true);
          
          console.log('[DEBUG] CustomCursor: Target hovered - playing tick and applying scale/glow');
          
          import('../utils/soundSystem').then(({ default: soundSystem }) => {
            soundSystem.playTick();
          });
          
          // Animate button: lift and scale slightly
          gsap.to(target, {
            y: -3,
            scale: 1.04,
            duration: 0.2,
            overwrite: 'auto'
          });
        }

        // Apply a subtle 3D tilt (rotateX, rotateY) to target based on cursor position relative to center
        const rect = target.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;

        // Subtle 3D tilt (rotateX, rotateY) instead of translation (prevents hover jitter and click drops!)
        gsap.to(target, {
          rotateX: -dy * 0.08,
          rotateY: dx * 0.08,
          duration: 0.15,
          overwrite: 'auto'
        });
      } else {
        if (activeTarget) {
          const prevTarget = activeTarget;
          activeTarget = null;
          setHovered(false);
          
          console.log('[DEBUG] CustomCursor: Target unhovered - resetting transforms');
          
          gsap.to(prevTarget, {
            x: 0,
            y: 0,
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            duration: 0.25,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        }
      }
    };

    const handleMouseDown = () => {
      createClickExplosion(mouse.current.x, mouse.current.y);
      gsap.to(dotRef.current, { scale: 0.6, duration: 0.08 });
      gsap.to(ringRef.current, { scale: 0.75, duration: 0.08 });
    };

    const handleMouseUp = () => {
      gsap.to(dotRef.current, { scale: 1, duration: 0.1 });
      gsap.to(ringRef.current, { scale: 1, duration: 0.1 });
    };

    // Attach exactly one set of window event listeners
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    console.log('[DEBUG] CustomCursor: Global window mouse listeners attached successfully');

    // Canvas setup
    const canvas = trailCanvasRef.current;
    let ctx = null;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx = canvas.getContext('2d');
      canvasCtx.current = ctx;
    }

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    // Tick loop for responsive outer ring tracking
    const tick = () => {
      if (activeTarget) {
        // Snap to center of active interactive element
        const rect = activeTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        ringPos.current.x += (centerX - ringPos.current.x) * 0.38;
        ringPos.current.y += (centerY - ringPos.current.y) * 0.38;
      } else {
        // Follow mouse
        ringPos.current.x += (mouse.current.x - ringPos.current.x) * 0.38;
        ringPos.current.y += (mouse.current.y - ringPos.current.y) * 0.38;
      }

      if (ringRef.current) {
        ringRef.current.style.left = `${ringPos.current.x}px`;
        ringRef.current.style.top = `${ringPos.current.y}px`;
        
        // Stretch based on speed (only if not snapped to element)
        if (!activeTarget) {
          const vx = mouse.current.x - ringPos.current.x;
          const vy = mouse.current.y - ringPos.current.y;
          const speed = Math.sqrt(vx * vx + vy * vy);
          const stretch = Math.min(speed * 0.01, 0.18);
          const angle = Math.atan2(vy, vx) * (180 / Math.PI);
          ringRef.current.style.transform = `translate(-50%, -50%) rotate(${angle}deg) scaleX(${1 + stretch}) scaleY(${1 - stretch})`;
        } else {
          // If snapped, no rotation or stretch, just uniform scale
          ringRef.current.style.transform = `translate(-50%, -50%) scale(1.15)`;
        }
      }

      drawParticles();
      requestRef.current = requestAnimationFrame(tick);
    };
    requestRef.current = requestAnimationFrame(tick);

    return () => {
      console.log('[DEBUG] CustomCursor: Dismantling system and disposing event listeners');
      document.body.classList.remove('custom-cursor-active');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
      
      if (activeTarget) {
        gsap.killTweensOf(activeTarget);
      }
    };
  }, []);

  const createClickExplosion = (x, y) => {
    const color = hovered ? '#FFD84A' : '#00F5FF';
    
    let count = 18;
    try {
      const pref = localStorage.getItem('garvverse_pref_particles');
      if (pref === 'low') count = 6;
      else if (pref === 'high') count = 35;
    } catch (e) {}

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 3.5,
        alpha: 1,
        color,
        decay: 0.035 + Math.random() * 0.02,
      });
    }
  };

  const drawParticles = () => {
    const ctx = canvasCtx.current;
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
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
    <div className="custom-cursor-container">
      <canvas ref={trailCanvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }} />
      <div 
        ref={ringRef} 
        className={`custom-cursor-ring ${hovered ? 'hovered' : ''}`} 
        style={{ zIndex: 2, pointerEvents: 'none' }}
      />
      <div 
        ref={dotRef} 
        className={`custom-cursor-dot ${hovered ? 'hovered' : ''}`} 
        style={{ zIndex: 3, pointerEvents: 'none' }}
      />
    </div>
  );
};

export default CustomCursor;
