import React from 'react';

const InfinityGauntlet = ({ stones = {}, snapKey = false, onSnapTrigger }) => {
  const stonesConfig = [
    { name: 'Space', color: '#00F5FF', glow: 'rgba(0, 245, 255, 0.8)', rgb: '0, 245, 255' },
    { name: 'Mind', color: '#FFD84A', glow: 'rgba(255, 216, 74, 0.8)', rgb: '255, 216, 74' },
    { name: 'Reality', color: '#E62429', glow: 'rgba(230, 36, 41, 0.8)', rgb: '230, 36, 41' },
    { name: 'Power', color: '#7F5CFF', glow: 'rgba(127, 92, 255, 0.8)', rgb: '127, 92, 255' },
    { name: 'Time', color: '#00FF66', glow: 'rgba(0, 255, 102, 0.8)', rgb: '0, 255, 102' },
    { name: 'Soul', color: '#FF9900', glow: 'rgba(255, 153, 0, 0.8)', rgb: '255, 153, 0' }
  ];

  const allCollected = stonesConfig.every(stone => stones[stone.name]);

  return (
    <div className="gauntlet-panel">
      <div className="gauntlet-title">INFINITY GAUNTLET SOCKETS</div>
      
      <div className="gauntlet-sockets-row">
        {stonesConfig.map((stone) => {
          const collected = stones[stone.name];
          return (
            <div 
              key={stone.name}
              className={`gauntlet-socket ${collected ? 'active' : ''}`}
              style={{
                '--stone-color': stone.color,
                '--stone-glow': stone.glow,
                '--stone-rgb': stone.rgb
              }}
              title={`${stone.name} Stone - ${collected ? 'SOCKETED' : 'DORMANT'}`}
            >
              {collected && (
                <div 
                  className="stone-gem"
                  style={{
                    '--stone-color': stone.color
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {allCollected && snapKey && (
        <div className="snap-trigger-container">
          <div className="snap-trigger-text">SNAP KEY AUTHORIZED // GAUNTLET FULLY CHARGED</div>
          <button 
            className="hud-btn red" 
            style={{
              padding: '12px 36px',
              fontSize: '1.2rem',
              boxShadow: '0 0 25px rgba(230, 36, 41, 0.6), inset 0 0 10px rgba(230, 36, 41, 0.3)',
              borderWidth: '2px'
            }}
            onClick={onSnapTrigger}
          >
            PERFORM THE SNAP
          </button>
        </div>
      )}
      
      {allCollected && !snapKey && (
        <div className="snap-trigger-container">
          <div className="snap-trigger-text" style={{ color: '#FFD84A' }}>
            ALL STONES COLLECTED // DEFEAT THANOS TO AUTHORIZE SNAP KEY
          </div>
        </div>
      )}
    </div>
  );
};

export default InfinityGauntlet;
