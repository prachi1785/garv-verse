import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import soundSystem from '../utils/soundSystem';

const MissionBriefingModal = ({ missionKey, onClose }) => {
  const modalRef = useRef(null);

  const missionDetails = {
    Space: {
      name: 'Space Stone Retrieval',
      difficulty: 'Threat Level: Normal',
      time: '60 Seconds',
      objective: 'Swing through the Stark City high-rise corridors using web anchor lines. Collect glowing spatial tokens and bypass red patrol drones.',
      reward: 'Space Stone (Access to Space coordinates)',
      artColor: '#00F5FF'
    },
    Mind: {
      name: 'Mind Stone Acquisition',
      difficulty: 'Threat Level: Normal',
      time: '90 Seconds',
      objective: 'Steer the flight patterns of the Mark-85 armor suit. Destroy drone networks using Arc beams and grab energy cores.',
      reward: 'Mind Stone (Access to Mind grid frequencies)',
      artColor: '#FFD84A'
    },
    Reality: {
      name: 'Reality Stone Stabilization',
      difficulty: 'Threat Level: High',
      time: '120 Seconds',
      objective: 'Harness the vibranium shield ricochet paths. Destroy crates and clear incoming defense bots to unlock Reality signatures.',
      reward: 'Reality Stone (Access to Aether grid codes)',
      artColor: '#E62429'
    },
    Power: {
      name: 'Power Stone Calibration',
      difficulty: 'Threat Level: Normal',
      time: '3 Laps',
      objective: 'Navigate the Stark Kart speed racer. Perform drift maneuvers to slide curves, gain Nitro multipliers, and beat the AI opponent bot.',
      reward: 'Power Stone (Gauntlet energy multiplier)',
      artColor: '#7F5CFF'
    },
    Time: {
      name: 'Time Stone Manipulation',
      difficulty: 'Threat Level: Extreme',
      time: 'Endless Rush',
      objective: 'Drive the flaming motorcycle through vertical highway traffic. Collect Nitro canisters and dodge vehicle obstacles to bypass timeline anomalies.',
      reward: 'Time Stone (Temporal alignment matrix)',
      artColor: '#00FF66'
    },
    Soul: {
      name: 'Soul Stone Sacrifice',
      difficulty: 'Threat Level: Extreme',
      time: 'Progress Run',
      objective: 'Jump spikes in the rhythm platforms. Pass through gravity portals to walk upside-down and teleport between lanes.',
      reward: 'Soul Stone (Gauntlet bio-signature match)',
      artColor: '#FF9900'
    },
    Legend: {
      name: 'Ultron Survival Training',
      difficulty: 'Threat Level: Critical',
      time: '90 Seconds',
      objective: 'Survive in a top-down cyber arena. Move in 360 vectors and fire rapid lasers. Grab EMP, shield, and quad weapon upgrades.',
      reward: 'S.H.I.E.L.D Legend Trophy (Access to Thanos Gates)',
      artColor: '#FFD84A'
    },
    Final: {
      name: 'Avengers Final Stand',
      difficulty: 'Threat Level: Omega-level',
      time: 'Final Confrontation',
      objective: 'Assemble Iron Man, Captain America, and Thor to defeat Thanos. Cycle weapons dynamically to stun, AoE, or slice his defense bars.',
      reward: 'Final Snap Key (Activates Gauntlet Snapper)',
      artColor: '#FFFFFF'
    }
  };

  const details = missionDetails[missionKey] || {
    name: 'Unknown Mission',
    difficulty: 'Unknown',
    time: 'N/A',
    objective: 'Unknown simulation coordinates.',
    reward: 'None',
    artColor: '#ffd84a'
  };

  useEffect(() => {
    soundSystem.playPortalSwoosh();
    
    // Entrance animations
    gsap.fromTo(modalRef.current,
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, ease: 'power3.out' }
    );
  }, [missionKey]);

  const handleClose = () => {
    soundSystem.playClick();
    gsap.to(modalRef.current, {
      scale: 0.8,
      opacity: 0,
      duration: 0.3,
      ease: 'power3.in',
      onComplete: onClose
    });
  };

  return (
    <div 
      className="portal-modal-overlay" 
      style={{ 
        zIndex: 1060, 
        backgroundColor: 'rgba(5, 7, 11, 0.85)', 
        backdropFilter: 'blur(8px)' 
      }}
    >
      <div 
        ref={modalRef}
        style={{
          width: '90%',
          maxWidth: '550px',
          backgroundColor: '#05070b',
          border: `2px solid ${details.artColor}`,
          borderRadius: '8px',
          boxShadow: `0 0 30px ${details.artColor}33`,
          padding: '25px',
          color: '#fff',
          fontFamily: 'var(--font-hud)',
          position: 'relative'
        }}
      >
        {/* Hologram scan line */}
        <div className="hologram-scanlines" />

        {/* Title */}
        <div 
          style={{ 
            fontSize: '1.6rem', 
            fontWeight: 900, 
            letterSpacing: '3px', 
            color: details.artColor,
            textShadow: `0 0 10px ${details.artColor}66`
          }}
        >
          {details.name.toUpperCase()}
        </div>
        <div style={{ fontSize: '0.75rem', opacity: 0.5, letterSpacing: '4px', marginTop: '4px', marginBottom: '15px' }}>
          S.H.I.E.L.D. COMMAND DIRECTIVE
        </div>

        {/* Unique Blueprint Artwork using SVGs */}
        <div 
          style={{ 
            width: '100%', 
            height: '120px', 
            border: '1px solid rgba(255, 255, 255, 0.08)', 
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '4px',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <svg width="100%" height="100%" style={{ position: 'absolute', pointerEvents: 'none' }}>
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          
          {/* Animated Hologram Core Blueprint shape */}
          <div 
            style={{
              width: '50px',
              height: '50px',
              border: `2px solid ${details.artColor}`,
              borderRadius: '50%',
              boxShadow: `0 0 20px ${details.artColor}`,
              animation: 'pulseGlow 2s infinite alternate',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative'
            }}
          >
            <div 
              style={{
                width: '30px',
                height: '30px',
                border: '1px dashed #fff',
                borderRadius: '50%',
                animation: 'spin 12s linear infinite'
              }}
            />
            <div style={{ position: 'absolute', color: '#fff', fontSize: '0.9rem' }}>🛡️</div>
          </div>
        </div>

        {/* Specifications List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.92rem', marginBottom: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
            <span style={{ opacity: 0.6 }}>DIFFICULTY PROFILE:</span>
            <span style={{ color: '#ffd84a', fontWeight: 700 }}>{details.difficulty}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
            <span style={{ opacity: 0.6 }}>ESTIMATED DURATION:</span>
            <span style={{ color: '#00f5ff' }}>{details.time}</span>
          </div>
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
            <span style={{ opacity: 0.6, display: 'block', marginBottom: '4px' }}>MISSION OBJECTIVE:</span>
            <span style={{ fontSize: '0.85rem', lineHeight: '1.4', opacity: 0.9 }}>{details.objective}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
            <span style={{ opacity: 0.6 }}>ACQUISITION REWARD:</span>
            <span style={{ color: '#00ff66', fontWeight: 700 }}>{details.reward}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button 
            className="hud-btn" 
            disabled 
            style={{ 
              opacity: 0.5, 
              cursor: 'not-allowed', 
              borderColor: '#ffd84a', 
              color: '#ffd84a' 
            }}
          >
            BEGIN MISSION (Coming Soon)
          </button>
          <button className="hud-btn" onClick={handleClose}>
            RETURN
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissionBriefingModal;
