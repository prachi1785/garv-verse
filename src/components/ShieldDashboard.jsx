import React, { useEffect, useRef, useState } from 'react';
import soundSystem from '../utils/soundSystem';

const ShieldDashboard = ({ stones = {}, trophy = false, snapKey = false, onLaunchGame, onAwardSoulStone }) => {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [powerLevel, setPowerLevel] = useState(1240500);
  const [fridayMsg, setFridayMsg] = useState('Welcome back, Agent Garv. Directives visualizer online.');

  // Interactive centerpiece States
  const [reactorSpeed, setReactorSpeed] = useState(1);
  const [reactorHovered, setReactorHovered] = useState(false);
  const [triggerPulse, setTriggerPulse] = useState(false);

  // Settings states
  const [showSettings, setShowSettings] = useState(false);
  const [scanlines, setScanlines] = useState(true);
  const [particlesIntensity, setParticlesIntensity] = useState('medium');

  // Earth Globe Canvas
  const earthCanvasRef = useRef(null);
  const earthRequestRef = useRef(null);

  // Centerpiece Sparks Canvas
  const sparkCanvasRef = useRef(null);
  const sparkRequestRef = useRef(null);
  const sparkParticles = useRef([]);

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

  // High Scores and Achievements Loading
  const [highScores, setHighScores] = useState({
    Space: 0, Mind: 0, Reality: 0, Power: 0, Time: 0, Soul: 0, Legend: 0, Final: 0
  });
  const [bestRanks, setBestRanks] = useState({
    Space: 'N/A', Mind: 'N/A', Reality: 'N/A', Power: 'N/A', Time: 'N/A', Soul: 'N/A', Legend: 'N/A', Final: 'N/A'
  });
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    try {
      const keys = ['Space', 'Mind', 'Reality', 'Power', 'Time', 'Soul', 'Legend', 'Final'];
      const scores = {};
      const ranks = {};
      
      keys.forEach((key) => {
        scores[key] = Number(localStorage.getItem(`garvverse_highscore_${key}`)) || 0;
        
        // Calculate dynamic rank for scoreboard display
        const scoreVal = scores[key];
        let bestR = 'N/A';
        if (scoreVal >= 1500) bestR = 'S+';
        else if (scoreVal >= 1200) bestR = 'S';
        else if (scoreVal >= 800) bestR = 'A';
        else if (scoreVal >= 500) bestR = 'B';
        else if (scoreVal > 0) bestR = 'C';
        ranks[key] = bestR;
      });

      setHighScores(scores);
      setBestRanks(ranks);

      // Load Achievements list from Mission 01
      const savedAchievements = localStorage.getItem('garvverse_achievements_Space');
      if (savedAchievements) {
        setAchievements(JSON.parse(savedAchievements));
      }
    } catch(e) {}
  }, [stones, trophy, snapKey]);

  // Aggregate Total Scores
  const totalScore = Object.values(highScores).reduce((a, b) => a + b, 0);

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

  // Upgrade power values
  useEffect(() => {
    const basePower = 1240500;
    const multiplier = Math.pow(3.5, stonesCollected) * (trophy ? 3 : 1) * (snapKey ? 5 : 1);
    setPowerLevel(basePower * multiplier);

    if (stones['Space']) {
      setFridayMsg('System online. Space Stone coordinates locked. Spatial compression ratios optimal.');
    }
  }, [stones, trophy, snapKey]);

  // --- 🌐 1. Holographic Earth Rotating Wireframe Globe Canvas ---
  useEffect(() => {
    const canvas = earthCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 100;

    let rotationAngle = 0;

    // Mission marker coordinates: [latitude, longitude, active/locked, name]
    const markers = [
      { lat: 40.7128, lon: -74.0060, active: stones['Space'], name: 'New York (Space)' },
      { lat: 48.8566, lon: 2.3522, active: snapKey, name: 'Sokovia (Final)' },
      { lat: -10.5, lon: 120.5, active: stones['Soul'], name: 'Vormir (Soul)' }
    ];

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r = 38; // Sphere radius

      // Draw Earth grid rings
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.08)';
      ctx.lineWidth = 1;
      
      // Horizontal latitude circles
      for (let lat = -Math.PI / 2; lat <= Math.PI / 2; lat += Math.PI / 6) {
        const radiusLat = r * Math.cos(lat);
        const yOffset = r * Math.sin(lat);
        
        ctx.beginPath();
        ctx.ellipse(cx, cy + yOffset, radiusLat, radiusLat * 0.16, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Vertical longitude circles
      for (let lon = 0; lon < Math.PI; lon += Math.PI / 6) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * Math.sin(lon + rotationAngle), r, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Sphere boundary outline
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.25)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Render rotating mission markers
      ctx.save();
      markers.forEach((m) => {
        // Convert Lat/Lon to 3D Cartesian coordinates
        const latRad = (m.lat * Math.PI) / 180;
        const lonRad = (m.lon * Math.PI) / 180 + rotationAngle;

        // X and Z coordinates rotate on the Y-axis
        const x3d = r * Math.cos(latRad) * Math.sin(lonRad);
        const z3d = r * Math.cos(latRad) * Math.cos(lonRad);
        const y3d = -r * Math.sin(latRad);

        // Z-Depth Test: Render markers only on the front hemisphere (facing camera)
        if (z3d > 0) {
          const markerX = cx + x3d;
          const markerY = cy + y3d;
          const markerColor = m.active ? '#00FF66' : '#E62429';

          ctx.shadowBlur = 8;
          ctx.shadowColor = markerColor;
          ctx.fillStyle = markerColor;
          ctx.beginPath();
          ctx.arc(markerX, markerY, 3, 0, Math.PI * 2);
          ctx.fill();

          // Marker name tags
          ctx.fillStyle = '#fff';
          ctx.font = '7px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(m.name.split(' ')[0], markerX, markerY - 5);
        }
      });
      ctx.restore();

      rotationAngle += 0.007; // rotate speed
      earthRequestRef.current = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      canvas.width = canvas.parentElement.clientWidth;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(earthRequestRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [stones, snapKey]);


  // --- ⚛️ 2. Interactive Arc Reactor Spark Canvas ---
  useEffect(() => {
    const canvas = sparkCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 120;
    canvas.height = 120;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (reactorHovered) {
        // Spawn sparks
        if (Math.random() < 0.3) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 30 + Math.random() * 8;
          sparkParticles.current.push({
            x: canvas.width / 2 + Math.cos(angle) * dist,
            y: canvas.height / 2 + Math.sin(angle) * dist,
            vx: Math.cos(angle) * (1.2 + Math.random() * 2),
            vy: Math.sin(angle) * (1.2 + Math.random() * 2),
            size: 1 + Math.random() * 1.5,
            alpha: 1,
            decay: 0.05
          });
        }
      }

      // Draw sparks
      for (let i = sparkParticles.current.length - 1; i >= 0; i--) {
        const p = sparkParticles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          sparkParticles.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#00F5FF';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#00F5FF';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      sparkRequestRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(sparkRequestRef.current);
    };
  }, [reactorHovered]);

  const handleReactorClick = () => {
    soundSystem.playSnap();
    setTriggerPulse(true);

    // Zoom grid panel
    const centerPanel = document.querySelector('.dashboard-center-panel');
    if (centerPanel) {
      centerPanel.style.transform = 'scale(1.035)';
      setTimeout(() => {
        centerPanel.style.transform = 'none';
      }, 350);
    }

    setTimeout(() => {
      setTriggerPulse(false);
    }, 1200);
  };

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
    <div className={`dashboard-grid ${triggerPulse ? 'shake-grid' : ''}`} style={{ transition: 'transform 0.3s' }}>
      
      {/* Dynamic fullscreen energy ripple overlay when Reactor clicked */}
      {triggerPulse && (
        <div 
          className="reactor-energy-ripple"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            border: '6px solid #00f5ff',
            boxShadow: '0 0 45px #00f5ff, inset 0 0 30px #00f5ff',
            zIndex: 999,
            pointerEvents: 'none',
            animation: 'expandRipple 1.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards'
          }}
        />
      )}

      {/* Left Sidebar */}
      <div className="dashboard-sidebar-left">
        
        {/* 1. S.H.I.E.L.D Agent Profile Panel */}
        <div className="hologram-panel scroll-parallax-section" style={{ borderColor: 'var(--stark-gold)' }}>
          <div className="hologram-scanlines" />
          <div className="hologram-corner-tr" />
          <div className="hologram-corner-bl" />
          <div className="hologram-corner-br" />

          <div className="hud-widget-title gold">🛡️ AGENT PROFILE</div>
          <div className="hud-widget-content" style={{ fontFamily: 'var(--font-hud)', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
              <div 
                style={{
                  width: '45px',
                  height: '45px',
                  borderRadius: '4px',
                  border: '1.5px solid #FFD84A',
                  boxShadow: '0 0 10px rgba(255, 216, 74, 0.3)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: '1.5rem',
                  backgroundColor: 'rgba(5, 7, 11, 0.85)'
                }}
              >
                👤
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFD84A' }}>AGENT GARV</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.5, letterSpacing: '2px' }}>CLEARANCE LEVEL 9</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '3px' }}>
                <span>MISSION SCORE:</span>
                <span style={{ color: '#00F5FF', fontWeight: 700 }}>{totalScore.toLocaleString()} pts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '3px' }}>
                <span>HQ RANK:</span>
                <span style={{ color: '#00FF66', fontWeight: 700 }}>SUPREME</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>DEPLOYS:</span>
                <span>{completedMissions} missions</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Holographic Earth Rotating Globe */}
        <div className="hologram-panel scroll-parallax-section">
          <div className="hologram-scanlines" />
          <div className="hologram-corner-tr" />
          <div className="hologram-corner-bl" />
          <div className="hologram-corner-br" />

          <div className="hud-widget-title">🌐 HOLOGRAPHIC EARTH</div>
          <div className="hud-widget-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <canvas ref={earthCanvasRef} style={{ width: '100%', height: '100px', display: 'block' }} />
            <div style={{ fontSize: '0.65rem', opacity: 0.5, letterSpacing: '2px', marginTop: '5px', textAlign: 'center' }}>
              ACTIVE MISSION GEOLOCATIONS PINNED
            </div>
          </div>
        </div>

        {/* Global Progress Tracker */}
        <div className="hologram-panel scroll-parallax-section">
          <div className="hologram-scanlines" />
          <div className="hud-widget-title">MISSION TRACKER</div>
          <div className="hud-widget-content" style={{ fontFamily: 'var(--font-hud)', fontSize: '0.9rem' }}>
            <div style={{ fontSize: '1.1rem', letterSpacing: '1px', color: '#00F5FF', marginBottom: '8px' }}>
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

          <button 
            className="hud-btn" 
            onClick={() => setShowSettings(true)}
            style={{ padding: '6px 14px', fontSize: '0.8rem', letterSpacing: '2px' }}
          >
            ⚙️ SETTINGS
          </button>
        </div>

        {/* --- ⚛️ 3. Premium Interactive Arc Reactor centerpiece --- */}
        <div 
          style={{ 
            width: '100%', 
            display: 'flex', 
            justifyContent: 'center', 
            padding: '10px 0', 
            borderBottom: '1px solid rgba(0, 245, 255, 0.15)',
            marginBottom: '10px',
            position: 'relative'
          }}
        >
          <div 
            className={`arc-reactor-centerpiece ${reactorHovered ? 'hovered' : ''}`}
            onClick={handleReactorClick}
            onMouseEnter={() => { setReactorHovered(true); setReactorSpeed(2.8); soundSystem.playTick(); }}
            onMouseLeave={() => { setReactorHovered(false); setReactorSpeed(1.0); }}
            style={{
              width: '95px',
              height: '95px',
              borderRadius: '50%',
              border: `4px solid ${reactorHovered ? '#00f5ff' : '#3a4f5f'}`,
              boxShadow: reactorHovered 
                ? '0 0 30px #00f5ff, inset 0 0 20px #00f5ff' 
                : '0 0 20px rgba(0, 245, 255, 0.4), inset 0 0 12px rgba(0, 245, 255, 0.3)',
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
            }}
          >
            {/* Inner dynamic sparks canvas */}
            <canvas 
              ref={sparkCanvasRef} 
              style={{ 
                position: 'absolute', 
                top: '-12px', 
                left: '-12px', 
                pointerEvents: 'none', 
                width: '120px', 
                height: '120px', 
                zIndex: 6 
              }} 
            />

            {/* Inner spin ring */}
            <div 
              style={{
                width: '70px',
                height: '70px',
                border: '3px dashed #00f5ff',
                borderRadius: '50%',
                animation: `spin ${7 / reactorSpeed}s linear infinite`
              }}
            />
            {/* Core blue dot */}
            <div 
              style={{
                width: '28px',
                height: '28px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                boxShadow: '0 0 25px #00f5ff, 0 0 40px #00f5ff',
                position: 'absolute',
                zIndex: 5
              }}
            />
          </div>
        </div>

        {/* The Live Mission Console panels (Replaces static cards) */}
        <div className="arcade-container">
          <div className="arcade-hub-panel" style={{ gap: '12px' }}>
            <div className="arcade-games-menu" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridGap: '12px' }}>
              
              {/* Card 1: Spider-Man */}
              <div 
                className={`arcade-game-card ${stones['Space'] ? 'completed' : ''}`}
                style={{ '--stone-color': '#00F5FF', '--stone-rgb': '0, 245, 255', height: '145px', padding: '12px' }}
                onClick={() => onLaunchGame('Space')}
                onMouseEnter={() => soundSystem.playTick()}
              >
                <div className="arcade-card-icon" style={{ fontSize: '1.7rem' }}>🕷️</div>
                <div className="arcade-card-name" style={{ fontSize: '0.88rem', fontWeight: 900 }}>Spider Web Swing</div>
                
                <div style={{ fontSize: '0.68rem', opacity: 0.7, color: '#00F5FF', fontFamily: 'monospace' }}>
                  {stones['Space'] ? `✅ CLOSED // BEST: ${bestRanks.Space}` : '▶ DIAGNOSTICS ACTIVE'}
                </div>
                <div style={{ fontSize: '0.62rem', opacity: 0.5, textTransform: 'uppercase' }}>Difficulty: ★★★★☆</div>
              </div>

              {/* Card 2: Iron Man */}
              <div 
                className={`arcade-game-card ${stones['Mind'] ? 'completed' : ''}`}
                style={{ '--stone-color': '#FFD84A', '--stone-rgb': '255, 216, 74', height: '145px', padding: '12px' }}
                onClick={() => onLaunchGame('Mind')}
                onMouseEnter={() => soundSystem.playTick()}
              >
                <div className="arcade-card-icon" style={{ fontSize: '1.7rem' }}>⚡</div>
                <div className="arcade-card-name" style={{ fontSize: '0.88rem', fontWeight: 900 }}>Iron Man Flight</div>
                
                <div style={{ fontSize: '0.68rem', opacity: 0.7, color: '#FFD84A', fontFamily: 'monospace' }}>
                  {stones['Mind'] ? `✅ CLOSED // BEST: ${bestRanks.Mind}` : '▶ STAND BY'}
                </div>
                <div style={{ fontSize: '0.62rem', opacity: 0.5, textTransform: 'uppercase' }}>Difficulty: ★★★☆☆</div>
              </div>

              {/* Card 3: Cap */}
              <div 
                className={`arcade-game-card ${stones['Reality'] ? 'completed' : ''}`}
                style={{ '--stone-color': '#E62429', '--stone-rgb': '230, 36, 41', height: '145px', padding: '12px' }}
                onClick={() => onLaunchGame('Reality')}
                onMouseEnter={() => soundSystem.playTick()}
              >
                <div className="arcade-card-icon" style={{ fontSize: '1.7rem' }}>🛡️</div>
                <div className="arcade-card-name" style={{ fontSize: '0.88rem', fontWeight: 900 }}>Cap Shield Combat</div>
                
                <div style={{ fontSize: '0.68rem', opacity: 0.7, color: '#E62429', fontFamily: 'monospace' }}>
                  {stones['Reality'] ? `✅ CLOSED // BEST: ${bestRanks.Reality}` : '▶ STAND BY'}
                </div>
                <div style={{ fontSize: '0.62rem', opacity: 0.5, textTransform: 'uppercase' }}>Difficulty: ★★★★☆</div>
              </div>

              {/* Card 4: Stark Kart */}
              <div 
                className={`arcade-game-card ${stones['Power'] ? 'completed' : ''}`}
                style={{ '--stone-color': '#7F5CFF', '--stone-rgb': '127, 92, 255', height: '145px', padding: '12px' }}
                onClick={() => onLaunchGame('Power')}
                onMouseEnter={() => soundSystem.playTick()}
              >
                <div className="arcade-card-icon" style={{ fontSize: '1.7rem' }}>🏎️</div>
                <div className="arcade-card-name" style={{ fontSize: '0.88rem', fontWeight: 900 }}>Stark Kart</div>
                
                <div style={{ fontSize: '0.68rem', opacity: 0.7, color: '#7F5CFF', fontFamily: 'monospace' }}>
                  {stones['Power'] ? `✅ CLOSED // BEST: ${bestRanks.Power}` : '▶ STAND BY'}
                </div>
                <div style={{ fontSize: '0.62rem', opacity: 0.5, textTransform: 'uppercase' }}>Difficulty: ★★★☆☆</div>
              </div>

              {/* Card 5: Ghost Rider */}
              <div 
                className={`arcade-game-card ${stones['Time'] ? 'completed' : ''}`}
                style={{ '--stone-color': '#00FF66', '--stone-rgb': '0, 255, 102', height: '145px', padding: '12px' }}
                onClick={() => onLaunchGame('Time')}
                onMouseEnter={() => soundSystem.playTick()}
              >
                <div className="arcade-card-icon" style={{ fontSize: '1.7rem' }}>🔥</div>
                <div className="arcade-card-name" style={{ fontSize: '0.88rem', fontWeight: 900 }}>Ghost Rider</div>
                
                <div style={{ fontSize: '0.68rem', opacity: 0.7, color: '#00FF66', fontFamily: 'monospace' }}>
                  {stones['Time'] ? `✅ CLOSED // BEST: ${bestRanks.Time}` : '▶ STAND BY'}
                </div>
                <div style={{ fontSize: '0.62rem', opacity: 0.5, textTransform: 'uppercase' }}>Difficulty: ★★★★★</div>
              </div>

              {/* Card 6: Doctor Strange */}
              <div 
                className={`arcade-game-card ${stones['Soul'] ? 'completed' : ''}`}
                style={{ '--stone-color': '#FF9900', '--stone-rgb': '255, 153, 0', height: '145px', padding: '12px' }}
                onClick={() => onLaunchGame('Soul')}
                onMouseEnter={() => soundSystem.playTick()}
              >
                <div className="arcade-card-icon" style={{ fontSize: '1.7rem' }}>🌀</div>
                <div className="arcade-card-name" style={{ fontSize: '0.88rem', fontWeight: 900 }}>Portal Escape</div>
                
                <div style={{ fontSize: '0.68rem', opacity: 0.7, color: '#FF9900', fontFamily: 'monospace' }}>
                  {stones['Soul'] ? `✅ CLOSED // BEST: ${bestRanks.Soul}` : '▶ STAND BY'}
                </div>
                <div style={{ fontSize: '0.62rem', opacity: 0.5, textTransform: 'uppercase' }}>Difficulty: ★★★★★</div>
              </div>

              {/* Card 7: Ultron Survival */}
              <div 
                className={`arcade-game-card ${trophy ? 'completed' : ''}`}
                style={{ '--stone-color': '#FFD84A', '--stone-rgb': '255, 216, 74', height: '145px', padding: '12px' }}
                onClick={() => onLaunchGame('Legend')}
                onMouseEnter={() => soundSystem.playTick()}
              >
                <div className="arcade-card-icon" style={{ fontSize: '1.7rem' }}>🤖</div>
                <div className="arcade-card-name" style={{ fontSize: '0.88rem', fontWeight: 900 }}>Ultron Survival</div>
                
                <div style={{ fontSize: '0.68rem', opacity: 0.7, color: '#FFD84A', fontFamily: 'monospace' }}>
                  {trophy ? `✅ CLOSED // BEST: ${bestRanks.Legend}` : '▶ STAND BY'}
                </div>
                <div style={{ fontSize: '0.62rem', opacity: 0.5, textTransform: 'uppercase' }}>Difficulty: ★★★★★</div>
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
                onMouseEnter={() => soundSystem.playTick()}
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

        {/* 3. S.H.I.E.L.D. Achievement Gallery Panel */}
        <div className="hologram-panel scroll-parallax-section">
          <div className="hologram-scanlines" />
          <div className="hologram-corner-tr" />
          <div className="hologram-corner-bl" />
          <div className="hologram-corner-br" />

          <div className="hud-widget-title">🏆 ACHIEVEMENT GALLERY</div>
          <div className="hud-widget-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {['Untouchable', 'Perfect Swing', 'Speed Demon', 'Friendly Neighborhood'].map((name) => {
              const unlocked = achievements.includes(name);
              return (
                <div 
                  key={name}
                  style={{
                    border: unlocked ? '1.5px solid #FFD84A' : '1px dashed rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    padding: '6px',
                    textAlign: 'center',
                    fontSize: '0.7rem',
                    backgroundColor: unlocked ? 'rgba(255, 216, 74, 0.1)' : 'transparent',
                    boxShadow: unlocked ? '0 0 10px rgba(255, 216, 74, 0.2)' : 'none',
                    color: unlocked ? '#FFD84A' : 'rgba(255, 255, 255, 0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                  title={unlocked ? 'Achievement Unlocked!' : 'Locked SIM parameters.'}
                >
                  <div>{unlocked ? '🏆' : '🔒'}</div>
                  <div style={{ fontSize: '0.62rem', marginTop: '2px', fontWeight: unlocked ? 900 : 400 }}>{name}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* F.R.I.D.A.Y. Holographic Dialogue widget */}
        <div className="hologram-panel scroll-parallax-section">
          <div className="hologram-scanlines" />
          <div className="hologram-corner-tr" />
          <div className="hologram-corner-bl" />
          <div className="hologram-corner-br" />

          <div className="hud-widget-title">AI ASSISTANT // F.R.I.D.A.Y.</div>
          <div className="hud-widget-content friday-ai-container" style={{ position: 'relative' }}>
            <div className="friday-avatar" style={{ animation: 'pulseGlow 2s infinite alternate' }}>🤖</div>
            <div className="friday-dialog-bubble">{fridayMsg}</div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
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
