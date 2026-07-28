import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import soundSystem from '../utils/soundSystem';

const SnapEffect = ({ active, onEffectComplete }) => {
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) return;
    setVisible(true);

    // 1. Play massive snap audio
    soundSystem.playSnap();

    // 2. Query all panels to disintegrate
    const panels = document.querySelectorAll('.hologram-panel, .garvverse-title-container, .mute-hud-button');
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];

    // Create particles based on the bounding rects of the dashboard panels
    panels.forEach((panel) => {
      const rect = panel.getBoundingClientRect();
      const style = window.getComputedStyle(panel);
      const isGold = panel.classList.contains('gold');
      
      // Determine base colors for this panel's particles
      const primaryColor = isGold ? '#FFD84A' : '#00F5FF';
      const secondaryColor = '#05070B';

      // Hide the panel using GSAP filter/blur and fade
      gsap.to(panel, {
        opacity: 0,
        filter: 'blur(15px) contrast(0.5)',
        scale: 0.95,
        duration: 2.2,
        ease: 'power3.out'
      });

      // Spawn dust particles across the panel area
      const area = rect.width * rect.height;
      // Spawn density: 1 particle per 150 pixels to keep it high-fidelity but 60FPS
      const particleCount = Math.min(Math.round(area / 90), 800);

      for (let i = 0; i < particleCount; i++) {
        const px = rect.left + Math.random() * rect.width;
        const py = rect.top + Math.random() * rect.height;
        
        // Random drift direction (mostly right and slightly up/down)
        const angle = -Math.PI / 4 + (Math.random() - 0.5) * Math.PI / 3;
        const speed = 1.2 + Math.random() * 3.5;

        particles.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.5, // slight upward float
          size: 1 + Math.random() * 2.5,
          color: Math.random() > 0.35 ? primaryColor : secondaryColor,
          alpha: 1,
          decay: 0.006 + Math.random() * 0.008,
          wobbleSpeed: 0.05 + Math.random() * 0.1,
          wobbleFactor: 0.2 + Math.random() * 0.4
        });
      }
    });

    // Animate the dust blowing away
    let frameId;
    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.05;

      let activeParticles = 0;

      particles.forEach((p) => {
        if (p.alpha <= 0) return;

        activeParticles++;

        // Update positions with turbulence/wind
        p.x += p.vx + Math.sin(time + p.x * 0.01) * p.wobbleFactor;
        p.y += p.vy + Math.cos(time + p.y * 0.01) * p.wobbleFactor;
        
        // Apply wind force pushing right
        p.vx += 0.02; 
        
        p.alpha -= p.decay;

        ctx.save();
        ctx.globalAlpha = Math.max(p.alpha, 0);
        ctx.fillStyle = p.color;
        
        // Glow effect for neon dust
        if (p.color !== '#05070B') {
          ctx.shadowBlur = 4;
          ctx.shadowColor = p.color;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Slowly fade screen to black overlay
      const blackOverlay = document.querySelector('.snap-blackout-overlay');
      if (blackOverlay) {
        const progress = Math.min(time * 0.15, 1);
        blackOverlay.style.opacity = progress;
      }

      if (activeParticles > 0 && time < 10) {
        frameId = requestAnimationFrame(animate);
      } else {
        cancelAnimationFrame(frameId);
        // Delay a second in complete blackness with heartbeat, then advance
        setTimeout(() => {
          setVisible(false);
          onEffectComplete();
        }, 1600);
      }
    };

    // Delay particle simulation slightly to sync with the initial "Snap" impact frame
    setTimeout(() => {
      animate();
    }, 100);

    return () => cancelAnimationFrame(frameId);
  }, [active]);

  if (!visible) return null;

  return (
    <div 
      className="snap-container"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1500,
        pointerEvents: 'none'
      }}
    >
      {/* Absolute black overlay that slowly fades in during disintegration */}
      <div 
        className="snap-blackout-overlay"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#05070B',
          opacity: 0,
          zIndex: 1,
          transition: 'opacity 3.5s ease-out'
        }}
      />

      <canvas 
        ref={canvasRef} 
        className="snap-shredder-canvas"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 2,
          display: 'block'
        }}
      />
    </div>
  );
};

export default SnapEffect;
