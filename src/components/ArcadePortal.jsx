import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import soundSystem from '../utils/soundSystem';
import MissionPlaceholderGameplay from './MissionPlaceholderGameplay';

const ArcadePortal = ({ stoneName, onClose, onGameComplete }) => {
  // Centralized State Machine
  // States: AVAILABLE -> LOADING -> COUNTDOWN -> PLAYING -> PAUSED -> VICTORY / GAME_OVER -> REWARD -> COMPLETE -> RETURNING
  const [missionState, setMissionState] = useState('AVAILABLE');
  
  const [countdownVal, setCountdownVal] = useState(3);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Stats
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [maxCombo, setMaxCombo] = useState(1);
  const [health, setHealth] = useState(100);
  const [timeLeft, setTimeLeft] = useState(40);
  const [timeTaken, setTimeTaken] = useState(0);
  
  const [stoneVisible, setStoneVisible] = useState(false);

  const timerInterval = useRef(null);
  const startTime = useRef(0);
  const timeElapsed = useRef(0);

  const stoneColors = {
    Space: '#00F5FF',
    Mind: '#FFD84A',
    Reality: '#E62429',
    Power: '#7F5CFF',
    Time: '#00FF66',
    Soul: '#FF9900',
    Legend: '#FFD84A',
    Final: '#FFFFFF'
  };

  const missionDetails = {
    Space: { name: 'Space Stone Retrieval', difficulty: 'Normal', time: '40s', obj: 'Calibrate reactor core anomalies. Click targets to harvest space coordinates.', reward: 'Space Stone' },
    Mind: { name: 'Mind Stone Acquisition', difficulty: 'Normal', time: '40s', obj: 'Calibrate reactor core anomalies. Click targets to harvest mind coordinates.', reward: 'Mind Stone' },
    Reality: { name: 'Reality Stone Stabilization', difficulty: 'High', time: '40s', obj: 'Calibrate reactor core anomalies. Click targets to harvest reality coordinates.', reward: 'Reality Stone' },
    Power: { name: 'Power Stone Calibration', difficulty: 'Normal', time: '40s', obj: 'Calibrate reactor core anomalies. Click targets to harvest power coordinates.', reward: 'Power Stone' },
    Time: { name: 'Time Stone Manipulation', difficulty: 'Extreme', time: '40s', obj: 'Calibrate reactor core anomalies. Click targets to harvest temporal coordinates.', reward: 'Time Stone' },
    Soul: { name: 'Soul Stone Sacrifice', difficulty: 'Extreme', time: '40s', obj: 'Calibrate reactor core anomalies. Click targets to harvest bio-signatures.', reward: 'Soul Stone' },
    Legend: { name: 'Ultron Survival Training', difficulty: 'Critical', time: '40s', obj: 'Calibrate reactor core anomalies. Click targets to harvest legend clearances.', reward: 'Legend Trophy' },
    Final: { name: 'Avengers Final Stand', difficulty: 'Omega', time: '40s', obj: 'Calibrate reactor core anomalies. Click targets to defeat Thanos coordinate grids.', reward: 'Snap Key' }
  };

  const currentDetails = missionDetails[stoneName] || { name: 'Unknown Mission', difficulty: 'Normal', time: '40s', obj: 'Calibrate coordinates.', reward: 'None' };

  // Load High Score on Mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`garvverse_highscore_${stoneName}`) || 0;
      setHighScore(Number(stored));
      console.log(`[DEBUG] MissionManager: [${stoneName}] Initialized. High Score: ${stored}`);
    } catch(e) {}

    // Intro Entrance portal
    soundSystem.playPortalSwoosh();
    gsap.fromTo('.doctor-strange-portal-frame',
      { scale: 0.05, rotation: 0, opacity: 0 },
      { scale: 1, rotation: 360, opacity: 1, duration: 0.8, ease: 'back.out(1.15)' }
    );
  }, [stoneName]);

  // Handle LOADING Boot sequences
  useEffect(() => {
    if (missionState === 'LOADING') {
      console.log('[DEBUG] MissionManager: Loading diagnostic sequence booted');
      const timer = setTimeout(() => {
        setMissionState('COUNTDOWN');
        startCountdown();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [missionState]);

  const startCountdown = () => {
    console.log('[DEBUG] MissionManager: Countdown starting');
    let count = 3;
    setCountdownVal(3);
    soundSystem.playTick();

    const interval = setInterval(() => {
      count--;
      if (count === 0) {
        clearInterval(interval);
        setCountdownVal('START');
        soundSystem.playClick();
        setTimeout(() => {
          setMissionState('PLAYING');
          console.log('[DEBUG] MissionManager: Gameplay started');
          startTime.current = Date.now();
          startTimer();
        }, 600);
      } else {
        setCountdownVal(count);
        soundSystem.playTick();
      }
    }, 850);
  };

  const startTimer = () => {
    if (timerInterval.current) clearInterval(timerInterval.current);
    
    timerInterval.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval.current);
          handleLoss();
          return 0;
        }
        
        timeElapsed.current = Math.floor((Date.now() - startTime.current) / 1000);
        setTimeTaken(timeElapsed.current);
        return prev - 1;
      });
    }, 1000);
  };

  const handlePause = () => {
    console.log('[DEBUG] MissionManager: Mission Paused');
    setMissionState('PAUSED');
    soundSystem.playClick();
  };

  const handleResume = () => {
    console.log('[DEBUG] MissionManager: Mission Resumed');
    setMissionState('PLAYING');
    soundSystem.playClick();
  };

  const handleExitSafely = () => {
    console.log('[DEBUG] MissionManager: Exiting safely and disposing resources');
    if (timerInterval.current) clearInterval(timerInterval.current);
    onClose();
  };

  // Callbacks from placeholder gameplay
  const handleScoreUpdate = (newScore) => {
    setScore(newScore);
  };

  const handleComboUpdate = (newCombo) => {
    setCombo(newCombo);
    if (newCombo > maxCombo) setMaxCombo(newCombo);
  };

  const handleHealthUpdate = (newHealth) => {
    setHealth(newHealth);
  };

  const handleLoss = () => {
    console.log('[DEBUG] MissionManager: Game Over state triggered');
    if (timerInterval.current) clearInterval(timerInterval.current);
    setMissionState('GAME_OVER');
    soundSystem.playClick();
    
    setTimeout(() => {
      setMissionState('COMPLETE');
    }, 1500);
  };

  const handleWin = (finalScore = score) => {
    console.log('[DEBUG] MissionManager: Victory state triggered');
    if (timerInterval.current) clearInterval(timerInterval.current);
    setMissionState('VICTORY');
    soundSystem.playStoneSocket();

    // Zoom and shake portal
    gsap.to('.portal-game-window', {
      scale: 1.04,
      boxShadow: `0 0 45px ${stoneColors[stoneName]}`,
      duration: 1.2,
      ease: 'power2.out'
    });

    gsap.fromTo('.garv-verse-app',
      { x: 10, y: -10 },
      { x: 0, y: 0, duration: 0.05, repeat: 8, yoyo: true }
    );

    // Transition to Reward
    setTimeout(() => {
      setMissionState('REWARD');
      console.log('[DEBUG] MissionManager: Reward state triggered');
      setStoneVisible(true);

      const stoneEl = document.querySelector('.flying-stone-glow');
      if (stoneEl) {
        const tl = gsap.timeline({
          onComplete: () => {
            soundSystem.playAvengersFanfare();
            setMissionState('COMPLETE');
            console.log('[DEBUG] MissionManager: Complete stats screen triggered');
          }
        });

        tl.fromTo(stoneEl,
          { scale: 0.2, x: 0, y: 0, opacity: 0 },
          { scale: 2.8, opacity: 1, duration: 0.8, ease: 'back.out(1.4)' }
        )
        .to(stoneEl, {
          scale: 0.4,
          x: -window.innerWidth * 0.42,
          y: -window.innerHeight * 0.42,
          rotation: 360,
          duration: 0.9,
          ease: 'power3.inOut'
        });
      }
    }, 1400);
  };

  const handleReturnDashboard = () => {
    console.log('[DEBUG] MissionManager: Returning to dashboard');
    setMissionState('RETURNING');
    gsap.to('.doctor-strange-portal-frame', {
      scale: 0.01,
      rotation: -360,
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        // Save stats to Local Storage
        onGameComplete(stoneName, score, timeTaken, maxCombo);
      }
    });
  };

  const handleReplay = () => {
    console.log('[DEBUG] MissionManager: Replaying mission');
    setScore(0);
    setCombo(1);
    setMaxCombo(1);
    setHealth(100);
    setTimeLeft(40);
    setTimeTaken(0);
    setMissionState('COUNTDOWN');
    startCountdown();
  };

  const getRank = (finalScore) => {
    if (finalScore >= 1200 && health >= 90) return 'S';
    if (finalScore >= 800) return 'A';
    if (finalScore >= 500) return 'B';
    return 'C';
  };

  const rank = getRank(score);

  return (
    <div className="portal-modal-overlay" style={{ zIndex: 1050 }}>
      <div className="doctor-strange-portal-frame">
        <div className="portal-runes-ring1" />
        <div className="portal-runes-ring2" />
        <div className="portal-fire-sparks" />
        
        {/* Game portal frame */}
        <div className="portal-game-window" style={{ borderRadius: '8px', padding: '15px' }}>
          <div className="hologram-scanlines" />

          {/* HUD (playing phase) */}
          {missionState === 'PLAYING' && (
            <div 
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 10px',
                fontFamily: 'var(--font-hud)',
                fontSize: '0.8rem',
                borderBottom: '1px solid rgba(0, 245, 255, 0.2)',
                background: 'rgba(5, 7, 11, 0.65)',
                marginBottom: '8px'
              }}
            >
              <div style={{ color: stoneColors[stoneName] }}>SCORE: {score} [HI: {highScore}]</div>
              <div style={{ color: '#00F5FF' }}>OBJ: {currentDetails.obj}</div>
              <div style={{ color: '#ffd84a' }}>COMBO: {combo}x // LIFE: {health}%</div>
              <div style={{ color: '#00F5FF' }}>TIME: {timeLeft}s</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={handlePause}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00F5FF',
                    fontFamily: 'var(--font-hud)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  PAUSE
                </button>
                <button 
                  onClick={() => { setMissionState('PAUSED'); setShowExitConfirm(true); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#E62429',
                    fontFamily: 'var(--font-hud)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  EXIT
                </button>
              </div>
            </div>
          )}

          {/* Render states */}

          {/* 1. AVAILABLE (Briefing Modal inside Manager) */}
          {missionState === 'AVAILABLE' && (
            <div style={{ fontFamily: 'var(--font-hud)', color: '#fff', textAlign: 'center', maxWidth: '440px' }}>
              <div style={{ fontSize: '1.4rem', color: stoneColors[stoneName], fontWeight: 900, letterSpacing: '2px', marginBottom: '5px' }}>
                {currentDetails.name.toUpperCase()}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.5, letterSpacing: '3px', marginBottom: '15px' }}>
                MISSION BRIEFING DIRECTIVE
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', textAlign: 'left', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                  <span style={{ opacity: 0.6 }}>DIFFICULTY:</span>
                  <span style={{ color: '#ffd84a' }}>Threat Level: {currentDetails.difficulty}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                  <span style={{ opacity: 0.6 }}>DURATION:</span>
                  <span>{currentDetails.time}</span>
                </div>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                  <span style={{ opacity: 0.6, display: 'block', marginBottom: '2px' }}>TACTICAL OBJECTIVE:</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>{currentDetails.obj}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ opacity: 0.6 }}>REWARD CORES:</span>
                  <span style={{ color: '#00ff66' }}>{currentDetails.reward}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button className="hud-btn gold" onClick={() => setMissionState('LOADING')}>
                  BEGIN MISSION
                </button>
                <button className="hud-btn" onClick={onClose}>
                  RETURN
                </button>
              </div>
            </div>
          )}

          {/* 2. LOADING (System Diagnostic Logs) */}
          {missionState === 'LOADING' && (
            <div style={{ fontFamily: 'var(--font-hud)', color: '#00f5ff', fontSize: '1.2rem', letterSpacing: '4px', textAlign: 'center' }}>
              <div>STARK SIMULATOR INITIALIZING...</div>
              <div style={{ color: '#fff', opacity: 0.5, fontSize: '0.8rem', marginTop: '10px' }}>
                CALIBRATING QUANTUM REACTION CORE ANOMALIES
              </div>
            </div>
          )}

          {/* 3. COUNTDOWN (3-2-1 Beeps) */}
          {missionState === 'COUNTDOWN' && (
            <div 
              style={{
                fontFamily: 'var(--font-title)',
                fontSize: '5rem',
                color: stoneColors[stoneName],
                textShadow: `0 0 20px ${stoneColors[stoneName]}`,
                textAlign: 'center'
              }}
            >
              {countdownVal}
            </div>
          )}

          {/* 4. PLAYING (Active placeholder gameplay container) */}
          {missionState === 'PLAYING' && (
            <MissionPlaceholderGameplay 
              onWin={handleWin}
              onLoss={handleLoss}
              onScoreUpdate={handleScoreUpdate}
              onComboUpdate={handleComboUpdate}
              onHealthUpdate={handleHealthUpdate}
              isPaused={false}
            />
          )}

          {/* 5. PAUSED Overlay */}
          {missionState === 'PAUSED' && !showExitConfirm && (
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(5, 7, 11, 0.8)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1090,
                borderRadius: '8px'
              }}
            >
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '2rem', color: '#00f5ff', marginBottom: '20px', letterSpacing: '4px' }}>
                PAUSED
              </div>
              <button className="hud-btn" onClick={handleResume}>
                RESUME MISSION
              </button>
            </div>
          )}

          {/* 6. VICTORY banner */}
          {missionState === 'VICTORY' && (
            <div style={{ textAlign: 'center' }}>
              <div 
                style={{
                  fontFamily: 'var(--font-title)',
                  fontSize: '3rem',
                  color: '#00FF66',
                  textShadow: '0 0 20px #00FF66',
                  letterSpacing: '5px'
                }}
              >
                MISSION COMPLETE
              </div>
            </div>
          )}

          {/* 7. GAME OVER banner */}
          {missionState === 'GAME_OVER' && (
            <div style={{ textAlign: 'center', fontFamily: 'var(--font-hud)' }}>
              <div style={{ fontSize: '2.5rem', color: '#E62429', textShadow: '0 0 15px #E62429', fontWeight: 900, letterSpacing: '4px' }}>
                MISSION FAILED
              </div>
              <div style={{ opacity: 0.6, marginTop: '8px' }}>Timeline coordinates collapsed. Review specifications and redeploy.</div>
            </div>
          )}

          {/* 8. REWARD Animate Stone */}
          {missionState === 'REWARD' && stoneVisible && (
            <div 
              className="flying-stone-glow"
              style={{
                width: '55px',
                height: '55px',
                backgroundColor: stoneColors[stoneName],
                boxShadow: `0 0 35px ${stoneColors[stoneName]}`,
                clipPath: 'polygon(50% 0%, 90% 20%, 100% 60%, 75% 95%, 25% 95%, 0% 60%, 10% 20%)',
                zIndex: 1200,
                position: 'absolute'
              }}
            />
          )}

          {/* 9. COMPLETE (Standardized Reusable Results Screen) */}
          {missionState === 'COMPLETE' && (
            <div 
              style={{
                width: '90%',
                maxHeight: '95%',
                backgroundColor: 'rgba(5, 7, 11, 0.95)',
                border: `2px solid ${stoneColors[stoneName]}`,
                borderRadius: '8px',
                boxShadow: `0 0 30px ${stoneColors[stoneName]}33`,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: '#fff',
                fontFamily: 'var(--font-hud)',
                zIndex: 1100
              }}
            >
              <div style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '3px', color: stoneColors[stoneName] }}>
                MISSION EVALUATION
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.5, letterSpacing: '4px', marginTop: '4px', marginBottom: '15px' }}>
                STARK SIMULATOR RESULTS
              </div>

              {/* Scorecard table */}
              <div style={{ width: '100%', marginBottom: '20px', fontSize: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                  <span>MISSION NAME:</span>
                  <span style={{ fontWeight: 700 }}>{currentDetails.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                  <span>FINAL SCORE:</span>
                  <span style={{ color: '#00F5FF', fontWeight: 700 }}>{score}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                  <span>HIGH RECORD:</span>
                  <span style={{ color: '#FFD84A', fontWeight: 700 }}>{score > highScore ? score : highScore}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                  <span>ELAPSED TIME:</span>
                  <span>{timeTaken} seconds</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                  <span>MAX COMBO:</span>
                  <span style={{ color: '#00FF66' }}>{maxCombo}x</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>PERFORMANCE RANK:</span>
                  <span 
                    style={{ 
                      fontSize: '2.2rem', 
                      fontWeight: 900, 
                      color: rank === 'S' ? '#FFD84A' : rank === 'A' ? '#00FF66' : '#00F5FF',
                      textShadow: `0 0 10px ${rank === 'S' ? '#FFD84A' : '#00FF66'}`
                    }}
                  >
                    {rank}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '15px', width: '100%', justifyContent: 'center' }}>
                <button className="hud-btn" onClick={handleReplay}>
                  REPLAY
                </button>
                <button className="hud-btn gold" onClick={handleReturnDashboard}>
                  RETURN DASHBOARD
                </button>
              </div>
            </div>
          )}

          {/* Custom Exit Confirm Dialog Modal */}
          {showExitConfirm && (
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(5, 7, 11, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1200,
                borderRadius: '8px'
              }}
            >
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '1.3rem', color: '#E62429', marginBottom: '20px', letterSpacing: '2px' }}>
                ABORT DIRECTIVE SIMULATION?
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button className="hud-btn red" onClick={handleExitSafely}>
                  YES, EXIT
                </button>
                <button className="hud-btn" onClick={() => { setShowExitConfirm(false); setMissionState('PLAYING'); }}>
                  NO, CONTINUE
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ArcadePortal;
