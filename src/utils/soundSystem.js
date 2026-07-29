// Programmatic Sound System using Web Audio API
// This avoids downloading heavy audio files and guarantees 100% availability.

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.masterVolume = null;
    this.ambientOsc1 = null;
    this.ambientOsc2 = null;
    this.ambientFilter = null;
    this.muted = false;

    // Procedural wind nodes
    this.windNode = null;
    this.windFilter = null;
    this.windGain = null;
    this.windLfo = null;

    // Heartbeat timers
    this.heartbeatTimer = null;
  }

  init() {
    if (this.ctx) return;
    
    // Create Audio Context
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // Handle tab-switching / backgrounding gracefully (Sprint 8)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (this.ctx && this.ctx.state === 'running') {
          this.ctx.suspend();
        }
      } else {
        if (this.ctx && this.ctx.state === 'suspended' && !this.muted) {
          this.ctx.resume().catch(() => {});
        }
      }
    });
    
    // Create Master Gain Node
    this.masterVolume = this.ctx.createGain();
    this.masterVolume.gain.setValueAtTime(0.3, this.ctx.currentTime);
    this.masterVolume.connect(this.ctx.destination);
    
    // Start ambient background hum
    this.startAmbientHum();
  }

  setMute(isMuted) {
    this.muted = isMuted;
    if (!this.ctx) return;
    
    const targetVal = isMuted ? 0 : 0.3;
    this.masterVolume.gain.setValueAtTime(this.masterVolume.gain.value, this.ctx.currentTime);
    this.masterVolume.gain.linearRampToValueAtTime(targetVal, this.ctx.currentTime + 0.1);
  }

  // Deep Stark Laboratory Ambient Hum
  startAmbientHum() {
    if (this.muted) return;
    try {
      this.ambientFilter = this.ctx.createBiquadFilter();
      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.setValueAtTime(120, this.ctx.currentTime);
      this.ambientFilter.connect(this.masterVolume);

      // Low oscillator 1
      this.ambientOsc1 = this.ctx.createOscillator();
      this.ambientOsc1.type = 'sawtooth';
      this.ambientOsc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note
      
      const oscGain1 = this.ctx.createGain();
      oscGain1.gain.setValueAtTime(0.04, this.ctx.currentTime);
      this.ambientOsc1.connect(oscGain1);
      oscGain1.connect(this.ambientFilter);

      // Low oscillator 2 (slightly detuned)
      this.ambientOsc2 = this.ctx.createOscillator();
      this.ambientOsc2.type = 'triangle';
      this.ambientOsc2.frequency.setValueAtTime(55.3, this.ctx.currentTime);
      
      const oscGain2 = this.ctx.createGain();
      oscGain2.gain.setValueAtTime(0.06, this.ctx.currentTime);
      this.ambientOsc2.connect(oscGain2);
      oscGain2.connect(this.ambientFilter);

      // Filter cutoff modulation (LFO)
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime); // slow wave
      
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(30, this.ctx.currentTime); // modulate cutoff by +/- 30Hz
      
      lfo.connect(lfoGain);
      lfoGain.connect(this.ambientFilter.frequency);

      this.ambientOsc1.start();
      this.ambientOsc2.start();
      lfo.start();
    } catch (e) {
      console.error("Ambient hum failed to start:", e);
    }
  }

  // Skyline Wind Ambience
  startWindAmbience() {
    if (!this.ctx || this.muted || this.windNode) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2.0;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.windNode = this.ctx.createBufferSource();
      this.windNode.buffer = buffer;
      this.windNode.loop = true;

      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'lowpass';
      this.windFilter.frequency.setValueAtTime(350, this.ctx.currentTime);

      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      // Modulate wind cutoff frequency slowly
      this.windLfo = this.ctx.createOscillator();
      this.windLfo.type = 'sine';
      this.windLfo.frequency.setValueAtTime(0.15, this.ctx.currentTime);

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(150, this.ctx.currentTime);

      this.windLfo.connect(lfoGain);
      lfoGain.connect(this.windFilter.frequency);

      this.windNode.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.masterVolume);

      this.windNode.start();
      this.windLfo.start();
      console.log('[DEBUG] SoundSystem: Ambient wind loop started');
    } catch (e) {
      console.error("Failed to start wind ambience:", e);
    }
  }

  stopWindAmbience() {
    if (this.windNode) {
      try {
        this.windNode.stop();
        this.windLfo.stop();
      } catch (e) {}
      this.windNode = null;
      this.windLfo = null;
      console.log('[DEBUG] SoundSystem: Ambient wind loop stopped');
    }
  }

  // Low-Health Warning Heartbeat
  startHeartbeat() {
    if (!this.ctx || this.muted || this.heartbeatTimer) return;
    console.log('[DEBUG] SoundSystem: Low health heartbeat alert active');
    
    const triggerBeep = () => {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      
      const thump = (timeOffset) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now + timeOffset);
        osc.frequency.exponentialRampToValueAtTime(30, now + timeOffset + 0.15);

        gain.gain.setValueAtTime(0.35, now + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.15);

        osc.connect(gain);
        gain.connect(this.masterVolume);
        osc.start(now + timeOffset);
        osc.stop(now + timeOffset + 0.16);
      };
      
      thump(0);
      thump(0.22);
    };

    triggerBeep();
    this.heartbeatTimer = setInterval(triggerBeep, 1100);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      console.log('[DEBUG] SoundSystem: Heartbeat alert stopped');
    }
  }

  // Short Stark HUD tick for hovers
  playTick() {
    if (!this.ctx || this.muted) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    // Frequency sweeps down quickly
    osc.frequency.setValueAtTime(1800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(this.masterVolume);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  // Stark HUD click select sound
  playClick() {
    if (!this.ctx || this.muted) return;
    
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterVolume);
    
    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.16);
    osc2.stop(this.ctx.currentTime + 0.16);
  }

  // Portal swooshing magic sound
  playPortalSwoosh() {
    if (!this.ctx || this.muted) return;
    
    const bufferSize = this.ctx.sampleRate * 1.5; // 1.5 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill buffer with white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(5, this.ctx.currentTime);
    
    // Swirling frequency sweep
    filter.frequency.setValueAtTime(100, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2500, this.ctx.currentTime + 0.7);
    filter.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 1.5);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);
    
    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume);
    
    noiseNode.start();
    noiseNode.stop(this.ctx.currentTime + 1.5);
  }

  // Infinity stone socketing chime
  playStoneSocket() {
    if (!this.ctx || this.muted) return;
    
    const now = this.ctx.currentTime;
    
    // Metallic resonant notes (FM Synthesis feel)
    const frequencies = [523.25, 659.25, 783.99, 987.77, 1318.51]; // C5, E5, G5, B5, E6
    
    frequencies.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = index % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);
      
      // Pitch bend upwards
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + index * 0.08 + 0.4);
      
      gain.gain.setValueAtTime(0, now + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.08, now + index * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.6);
      
      osc.connect(gain);
      gain.connect(this.masterVolume);
      
      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.7);
    });
    
    // Exploding bass impact
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(110, now);
    bassOsc.frequency.linearRampToValueAtTime(30, now + 0.6);
    
    const bassFilter = this.ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.setValueAtTime(200, now);
    bassFilter.frequency.exponentialRampToValueAtTime(40, now + 0.6);
    
    bassGain.gain.setValueAtTime(0.25, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    
    bassOsc.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(this.masterVolume);
    
    bassOsc.start(now);
    bassOsc.stop(now + 0.6);
  }

  // Giant snap explosion with dust settling sound
  playSnap() {
    if (!this.ctx || this.muted) return;
    
    const now = this.ctx.currentTime;
    
    // 1. High frequency click (snap friction)
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(2500, now);
    snapOsc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
    
    snapGain.gain.setValueAtTime(0.3, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    snapOsc.connect(snapGain);
    snapGain.connect(this.masterVolume);
    snapOsc.start(now);
    snapOsc.stop(now + 0.1);

    // 2. Giant sub-bass impact and explosion rumble
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(90, now);
    subOsc.frequency.linearRampToValueAtTime(20, now + 2.5);
    
    const subFilter = this.ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(150, now);
    subFilter.frequency.exponentialRampToValueAtTime(30, now + 2.5);
    
    subGain.gain.setValueAtTime(0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    
    subOsc.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(this.masterVolume);
    
    subOsc.start(now);
    subOsc.stop(now + 2.6);

    // 3. Fading noise (cosmic dust dispersing)
    const bufferSize = this.ctx.sampleRate * 3.0; // 3 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const dustNode = this.ctx.createBufferSource();
    dustNode.buffer = buffer;
    
    const dustFilter = this.ctx.createBiquadFilter();
    dustFilter.type = 'bandpass';
    dustFilter.Q.setValueAtTime(3, now);
    dustFilter.frequency.setValueAtTime(800, now);
    dustFilter.frequency.exponentialRampToValueAtTime(80, now + 3.0);
    
    const dustGain = this.ctx.createGain();
    dustGain.gain.setValueAtTime(0.18, now);
    dustGain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
    
    dustNode.connect(dustFilter);
    dustFilter.connect(dustGain);
    dustGain.connect(this.masterVolume);
    
    dustNode.start(now);
    dustNode.stop(now + 3.0);
  }

  // Triumphant synthesized Avengers-inspired Fanfare
  playAvengersFanfare() {
    if (!this.ctx || this.muted) return;
    
    const now = this.ctx.currentTime;
    
    // Theme sequence: A3 -> C4 -> D4 -> A4 -> G4 -> F4 -> E4...
    const notes = [
      [220.00, 0.4, 0.0],  // A3 (intro base)
      [220.00, 0.4, 0.5],  // A3
      [220.00, 0.4, 1.0],  // A3
      [261.63, 0.3, 1.5],  // C4
      [293.66, 0.3, 1.8],  // D4
      [440.00, 0.8, 2.1],  // A4 (triumphant swell!)
      [392.00, 0.4, 3.0],  // G4
      [349.23, 0.4, 3.5],  // F4
      [329.63, 0.8, 4.0]   // E4 (resolved chords)
    ];

    notes.forEach(([freq, duration, delay]) => {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, now + delay);
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 1.005, now + delay); // detuned
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(100, now + delay);
      filter.frequency.exponentialRampToValueAtTime(1800, now + delay + 0.1);
      filter.frequency.linearRampToValueAtTime(300, now + delay + duration);
      
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.08); // attack
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterVolume);
      
      osc1.start(now + delay);
      osc2.start(now + delay);
      
      osc1.stop(now + delay + duration + 0.1);
      osc2.stop(now + delay + duration + 0.1);
    });
  }
}

const soundSystem = new SoundSystem();
export default soundSystem;
