import React, { useEffect, useRef, useState } from 'react';
import soundSystem from '../utils/soundSystem';

const ShieldDashboard = ({ stones = {}, trophy = false, snapKey = false, onLaunchGame, onAwardSoulStone }) => {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [stability, setStability] = useState(72);
  const [powerLevel, setPowerLevel] = useState(1240500);
  const [fridayMsg, setFridayMsg] = useState('');

  // Settings states
  const [showSettings, setShowSettings] = useState(false);
  const [scanlines, setScanlines] = useState(true);
  const [particlesIntensity, setParticlesIntensity] = useState('medium');

  const stabilityCanvasRef = useRef(null);
  const requestRef = useRef(null);

  // Load settings on mount
  useEffect(() => {
    try {
      const savedScanlines = localStorage.getItem('garvverse_pref_scanlines');
      if (savedScanlines === 'disabled') {
        setScanlines(false);
        document.body.classList.add('scanlines-disabled');
      } else {
        setScanlines(true);
        document.body.classList.remove('scanlines-disabled');
      }

      const savedParticles = localStorage.getItem('garvverse_pref_particles');
      if (savedParticles) {
        setParticlesIntensity(savedParticles);
      }
    } catch (e) {}
  }, []);

  const toggleScanlinesSetting = () => {
    soundSystem.playClick();
    const nextVal = !scanlines;
    setScanlines(nextVal);
    try {
      localStorage.setItem('garvverse_pref_scanlines', nextVal ? 'enabled' : 'disabled');
      if (nextVal) {
        document.body.classList.remove('scanlines-disabled');
      } else {
        document.body.classList.add('scanlines-disabled');
      }
    } catch(e) {}
  };

  const handleParticleSetting = (e) => {
    soundSystem.playClick();
    const val = e.target.value;
    setParticlesIntensity(val);
    try {
      localStorage.setItem('garvverse_pref_particles', val);
    } catch(e) {}
  };

  const clearPreferences = () => {
    soundSystem.playClick();
    try {
      localStorage.removeItem('garvverse_pref_scanlines');
      localStorage.removeItem('garvverse_pref_particles');
      localStorage.removeItem('garvverse_pref_audio');
      
      setScanlines(true);
      document.body.classList.remove('scanlines-disabled');
      setParticlesIntensity('medium');
      alert('Preferences reset to default.');
    } catch(e) {}
  };

  // Load high scores locally for card badges
  const [highScores, setHighScores] = useState({
    Space: 0,
    Mind: 0,
    Reality: 0,
    Power: 0,
    Time: 0,
    Soul: 0,
    Legend: 0,
    Final: 0
  });

  useEffect(() => {
    try {
      const keys = ['Space', 'Mind', 'Reality', 'Power', 'Time', 'Soul', 'Legend', 'Final'];
      const scores = {};
      keys.forEach((key) => {
        scores[key] = Number(localStorage.getItem(`garvverse_highscore_${key}`)) || 0;
      });
      setHighScores(scores);
    } catch(e) {}
  }, [stones, trophy, snapKey]);

  // Birthday Countdown Timer
  useEffect(() => {
    const targetDate = new Date('2026-08-15T00:00:00').getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const stonesCollected = Object.values(stones).filter(Boolean).length;
  const isFinalUnlocked = stonesCollected === 6 && trophy;

  // Calculate Global Progress
  const totalMissions = 8;
  const completedMissions = stonesCollected + (trophy ? 1 : 0) + (snapKey ? 1 : 0);
  const globalProgressPercent = Math.round((completedMissions / totalMissions) * 100);

  useEffect(() => {
    const baseStability = 65;
    const nextStability = Math.min(baseStability + stonesCollected * 5 + (trophy ? 4 : 0) + (snapKey ? 1 : 0), 99.8);
    setStability(parseFloat(nextStability.toFixed(1)));

    const basePower = 1240500;
    const multiplier = Math.pow(3.5, stonesCollected) * (trophy ? 3 : 1) * (snapKey ? 5 : 1);
    setPowerLevel(basePower * multiplier);

    setFridayMsg('Agent Garv, command metrics online. Select any mission coordinates card below to review deployment diagnostics briefings.');
  }, [stones, trophy, snapKey]);

  // Draw Stability Wave Canvas
  useEffect(() => {
    const canvas = stabilityCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 60;

    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Grid lines
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      ctx.strokeStyle = '#00F5FF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const amplitude = 10 + (100 - stability) * 0.2;
      const frequency = 0.02 + (100 - stability) * 0.0004;

      for (let x = 0; x < canvas.width; x++) {
        const noise = Math.sin(x * 0.08 + phase * 2.5) * (100 - stability) * 0.06;
        const y = canvas.height / 2 + Math.sin(x * frequency + phase) * amplitude + noise;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      phase += 0.05;
      requestRef.current = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      canvas.width = canvas.parentElement.clientWidth;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [stability]);

  const formatPower = (num) => {
    return Math.round(num).toLocaleString();
  };

  const getProgressBlocks = (pct) => {
    const totalBlocks = 10;
    const filledBlocks = Math.round((pct / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
  };

  return (
    <div className="dashboard-grid">
      {/* Left Sidebar */}
      <div className="dashboard-sidebar-left">
        {/* Countdown */}
        <div className="hologram-panel scroll-parallax-section">
          <div className="hologram-scanlines" />
          <div className="hologram-corner-tr" />
          <div className="hologram-corner-bl" />
          <div className="hologram-corner-br" />

          <div className="hud-widget-title">BIRTHDAY COUNTDOWN</div>
          <div className="hud-widget-content">
            <div className="countdown-clock">
              <div className="countdown-segment">
                <div className="countdown-val">{countdown.days}</div>
                <div className="countdown-lbl">Days</div>
              </div>
              <div className="countdown-segment">
                <div className="countdown-val">{countdown.hours}</div>
                <div className="countdown-lbl">Hrs</div>
              </div>
              <div className="countdown-segment">
                <div className="countdown-val">{countdown.minutes}</div>
                <div className="countdown-lbl">Mins</div>
              </div>
              <div className="countdown-segment">
                <div className="countdown-val">{countdown.seconds}</div>
                <div className="countdown-lbl">Secs</div>
              </div>
            </div>
            <div style={{ marginTop: '15px', fontSize: '0.8rem', opacity: 0.6, textAlign: 'center', letterSpacing: '1px' }}>
              TARGET: AUG 15, 2026
            </div>
          </div>
        </div>

        {/* Stability */}
        <div className="hologram-panel scroll-parallax-section">
          <div className="hologram-scanlines" />
          <div className="hologram-corner-tr" />
          <div className="hologram-corner-bl" />
          <div className="hologram-corner-br" />

          <div className="hud-widget-title">MULTIVERSE STABILITY</div>
          <div className="hud-widget-content">
            <canvas ref={stabilityCanvasRef} className="stability-wave-canvas" />
            <div className="stability-metrics">
              <div>STABILITY COEF:</div>
              <div className="stability-val">{stability}%</div>
            </div>
            <div className="stability-metrics" style={{ marginTop: '5px' }}>
              <div>QUANTUM STATUS:</div>
              <div style={{ color: stability > 88 ? '#00FF66' : '#FFD84A' }}>
                {stability > 90 ? 'STABLE' : stability > 78 ? 'FLUCTUATING' : 'DANGER'}
              </div>
            </div>
          </div>
        </div>

        {/* Global Tracker */}
        <div className="hologram-panel scroll-parallax-section" style={{ borderColor: 'var(--stark-gold)' }}>
          <div className="hologram-scanlines" />
          <div className="hud-widget-title gold">MISSION TRACKER</div>
          <div className="hud-widget-content" style={{ fontFamily: 'var(--font-hud)', fontSize: '0.9rem' }}>
            <div style={{ fontSize: '1.1rem', letterSpacing: '1px', color: 'var(--stark-gold)', marginBottom: '8px' }}>
              Progress: {getProgressBlocks(globalProgressPercent)} {globalProgressPercent}%
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Completed Sims:</span>
              <span style={{ fontWeight: 700 }}>{completedMissions} / {totalMissions}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Infinity Stones:</span>
              <span style={{ color: '#00F5FF', fontWeight: 700 }}>{stonesCollected} / 6</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Bonus Trophies:</span>
              <span style={{ color: '#FFD84A', fontWeight: 700 }}>{trophy ? 1 : 0} / 1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Center Panel (Grid of 8 Games) */}
      <div className="dashboard-center-panel scroll-parallax-section" style={{ gap: '12px', position: 'relative' }}>
        <div className="garvverse-title-container" style={{ padding: '2px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 className="garvverse-title-h1" style={{ fontSize: '2.6rem', margin: 0 }}>
              GARV <span className="garvverse-title-glow-cyan">VERSE</span>
            </h1>
            <div className="garvverse-subtitle" style={{ fontSize: '0.85rem', letterSpacing: '3px' }}>SEC-616 COMMAND CENTER</div>
          </div>

          {/* Settings Button */}
          <button 
            className="hud-btn" 
            onClick={() => setShowSettings(true)}
            style={{ padding: '6px 14px', fontSize: '0.8rem', letterSpacing: '2px' }}
          >
            ⚙️ SETTINGS
          </button>
        </div>

        {/* Animated Arc Reactor Centerpiece */}
        <div 
          style={{ 
            width: '100%', 
            display: 'flex', 
            justifyContent: 'center', 
            padding: '10px 0', 
            borderBottom: '1px solid rgba(0, 245, 255, 0.15)',
            marginBottom: '10px'
          }}
        >
          <div 
            className="arc-reactor-centerpiece"
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: '4px solid #3a4f5f',
              boxShadow: '0 0 25px rgba(0, 245, 255, 0.6), inset 0 0 15px rgba(0, 245, 255, 0.4)',
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {/* Inner spin ring */}
            <div 
              style={{
                width: '60px',
                height: '60px',
                border: '3px dashed #00f5ff',
                borderRadius: '50%',
                animation: 'spin 8s linear infinite'
              }}
            />
            {/* Core blue dot */}
            <div 
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                boxShadow: '0 0 20px #00f5ff, 0 0 35px #00f5ff',
                position: 'absolute'
              }}
            />
          </div>
        </div>

        {/* The Arcade Grid */}
        <div className="arcade-container">
          <div className="arcade-hub-panel" style={{ gap: '12px' }}>
            <div className="arcade-games-menu" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridGap: '12px' }}>
              
              {/* Game 1: Spider-Man */}
              <div 
                className={`arcade-game-card ${stones['Space'] ? 'completed' : ''}`}
                style={{ '--stone-color': '#00F5FF', '--stone-rgb': '0, 245, 255', height: '135px', padding: '10px' }}
                onClick={() => onLaunchGame('Space')}
              >
                <div className="arcade-card-icon" style={{ fontSize: '1.7rem' }}>🕷️</div>
                <div className="arcade-card-name" style={{ fontSize: '0.85rem' }}>Spider-Man Swing</div>
                <div style={{ fontSize: '0.7rem', color: '#00F5FF', fontWeight: 700 }}>
                  {stones['Space'] ? `✅ COMPLETED [HI: ${highScores.Space}]` : '▶ AVAILABLE'}
                </div>
              </div>

              {/* Game 2: Iron Man */}
              <div 
                className={`arcade-game-card ${stones['Mind'] ? 'completed' : ''}`}
                style={{ '--stone-color': '#FFD84A', '--stone-rgb': '255, 216, 74', height: '135px', padding: '10px' }}
                onClick={() => onLaunchGame('Mind')}
              >
                <div className="arcade-card-icon" style={{ fontSize: '1.7rem' }}>⚡</div>
                <div className="arcade-card-name" style={{ fontSize: '0.85rem' }}>Iron Man Flight</div>
                <div style={{ fontSize: '0.7rem', color: '#FFD84A', fontWeight: 700 }}>
                  {stones['Mind'] ? `✅ COMPLETED [HI: ${highScores.Mind}]` : '▶ AVAILABLE'}
                </div>
              </div>

              {/* Game 3: Cap */}
              <div 
                className={`arcade-game-card ${stones['Reality'] ? 'completed' : ''}`}
                style={{ '--stone-color': '#E62429', '--stone-rgb': '230, 36, 41', height: '135px', padding: '10px' }}
                onClick={() => onLaunchGame('Reality')}
              >
                <div className="arcade-card-icon" style={{ fontSize: '1.7rem' }}>🛡️</div>
                <div className="arcade-card-name" style={{ fontSize: '0.85rem' }}>Cap Shield Combat</div>
                <div style={{ fontSize: '0.7rem', color: '#E62429', fontWeight: 700 }}>
                  {stones['Reality'] ? `✅ COMPLETED [HI: ${highScores.Reality}]` : '▶ AVAILABLE'}
                </div>
              </div>

              {/* Game 4: Stark Kart */}
              <div 
                className={`arcade-game-card ${stones['Power'] ? 'completed' : ''}`}
                style={{ '--stone-color': '#7F5CFF', '--stone-rgb': '127, 92, 255', height: '135px', padding: '10px' }}
                onClick={() => onLaunchGame('Power')}
              >
                <div className="arcade-card-icon" style={{ fontSize: '1.7rem' }}>🏎️</div>
                <div className="arcade-card-name" style={{ fontSize: '0.85rem' }}>Stark Kart</div>
                <div style={{ fontSize: '0.7rem', color: '#7F5CFF', fontWeight: 700 }}>
                  {stones['Power'] ? `✅ COMPLETED [HI: ${highScores.Power}]` : '▶ AVAILABLE'}
                </div>
              </div>

              {/* Game 5: Ghost Rider */}
              <div 
                className={`arcade-game-card ${stones['Time'] ? 'completed' : ''}`}
                style={{ '--stone-color': '#00FF66', '--stone-rgb': '0, 255, 102', height: '135px', padding: '10px' }}
                onClick={() => onLaunchGame('Time')}
              >
                <div className="arcade-card-icon" style={{ fontSize: '1.7rem' }}>🔥</div>
                <div className="arcade-card-name" style={{ fontSize: '0.85rem' }}>Ghost Rider</div>
                <div style={{ fontSize: '0.7rem', color: '#00FF66', fontWeight: 700 }}>
                  {stones['Time'] ? `✅ COMPLETED [HI: ${highScores.Time}]` : '▶ AVAILABLE'}
                </div>
              </div>

              {/* Game 6: Doctor Strange */}
              <div 
                className={`arcade-game-card ${stones['Soul'] ? 'completed' : ''}`}
                style={{ '--stone-color': '#FF9900', '--stone-rgb': '255, 153, 0', height: '135px', padding: '10px' }}
                onClick={() => onLaunchGame('Soul')}
              >
                <div className="arcade-card-icon" style={{ fontSize: '1.7rem' }}>🌀</div>
                <div className="arcade-card-name" style={{ fontSize: '0.85rem' }}>Portal Escape</div>
                <div style={{ fontSize: '0.7rem', color: '#FF9900', fontWeight: 700 }}>
                  {stones['Soul'] ? `✅ COMPLETED [HI: ${highScores.Soul}]` : '▶ AVAILABLE'}
                </div>
              </div>

              {/* Game 7: Ultron Survival */}
              <div 
                className={`arcade-game-card ${trophy ? 'completed' : ''}`}
                style={{ '--stone-color': '#FFD84A', '--stone-rgb': '255, 216, 74', height: '135px', padding: '10px' }}
                onClick={() => onLaunchGame('Legend')}
              >
                <div className="arcade-card-icon" style={{ fontSize: '1.7rem' }}>🤖</div>
                <div className="arcade-card-name" style={{ fontSize: '0.85rem' }}>Ultron Survival</div>
                <div style={{ fontSize: '0.7rem', color: '#FFD84A', fontWeight: 700 }}>
                  {trophy ? `✅ COMPLETED [HI: ${highScores.Legend}]` : '▶ AVAILABLE'}
                </div>
              </div>
            </div>

            {/* Game 8: Final Thanos Boss Battle */}
            <div style={{ width: '100%', marginTop: '5px' }}>
              <button 
                className={`hud-btn gold ${snapKey ? 'completed' : ''}`}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '1rem',
                  borderWidth: '2px',
                  borderColor: snapKey ? '#00FF66' : '#FFD84A',
                  color: snapKey ? '#00FF66' : '#FFD84A',
                  boxShadow: snapKey ? '0 0 20px rgba(0, 255, 102, 0.4)' : '0 0 20px rgba(255, 216, 74, 0.4)',
                  background: 'rgba(5, 7, 11, 0.85)'
                }}
                onClick={() => onLaunchGame('Final')}
              >
                {snapKey ? `✅ THANOS DEFEATED [HI: ${highScores.Final}]` : '⚔️ AVENGERS FINAL BATTLE'}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="dashboard-sidebar-right">
        {/* Power Profile */}
        <div className="hologram-panel gold scroll-parallax-section">
          <div className="hologram-scanlines" />
          <div className="hologram-corner-tr" />
          <div className="hologram-corner-bl" />
          <div className="hologram-corner-br" />

          <div className="hud-widget-title gold">GARV POWER PROFILE</div>
          <div className="hud-widget-content power-level-hud">
            <div className="power-level-header">
              <div>ENERGY INDEX:</div>
              <div className="power-level-val">{formatPower(powerLevel)} GW</div>
            </div>
            
            <div className="power-level-bar-bg">
              <div 
                className="power-level-bar-fill" 
                style={{ width: `${60 + stonesCollected * 5 + (trophy ? 5 : 0) + (snapKey ? 5 : 0)}%` }}
              />
            </div>

            <div className="power-stats">
              <div className="power-stat-item">
                <div className="power-stat-lbl">AVENGER CLASS</div>
                <div className="power-stat-val">SUPREME</div>
              </div>
              <div className="power-stat-item">
                <div className="power-stat-lbl">TIMELINE ACCESS</div>
                <div className="power-stat-val">FULL</div>
              </div>
              <div className="power-stat-item">
                <div className="power-stat-lbl">S.H.I.E.L.D SECURITY</div>
                <div className="power-stat-val">CLEARANCE 9</div>
              </div>
              <div className="power-stat-item">
                <div className="power-stat-lbl">MULTIVERSE SYNC</div>
                <div className="power-stat-val">ACTIVE</div>
              </div>
            </div>
          </div>
        </div>

        {/* Friday AI Assistant */}
        <div className="hologram-panel scroll-parallax-section">
          <div className="hologram-scanlines" />
          <div className="hologram-corner-tr" />
          <div className="hologram-corner-bl" />
          <div className="hologram-corner-br" />

          <div className="hud-widget-title">AI ASSISTANT // F.R.I.D.A.Y.</div>
          <div className="hud-widget-content friday-ai-container">
            <div className="friday-avatar">🤖</div>
            <div className="friday-dialog-bubble">{fridayMsg}</div>
          </div>
        </div>
      </div>

      {/* Settings Modal Dialog Overlay */}
      {showSettings && (
        <div 
          className="portal-modal-overlay" 
          style={{ zIndex: 1070, backgroundColor: 'rgba(5, 7, 11, 0.85)', backdropFilter: 'blur(6px)' }}
        >
          <div 
            style={{
              width: '90%',
              maxWidth: '400px',
              backgroundColor: '#05070b',
              border: '2px solid #00f5ff',
              borderRadius: '8px',
              boxShadow: '0 0 25px rgba(0, 245, 255, 0.25)',
              padding: '25px',
              color: '#fff',
              fontFamily: 'var(--font-hud)',
              position: 'relative'
            }}
          >
            <div className="hologram-scanlines" />

            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#00f5ff', letterSpacing: '3px', marginBottom: '15px' }}>
              SYSTEM PREFERENCES
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
              {/* Scanline toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>HOLOGRAM SCANLINES:</span>
                <button 
                  className={`hud-btn ${scanlines ? 'gold' : ''}`}
                  onClick={toggleScanlinesSetting}
                  style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                >
                  {scanlines ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              {/* Cursor particles */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>CURSOR PARTICLES:</span>
                <select 
                  value={particlesIntensity}
                  onChange={handleParticleSetting}
                  style={{
                    backgroundColor: '#05070b',
                    color: '#00f5ff',
                    border: '1px solid #00f5ff',
                    fontFamily: 'var(--font-hud)',
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}
                >
                  <option value="low">LOW</option>
                  <option value="medium">MEDIUM</option>
                  <option value="high">HIGH</option>
                </select>
              </div>

              {/* Clear preferences */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>FACTORY DEFAULTS:</span>
                <button 
                  className="hud-btn red" 
                  onClick={clearPreferences}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  RESET PREFS
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button className="hud-btn" onClick={() => setShowSettings(false)}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShieldDashboard;
