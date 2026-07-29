import React, { useState, useEffect } from 'react';
import soundSystem from './utils/soundSystem';

// Components
import CustomCursor from './components/CustomCursor';
import SpaceCanvas from './components/SpaceCanvas';
import LoadingScreen from './components/LoadingScreen';
import ShieldDashboard from './components/ShieldDashboard';
import InfinityGauntlet from './components/InfinityGauntlet';
import ArcadePortal from './components/ArcadePortal';
import SnapEffect from './components/SnapEffect';
import HallOfHeroes from './components/HallOfHeroes';

function App() {
  const [stage, setStage] = useState('loading'); // loading -> dashboard -> snapping -> celebration
  const [stones, setStones] = useState({
    Space: false,
    Mind: false,
    Reality: false,
    Power: false,
    Time: false,
    Soul: false
  });
  const [trophy, setTrophy] = useState(false); // Legend Trophy
  const [snapKey, setSnapKey] = useState(false); // Final Avengers Battle Key
  
  const [activeGame, setActiveGame] = useState(null); // 'Space', 'Mind', 'Reality', 'Power', 'Time', 'Soul', 'Legend', 'Final'
  const [muted, setMuted] = useState(false);

  // 1. Initial State Loading from Local Storage
  useEffect(() => {
    try {
      const savedStones = localStorage.getItem('garvverse_stones');
      if (savedStones) {
        setStones(JSON.parse(savedStones));
      }

      const savedTrophy = localStorage.getItem('garvverse_trophy');
      if (savedTrophy) {
        setTrophy(savedTrophy === 'true');
      }

      const savedSnapKey = localStorage.getItem('garvverse_snapkey');
      if (savedSnapKey) {
        setSnapKey(savedSnapKey === 'true');
      }

      // Sync Audio preferences
      const savedAudioPref = localStorage.getItem('garvverse_pref_audio');
      if (savedAudioPref === 'muted') {
        setMuted(true);
        soundSystem.setMute(true);
      }
    } catch (e) {
      console.error("Failed to load saved state:", e);
    }
  }, []);

  const handleEnterDashboard = () => {
    setStage('dashboard');
  };

  const handleLaunchGame = (stoneName) => {
    soundSystem.playClick();
    setActiveGame(stoneName);
  };

  // 2. Save stats to state and Local Storage on victory
  const handleGameComplete = (stoneName, finalScore, timeTaken, maxCombo) => {
    soundSystem.playClick();

    if (stoneName === 'Legend') {
      setTrophy(true);
      localStorage.setItem('garvverse_trophy', 'true');
    } else if (stoneName === 'Final') {
      setSnapKey(true);
      localStorage.setItem('garvverse_snapkey', 'true');
    } else {
      const nextStones = { ...stones, [stoneName]: true };
      setStones(nextStones);
      localStorage.setItem('garvverse_stones', JSON.stringify(nextStones));
    }

    // Persist scores
    try {
      const prevHighScore = localStorage.getItem(`garvverse_highscore_${stoneName}`) || 0;
      if (finalScore > prevHighScore) {
        localStorage.setItem(`garvverse_highscore_${stoneName}`, finalScore);
      }

      const prevBestTime = localStorage.getItem(`garvverse_besttime_${stoneName}`) || 99999;
      if (timeTaken < prevBestTime) {
        localStorage.setItem(`garvverse_besttime_${stoneName}`, timeTaken);
      }

      const prevBestCombo = localStorage.getItem(`garvverse_bestcombo_${stoneName}`) || 0;
      if (maxCombo > prevBestCombo) {
        localStorage.setItem(`garvverse_bestcombo_${stoneName}`, maxCombo);
      }
    } catch (e) {
      console.error("Failed to persist high scores:", e);
    }

    setActiveGame(null);
  };

  const handleAwardSoulStone = () => {
    soundSystem.playStoneSocket();
    const nextStones = { ...stones, Soul: true };
    setStones(nextStones);
    localStorage.setItem('garvverse_stones', JSON.stringify(nextStones));
  };

  const handleSnapTrigger = () => {
    soundSystem.playClick();
    setStage('snapping');
  };

  const handleSnapEffectComplete = () => {
    setStage('celebration');
  };

  const handleReset = () => {
    soundSystem.playClick();
    
    // Clear Local Storage
    localStorage.removeItem('garvverse_stones');
    localStorage.removeItem('garvverse_trophy');
    localStorage.removeItem('garvverse_snapkey');
    
    // Reset high scores
    const games = ['Space', 'Mind', 'Reality', 'Power', 'Time', 'Soul', 'Legend', 'Final'];
    games.forEach((game) => {
      localStorage.removeItem(`garvverse_highscore_${game}`);
      localStorage.removeItem(`garvverse_besttime_${game}`);
      localStorage.removeItem(`garvverse_bestcombo_${game}`);
    });

    setStones({
      Space: false,
      Mind: false,
      Reality: false,
      Power: false,
      Time: false,
      Soul: false
    });
    setTrophy(false);
    setSnapKey(false);
    setStage('loading');
    setActiveGame(null);
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    soundSystem.setMute(nextMuted);
    localStorage.setItem('garvverse_pref_audio', nextMuted ? 'muted' : 'unmuted');
  };

  const collectedCount = Object.values(stones).filter(Boolean).length;

  return (
    <div className="garv-verse-app">
      {/* Custom Cursor System */}
      <CustomCursor />

      {/* 3D WebGL Background Scene */}
      {stage !== 'celebration' && (
        <SpaceCanvas collectedStonesCount={collectedCount} />
      )}

      {/* Mute Button */}
      {stage !== 'loading' && stage !== 'snapping' && (
        <div 
          className="hud-controls"
          style={{
            position: 'fixed',
            top: '16px',
            right: '25px',
            zIndex: 1010
          }}
        >
          <button 
            className="mute-hud-button" 
            onClick={toggleMute}
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      )}

      {/* Stage 1: Cinematic Loading Marvel Intro */}
      {stage === 'loading' && (
        <LoadingScreen onEnter={handleEnterDashboard} />
      )}

      {/* Stage 2: S.H.I.E.L.D Dashboard */}
      {stage === 'dashboard' && (
        <div className={`dashboard-wrapper ${activeGame ? 'dashboard-fade-out' : ''}`}>
          {/* Top HUD Nav */}
          <div className="dashboard-top-hud">
            <div className="hud-logo">
              S.H.I.E.L.D. <span>DATABASE V2.0</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
              <div className="shield-rank-badge">
                CLEARANCE STATUS: <span>AGENT LEGEND</span>
              </div>
            </div>
          </div>

          {/* Infinity Gauntlet socket row in HUD */}
          <InfinityGauntlet 
            stones={stones} 
            snapKey={snapKey} 
            onSnapTrigger={handleSnapTrigger} 
          />

          {/* Central Grid Dashboard Panels */}
          <ShieldDashboard 
            stones={stones} 
            trophy={trophy}
            snapKey={snapKey}
            onLaunchGame={handleLaunchGame}
            onAwardSoulStone={handleAwardSoulStone}
          />
        </div>
      )}

      {/* Active Game Portal Overlay Modal */}
      {activeGame && (
        <ArcadePortal 
          stoneName={activeGame} 
          onClose={() => setActiveGame(null)} 
          onGameComplete={handleGameComplete}
        />
      )}

      {/* Stage 3: Snap Disintegration Animation */}
      <SnapEffect 
        active={stage === 'snapping'} 
        onEffectComplete={handleSnapEffectComplete}
      />

      {/* Stage 4: Hall of Heroes Final Celebration */}
      {stage === 'celebration' && (
        <HallOfHeroes onReset={handleReset} />
      )}
    </div>
  );
}

export default App;
