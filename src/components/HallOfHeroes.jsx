import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import soundSystem from '../utils/soundSystem';

const HallOfHeroes = ({ onReset }) => {
  useEffect(() => {
    // Play heroic Avengers fanfare
    soundSystem.playAvengersFanfare();

    // Trigger initial fireworks confetti spray
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1100 };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, animate near top
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }, colors: ['#FFD84A', '#00F5FF', '#FF9900'] });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }, colors: ['#7F5CFF', '#F7FFFF', '#E62429'] });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const handleTriggerConfetti = () => {
    soundSystem.playClick();
    
    // Shoot confetti fountain from bottom center
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#FFD84A', '#00F5FF', '#F7FFFF', '#7F5CFF']
    });
  };

  const memories = [
    {
      hero: 'Iron Man',
      icon: '🦾',
      sub: 'Tony Stark // Earth-616',
      msg: '"I checked the database, Garv. Your power levels exceed the Arc Reactor index. I love you 3000. Happy Birthday, Legend."',
      color: '#E62429'
    },
    {
      hero: 'Doctor Strange',
      icon: '👁️',
      sub: 'Stephen Strange // Earth-616',
      msg: '"I looked forward in time to see 14,000,605 futures. In every single one of them, you had an absolutely legendary birthday."',
      color: '#FFD84A'
    },
    {
      hero: 'Captain America',
      icon: '🛡️',
      sub: 'Steve Rogers // Earth-199999',
      msg: '"I could do this all day, but today is all about celebrating you. Keep fighting the good fight. Happy Birthday, Avenger."',
      color: '#00F5FF'
    },
    {
      hero: 'Star-Lord',
      icon: '🎧',
      sub: 'Peter Quill // Guardians',
      msg: '"Awesome Mix Vol. 3 is playing your tribute track today. Crank up the volume and dance. Have an epic birthday, buddy!"',
      color: '#7F5CFF'
    }
  ];

  return (
    <div className="hall-of-heroes visible">
      <div className="hologram-scanlines" style={{ opacity: 0.1 }} />

      {/* Header */}
      <div className="hall-header">
        <h1 className="hall-title">HALL OF HEROES</h1>
        <p className="hall-subtitle">SEC-616 BIRTHDAY TRIBUTE MODULE</p>
      </div>

      {/* Floating 3D flip memories */}
      <div className="memories-container">
        {memories.map((card, idx) => (
          <div key={idx} className="memory-card-3d">
            <div className="memory-card-inner">
              {/* Front Side */}
              <div 
                className="memory-card-front"
                style={{ borderColor: card.color, boxShadow: `inset 0 0 15px ${card.color}22` }}
              >
                <div className="card-character-icon">{card.icon}</div>
                <div className="card-label" style={{ color: card.color }}>{card.hero}</div>
                <div className="card-universe">{card.sub}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.5, letterSpacing: '2px', marginTop: '10px' }}>
                  HOVER TO DECRYPT
                </div>
              </div>

              {/* Back Side */}
              <div 
                className="memory-card-back"
                style={{ borderColor: card.color, boxShadow: `0 0 25px ${card.color}33` }}
              >
                <p className="card-msg">{card.msg}</p>
                <div 
                  style={{
                    marginTop: '25px', 
                    fontFamily: 'var(--font-hud)', 
                    color: card.color, 
                    fontWeight: 700,
                    letterSpacing: '1px'
                  }}
                >
                  TRANSMISSION SECURED
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline Section */}
      <div className="timeline-section">
        <h3 className="timeline-title">THE LEGEND TIMELINE</h3>
        <div className="timeline-container">
          <div className="timeline-item">
            <div className="timeline-date">PHASE 1 // ARC DETECTED</div>
            <div className="timeline-content">
              Agent Garv's unique genomic signature was first cataloged by S.H.I.E.L.D satellites. Multiverse sensors registered a localized spike in raw power and charisma.
            </div>
          </div>
          
          <div className="timeline-item">
            <div className="timeline-date">PHASE 2 // AVENGER RECRUITMENT</div>
            <div className="timeline-content">
              DNA scan verified level 9 security access. Promoted to Multiverse Command Center Director at Stark Tower. Synchronized Earth-616 quantum states.
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-date">PHASE 3 // THE INFINITY RESET</div>
            <div className="timeline-content">
              Successfully navigated 5 quantum arcade portals, calibrated the reactor, traced strange runes, threw the vibranium shield, shot the trick arrows, beat the synthesizers, and performed the timeline-altering snap.
            </div>
          </div>
        </div>
      </div>

      {/* Ending swell message */}
      <div className="ending-swell-box">
        <p className="ending-text">
          "Across every timeline, every universe, every possibility... there is only one Garv."
        </p>
        <p 
          className="ending-text" 
          style={{ 
            color: 'var(--stark-gold)', 
            fontSize: '2.4rem', 
            fontWeight: 900, 
            letterSpacing: '6px', 
            marginTop: '15px',
            textShadow: '0 0 15px rgba(255, 216, 74, 0.4)'
          }}
        >
          HAPPY BIRTHDAY, LEGEND.
        </p>

        <button className="hud-btn gold assemble-btn" onClick={handleTriggerConfetti}>
          AVENGERS ASSEMBLE
        </button>
      </div>

      {/* Credits Roll */}
      <div className="credits-roll">
        <p style={{ marginBottom: '8px' }}>PRODUCED BY STARK INDUSTRIES</p>
        <p style={{ marginBottom: '8px' }}>DIRECTED BY F.R.I.D.A.Y. AI</p>
        <p>ALL TIMELINES RESTORED // SECURE STATUS VERIFIED</p>
        
        <button 
          className="hud-btn red" 
          onClick={onReset}
          style={{
            marginTop: '40px',
            padding: '6px 16px',
            fontSize: '0.8rem',
            letterSpacing: '1px'
          }}
        >
          RESET TIME LOOP
        </button>
      </div>
    </div>
  );
};

export default HallOfHeroes;
