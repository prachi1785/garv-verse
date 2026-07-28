import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import soundSystem from '../utils/soundSystem';

// Import upgraded games
import SpiderSwingGame from './games/SpiderSwingGame';
import FlightSimGame from './games/FlightSimGame';
import ShieldCombatGame from './games/ShieldCombatGame';
import StarkKartGame from './games/StarkKartGame';
import GhostRiderGame from './games/GhostRiderGame';
import PortalEscapeGame from './games/PortalEscapeGame';
import UltronSurvivalGame from './games/UltronSurvivalGame';
import AvengersBattleGame from './games/AvengersBattleGame';

const ArcadePortal = ({ stoneName, onClose, onGameComplete }) => {
  const [phase, setPhase] = useState('opening'); // opening -> countdown -> playing -> victory -> summary -> done
  const [countdownVal, setCountdownVal] = useState(3);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Gameplay HUD states
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [maxCombo, setMaxCombo] = useState(1);
  const [health, setHealth] = useState(100);
  const [timeLeft, setTimeLeft] = useState(40);
  
  // Results summary states
  const [results, setResults] = useState(null);
  const [stoneVisible, setStoneVisible] = useState(false);

  const timerRef = useRef(null);
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

  const gameObjectives = {
    Space: 'Swing to the finish. Collect tokens. Avoid red drones.',
    Mind: 'Fly through Stark City. Shoot drones. Gather blue reactor cores.',
    Reality: 'Bounce shield to break crates and defeat red bots.',
    Power: 'Drift through the race track. Beat the opponent kart in 3 laps.',
    Time: 'Weave highway traffic. Hold SPACE for Nitro. Reach 3000m.',
    Soul: 'Platform jump. Press Space to jump spikes. Portals shift gravity.',
    Legend: 'WASD to move, aim mouse and shoot. Survive 90 seconds.',
    Final: 'Switch heroes with 1, 2, 3. Defeat Thanos with combining combat.'
  };

  // Load High Score on Mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`garvverse_highscore_${stoneName}`) || 0;
      setHighScore(Number(stored));
      
      // Default time limit adjustments per game
      if (stoneName === 'Legend') setTimeLeft(90);
      else if (stoneName === 'Time') setTimeLeft(60);
      else setTimeLeft(40);
    } catch(e) {}

    // Intro Entrance
    soundSystem.playPortalSwoosh();
    gsap.fromTo('.doctor-strange-portal-frame',
      { scale: 0.05, rotation: 0, opacity: 0 },
      { scale: 1, rotation: 360, opacity: 1, duration: 0.8, ease: 'back.out(1.15)' }
    );
  }, [stoneName]);

  const startCountdown = () => {
    setPhase('countdown');
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
          setPhase('playing');
          startTime.current = Date.now();
          startTimer();
        }, 600);
      } else {
        setCountdownVal(count);
        soundSystem.playTick();
      }
    }, 850);
  };

  useEffect(() => {
    if (phase === 'countdown') {
      // do nothing, interval handles
    } else if (phase === 'opening') {
      const timer = setTimeout(() => {
        startCountdown();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Game timer loop
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      if (isPaused) return;

      setTimeLeft((prev) => {
        if (stoneName !== 'Legend' && stoneName !== 'Time' && prev <= 1) {
          clearInterval(timerRef.current);
          handleLoss();
          return 0;
        }
        
        // Count up time elapsed
        timeElapsed.current = Math.floor((Date.now() - startTime.current) / 1000);
        
        // Legend game ends by surviving time down
        if (stoneName === 'Legend') {
          // decrement time left
          return prev - 1;
        }
        
        return prev - 1;
      });
    }, 1000);
  };

  const pauseGame = () => {
    soundSystem.playClick();
    setIsPaused(true);
  };

  const resumeGame = () => {
    soundSystem.playClick();
    setIsPaused(false);
  };

  const confirmExit = () => {
    soundSystem.playClick();
    clearInterval(timerRef.current);
    onClose();
  };

  const cancelExit = () => {
    soundSystem.playClick();
    setShowExitConfirm(false);
    setIsPaused(false);
  };

  // Communication callbacks from inner games
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
    clearInterval(timerRef.current);
    setPhase('done'); // show simple loss screen
    soundSystem.playClick();
  };

  const handleWin = (finalScore = score, accuracy = 100) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('victory');
    soundSystem.playStoneSocket();

    // GSAP camera zoom shake
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

    // Calculate Rank
    let rank = 'C';
    const computedScore = finalScore || score;
    if (computedScore >= 1500 || health >= 90) rank = 'S';
    else if (computedScore >= 1200 || health >= 75) rank = 'A';
    else if (computedScore >= 800) rank = 'B';

    const isNewHigh = computedScore > highScore;

    const summary = {
      score: computedScore,
      highScore: isNewHigh ? computedScore : highScore,
      timeTaken: timeElapsed.current || 25,
      maxCombo: maxCombo,
      rank: rank,
      isNewHighScore: isNewHigh
    };

    setResults(summary);

    // Save automatically
    setTimeout(() => {
      setStoneVisible(true);
      
      const stoneEl = document.querySelector('.flying-stone-glow');
      if (stoneEl) {
        const tl = gsap.timeline({
          onComplete: () => {
            soundSystem.playAvengersFanfare();
            setPhase('summary');
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

  const handleReturn = () => {
    soundSystem.playClick();
    onGameComplete(stoneName, score, timeElapsed.current, maxCombo);
  };

  const handleReplay = () => {
    soundSystem.playClick();
    setScore(0);
    setCombo(1);
    setMaxCombo(1);
    setHealth(100);
    setTimeLeft(stoneName === 'Legend' ? 90 : 40);
    setPhase('countdown');
    startCountdown();
  };

  const renderActiveGame = () => {
    // Inject custom score and combo listeners into the games dynamically
    const props = {
      onWin: handleWin,
      onLoss: handleLoss,
      onScoreUpdate: handleScoreUpdate,
      onComboUpdate: handleComboUpdate,
      onHealthUpdate: handleHealthUpdate,
      isPaused: isPaused
    };

    switch (stoneName) {
      case 'Space':
        return <SpiderSwingGame {...props} />;
      case 'Mind':
        return <FlightSimGame {...props} />;
      case 'Reality':
        return <ShieldCombatGame {...props} />;
      case 'Power':
        return <StarkKartGame {...props} />;
      case 'Time':
        return <GhostRiderGame {...props} />;
      case 'Soul':
        return <PortalEscapeGame {...props} />;
      case 'Legend':
        return <UltronSurvivalGame {...props} />;
      case 'Final':
        return <AvengersBattleGame {...props} />;
      default:
        return <div>Unknown Dimension Portal</div>;
    }
  };

  return (
    <div className="portal-modal-overlay" style={{ zIndex: 1050 }}>
      <div className="doctor-strange-portal-frame">
        <div className="portal-runes-ring1" />
        <div className="portal-runes-ring2" />
        <div className="portal-fire-sparks" />
        
        {/* Game Area */}
        <div className="portal-game-window" style={{ borderRadius: '8px', padding: '15px' }}>
          <div className="hologram-scanlines" />

          {/* HUD (playing phase) */}
          {phase === 'playing' && (
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
              <div style={{ color: '#FFD84A' }}>OBJ: {gameObjectives[stoneName]}</div>
              <div style={{ color: '#00F5FF' }}>TIMER: {timeLeft}s</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={isPaused ? resumeGame : pauseGame}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00F5FF',
                    fontFamily: 'var(--font-hud)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isPaused ? 'RESUME' : 'PAUSE'}
                </button>
                <button 
                  onClick={() => { setIsPaused(true); setShowExitConfirm(true); }}
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

          {/* Gameplay Content */}
          {phase === 'playing' && renderActiveGame()}

          {/* Opening / Loading countdowns */}
          {phase === 'opening' && (
            <div style={{ fontFamily: 'var(--font-hud)', color: 'var(--stark-gold)', fontSize: '1.6rem', letterSpacing: '4px' }}>
              STARK MULTIVERSE CORE BOOTING...
            </div>
          )}

          {phase === 'countdown' && (
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

          {/* Victory Cinematic */}
          {phase === 'victory' && (
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
              {results?.isNewHighScore && (
                <div 
                  style={{ 
                    fontFamily: 'var(--font-hud)', 
                    color: '#FFD84A', 
                    fontSize: '1.5rem', 
                    fontWeight: 900,
                    animation: 'pulseGlow 0.4s infinite alternate',
                    marginTop: '10px'
                  }}
                >
                  🏆 NEW HIGH SCORE!
                </div>
              )}
            </div>
          )}

          {/* Flying Stone Materializer */}
          {phase === 'victory' && stoneVisible && (
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

          {/* Results Summary Modal Overlay */}
          {phase === 'summary' && results && (
            <div 
              style={{
                width: '90%',
                maxHeight: '95%',
                backgroundColor: 'rgba(5, 7, 11, 0.9)',
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
              <div style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '3px', color: stoneColors[stoneName] }}>
                MISSION EVALUATION
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.6, letterSpacing: '4px', marginTop: '4px' }}>
                STARK SIMULATOR RESULTS
              </div>

              {/* Stats table */}
              <div style={{ width: '100%', margin: '20px 0', fontSize: '1.1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                  <span>SIMULATOR:</span>
                  <span style={{ fontWeight: 700 }}>{stoneName} Challenge</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                  <span>FINAL SCORE:</span>
                  <span style={{ color: '#00F5FF', fontWeight: 700 }}>{results.score}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                  <span>RECORD SCORE:</span>
                  <span style={{ color: '#FFD84A', fontWeight: 700 }}>{results.highScore}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                  <span>ELAPSED TIME:</span>
                  <span>{results.timeTaken} seconds</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                  <span>MAX COMBO:</span>
                  <span style={{ color: '#00FF66' }}>{results.maxCombo}x</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>PERFORMANCE RANK:</span>
                  <span 
                    style={{ 
                      fontSize: '2.5rem', 
                      fontWeight: 900, 
                      color: results.rank === 'S' ? '#FFD84A' : results.rank === 'A' ? '#00FF66' : '#00F5FF',
                      textShadow: `0 0 10px ${results.rank === 'S' ? '#FFD84A' : '#00FF66'}`
                    }}
                  >
                    {results.rank}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '15px', width: '100%', justifyContent: 'center', marginTop: '10px' }}>
                <button className="hud-btn" onClick={handleReplay}>
                  PLAY AGAIN
                </button>
                <button className="hud-btn gold" onClick={handleReturn}>
                  DASHBOARD
                </button>
              </div>
            </div>
          )}

          {/* Loss / Game Over State */}
          {phase === 'done' && (
            <div style={{ textAlign: 'center', fontFamily: 'var(--font-hud)' }}>
              <div style={{ fontSize: '2.4rem', color: '#E62429', textShadow: '0 0 15px #E62429', fontWeight: 900, letterSpacing: '4px' }}>
                SIMULATION FAILED
              </div>
              <div style={{ opacity: 0.6, margin: '15px 0' }}>The timeline stability has been compromised. Try again.</div>
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button className="hud-btn" onClick={handleReplay}>
                  RETRY
                </button>
                <button className="hud-btn red" onClick={confirmExit}>
                  EXIT
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
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '1.4rem', color: '#E62429', marginBottom: '20px', letterSpacing: '2px' }}>
                EXIT CURRENT SIMULATION?
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button className="hud-btn red" onClick={confirmExit}>
                  YES, ABORT
                </button>
                <button className="hud-btn" onClick={cancelExit}>
                  NO, CONTINUE
                </button>
              </div>
            </div>
          )}

          {/* Pause overlay screen */}
          {isPaused && !showExitConfirm && (
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(5, 7, 11, 0.75)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1090,
                borderRadius: '8px'
              }}
            >
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '2rem', color: '#00F5FF', marginBottom: '20px', letterSpacing: '4px' }}>
                PAUSED
              </div>
              <button className="hud-btn" onClick={resumeGame}>
                RESUME PLAYING
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ArcadePortal;
