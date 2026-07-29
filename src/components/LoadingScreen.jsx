import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import soundSystem from '../utils/soundSystem';

const LoadingScreen = ({ onEnter }) => {
  // Stages: black -> friday_online -> diagnostics -> earth_locate -> birthday_protocol -> arc_charging -> portal_open -> portal_zoom -> done
  const [stage, setStage] = useState('black');
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [loadingTip, setLoadingTip] = useState('');
  const progressInterval = useRef(null);

  const tips = [
    "S.H.I.E.L.D. Tip: Collecting consecutive Spider Tokens in Mission 01 raises combo multipliers and boosts final evaluation ranks.",
    "S.H.I.E.L.D. Tip: Click the centerpiece Arc Reactor on the dashboard to trigger system energy pulses and diagnostic panel shakes.",
    "S.H.I.E.L.D. Tip: Complete simulations with 100% health to secure the legendary 'Untouchable' S.H.I.E.L.D. simulator badge.",
    "S.H.I.E.L.D. Tip: Tuning simulation difficulties to HARD increases drone speed and grants score multipliers.",
    "S.H.I.E.L.D. Tip: Visor settings let you toggle scanlines and particle intensity to optimize render efficiency."
  ];

  useEffect(() => {
    console.log('[DEBUG] LoadingScreen: Phase 1 (Black Screen) initiated');
    
    // Choose a random tip
    setLoadingTip(tips[Math.floor(Math.random() * tips.length)]);

    // Auto-advance from black screen to Friday online after 1.5 seconds
    const timer = setTimeout(() => {
      setStage('friday_online');
      console.log('[DEBUG] LoadingScreen: Phase 2 (FRIDAY ONLINE) initiated');
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    // User gesture initializes the Web Audio context
    soundSystem.init();
    soundSystem.playClick();
    
    // Transition to diagnostics
    setStage('diagnostics');
    console.log('[DEBUG] LoadingScreen: Phase 3 (System Diagnostics) initiated');

    const messages = [
      { text: 'F.R.I.D.A.Y. AI BOOT LOADER V2.8.4... ONLINE', delay: 100 },
      { text: 'ESTABLISHING INTER-DIMENSIONAL QUANTUM LINK...', delay: 500 },
      { text: 'GRID CONNECTORS ACTIVE // PARALLAX COORDINATES SYNCHRONIZED', delay: 1000 },
      { text: 'STARK TOWER HYPER-STREAM INGESTING RAW telemetry...', delay: 1500 }
    ];

    messages.forEach((msg) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, msg.text]);
        soundSystem.playTick();
      }, msg.delay);
    });

    // Advance to Earth-616 Locate
    setTimeout(() => {
      setStage('earth_locate');
      console.log('[DEBUG] LoadingScreen: Phase 4 (Earth-616 Located) initiated');
      soundSystem.playPortalSwoosh();
      
      // Advance to Birthday Protocol
      setTimeout(() => {
        setStage('birthday_protocol');
        console.log('[DEBUG] LoadingScreen: Phase 5 (Birthday Protocol Activated) initiated');
        soundSystem.playClick();

        // Advance to Arc Charging
        setTimeout(() => {
          setStage('arc_charging');
          console.log('[DEBUG] LoadingScreen: Phase 6 (Arc Reactor Charging) initiated');
          startCharging();
        }, 1800);

      }, 1600);

    }, 2200);
  };

  const startCharging = () => {
    const duration = 2800;
    const intervalTime = 40;
    const step = 100 / (duration / intervalTime);

    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        soundSystem.playTick(); // subtle charging sweep frequency beep
        if (next >= 100) {
          clearInterval(progressInterval.current);
          
          // Advance to Strange Portal Open
          setTimeout(() => {
            setStage('portal_open');
            console.log('[DEBUG] LoadingScreen: Phase 7 (Strange Portal Opens) initiated');
            soundSystem.playPortalSwoosh();

            // Perform final camera fly-through zoom
            setTimeout(startPortalZoom, 1200);
          }, 400);

          return 100;
        }
        return next;
      });
    }, intervalTime);
  };

  const startPortalZoom = () => {
    setStage('portal_zoom');
    console.log('[DEBUG] LoadingScreen: Phase 8 (Camera Fly-Through) initiated');

    // Zoom the portal circle to scale 4
    gsap.fromTo('.loading-portal-ring',
      { scale: 0.1, rotation: 0, opacity: 1 },
      { 
        scale: 6.5, 
        rotation: 480, 
        opacity: 0, 
        duration: 1.6, 
        ease: 'power3.inOut',
        onComplete: () => {
          console.log('[DEBUG] LoadingScreen: Cinematic intro complete. Entering S.H.I.E.L.D. HQ');
          soundSystem.playAvengersFanfare();
          onEnter();
        }
      }
    );
  };

  return (
    <div className="loading-screen" style={{ backgroundColor: '#05070b' }}>
      <div className="hologram-scanlines" />

      {/* Stage 1: Black Screen */}
      {stage === 'black' && (
        <div style={{ color: 'rgba(255, 255, 255, 0.15)', fontFamily: 'var(--font-hud)', fontSize: '0.8rem', letterSpacing: '4px' }}>
          TIMELINE SYSTEM DORMANT // STAND BY
        </div>
      )}

      {/* Stage 2: Friday Online */}
      {stage === 'friday_online' && (
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-hud)' }}>
          <h2 style={{ color: '#00f5ff', textShadow: '0 0 15px #00f5ff', fontSize: '2.2rem', letterSpacing: '8px', marginBottom: '30px' }}>
            F.R.I.D.A.Y. ONLINE
          </h2>
          <button className="hud-btn gold" onClick={handleStart} style={{ padding: '12px 30px' }}>
            INITIATE BIOMETRIC DECRYPT
          </button>
        </div>
      )}

      {/* Stage 3: Diagnostics */}
      {stage === 'diagnostics' && (
        <div className="loading-terminal" style={{ maxWidth: '600px', width: '90%' }}>
          <div className="hologram-corner-tr" />
          <div className="hologram-corner-bl" />
          <div className="hologram-corner-br" />
          <div className="loading-terminal-logs" style={{ minHeight: '130px' }}>
            {logs.map((log, idx) => (
              <div key={idx} className="loading-terminal-line success" style={{ marginBottom: '8px' }}>
                &gt; {log}
              </div>
            ))}
          </div>
          <div style={{ color: '#00f5ff', opacity: 0.6, fontSize: '0.8rem', marginTop: '10px' }}>
            BOOT DIAGNOSTIC SEQUENCE IN PROGRESS...
          </div>
        </div>
      )}

      {/* Stage 4: Earth-616 Located */}
      {stage === 'earth_locate' && (
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-hud)' }}>
          <div style={{ fontSize: '1rem', color: '#ffd84a', letterSpacing: '4px', marginBottom: '10px' }}>
            SCANNING QUANTUM SECTOR-616
          </div>
          <div style={{ fontSize: '2.5rem', color: '#ffd84a', textShadow: '0 0 20px #ffd84a', fontWeight: 900, letterSpacing: '8px' }}>
            🌎 EARTH-616 LOCATED
          </div>
        </div>
      )}

      {/* Stage 5: Birthday Protocol */}
      {stage === 'birthday_protocol' && (
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-hud)' }}>
          <div style={{ fontSize: '1rem', color: '#e62429', letterSpacing: '4px', marginBottom: '10px' }}>
            SECURITY PROTOCOL BYPASS DETECTED
          </div>
          <div style={{ fontSize: '2.2rem', color: '#e62429', textShadow: '0 0 20px #e62429', fontWeight: 900, letterSpacing: '6px' }}>
            ⚠️ BIRTHDAY PROTOCOL ACTIVATED
          </div>
          <div style={{ color: '#fff', opacity: 0.5, fontSize: '0.8rem', marginTop: '12px', letterSpacing: '2px' }}>
            IDENTITY MATCH: AGENT GARV [LEGEND STATUS]
          </div>
        </div>
      )}

      {/* Stage 6: Arc Reactor Charging */}
      {stage === 'arc_charging' && (
        <div className="loading-terminal" style={{ maxWidth: '500px', width: '90%', textAlign: 'center' }}>
          <div className="hologram-corner-tr" />
          <div className="hologram-corner-bl" />
          
          <div style={{ fontSize: '1.2rem', color: '#00f5ff', letterSpacing: '4px', marginBottom: '20px' }}>
            ⚡ CHARGING ARC REACTOR CORE
          </div>
          
          <div className="loading-progress-bar-container" style={{ margin: '15px 0' }}>
            <div 
              className="loading-progress-bar-fill" 
              style={{ width: `${progress}%`, backgroundColor: '#00f5ff', boxShadow: '0 0 15px #00f5ff' }}
            />
          </div>
          <div style={{ fontSize: '1.8rem', color: '#fff', fontFamily: 'var(--font-hud)' }}>
            {Math.round(progress)}%
          </div>
        </div>
      )}

      {/* Stage 7: Strange Portal Opens */}
      {stage === 'portal_open' && (
        <div 
          className="loading-portal-ring-preview"
          style={{
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            border: '6px dashed #ffd84a',
            boxShadow: '0 0 40px #ffd84a, inset 0 0 45px #ff5500',
            animation: 'spin 10s linear infinite'
          }}
        />
      )}

      {/* Stage 8: Camera zoom fly-through */}
      {stage === 'portal_zoom' && (
        <div 
          className="loading-portal-ring"
          style={{
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            border: '8px solid #ffd84a',
            boxShadow: '0 0 60px #ffd84a, inset 0 0 60px #ff5500',
            filter: 'blur(1px)'
          }}
        />
      )}
      {/* S.H.I.E.L.D. Loading Tips */}
      {stage !== 'black' && stage !== 'portal_zoom' && stage !== 'portal_open' && (
        <div 
          style={{ 
            position: 'absolute', 
            bottom: '40px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            width: '90%', 
            maxWidth: '500px', 
            textAlign: 'center', 
            color: '#FFD84A', 
            fontFamily: 'var(--font-hud)', 
            fontSize: '0.78rem', 
            letterSpacing: '1px',
            opacity: 0.8,
            lineHeight: '1.45',
            textShadow: '0 0 5px rgba(255, 216, 74, 0.4)'
          }}
        >
          {loadingTip}
        </div>
      )}
    </div>
  );
};

export default LoadingScreen;
