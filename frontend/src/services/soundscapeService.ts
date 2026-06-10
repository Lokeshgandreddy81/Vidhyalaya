class SoundscapeService {
  private ctx: AudioContext | null = null;
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;
  private leftGain: GainNode | null = null;
  private rightGain: GainNode | null = null;
  private merger: ChannelMergerNode | null = null;
  private mainGain: GainNode | null = null;
  private rainNode: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private synthInterval: any = null;
  private synthGain: GainNode | null = null;
  private lastVolume: number = 0.5;

  public activeTracks = {
    binaural: false,
    rain: false,
    synth: false
  };

  constructor() {
    try {
      const savedVol = localStorage.getItem('vidyalai_soundscape_volume');
      if (savedVol) {
        this.lastVolume = parseFloat(savedVol);
      }
    } catch {}

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.resumeContextIfNeeded();
        }
      });
      window.addEventListener('focus', () => {
        this.resumeContextIfNeeded();
      });
    }
  }

  private resumeContextIfNeeded() {
    const hasActiveTracks = this.activeTracks.binaural || this.activeTracks.rain || this.activeTracks.synth;
    if (this.ctx && this.ctx.state === 'suspended' && hasActiveTracks) {
      this.ctx.resume().catch(err => {
        console.warn('[SoundscapeService] Failed to auto-resume on focus:', err);
      });
    }
  }

  private init() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;

      // If the context is suspended and there are no active tracks,
      // it might have been created without a gesture or locked.
      // Recreating it inside the current click handler guarantees it is unlocked.
      const isSuspendedWithNoActiveTracks = 
        this.ctx && 
        this.ctx.state === 'suspended' && 
        !this.activeTracks.binaural && 
        !this.activeTracks.rain && 
        !this.activeTracks.synth;

      if (!this.ctx || this.ctx.state === 'closed' || isSuspendedWithNoActiveTracks) {
        this.cleanupAllNodes();
        if (this.ctx) {
          try { this.ctx.close(); } catch {}
        }
        this.ctx = new AudioCtx();
        this.mainGain = this.ctx.createGain();
        this.mainGain.gain.setValueAtTime(this.lastVolume, this.ctx.currentTime);
        this.mainGain.connect(this.ctx.destination);
      }

      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(err => {
          console.warn('[SoundscapeService] Failed to resume AudioContext:', err);
        });
      }
    } catch (e) {
      console.error('[SoundscapeService] Failed to initialize AudioContext:', e);
    }
  }

  private cleanupAllNodes() {
    if (this.leftOsc) { try { this.leftOsc.stop(); } catch {} this.leftOsc = null; }
    if (this.rightOsc) { try { this.rightOsc.stop(); } catch {} this.rightOsc = null; }
    if (this.leftGain) { try { this.leftGain.disconnect(); } catch {} this.leftGain = null; }
    if (this.rightGain) { try { this.rightGain.disconnect(); } catch {} this.rightGain = null; }
    if (this.merger) { try { this.merger.disconnect(); } catch {} this.merger = null; }

    if (this.rainNode) { try { this.rainNode.stop(); } catch {} this.rainNode = null; }
    if (this.rainGain) { try { this.rainGain.disconnect(); } catch {} this.rainGain = null; }

    if (this.synthInterval) { clearInterval(this.synthInterval); this.synthInterval = null; }
    if (this.synthGain) { try { this.synthGain.disconnect(); } catch {} this.synthGain = null; }

    if (this.breathingOsc) { try { this.breathingOsc.stop(); } catch {} this.breathingOsc = null; }
    if (this.breathingFilter) { try { this.breathingFilter.disconnect(); } catch {} this.breathingFilter = null; }
    if (this.breathingGain) { try { this.breathingGain.disconnect(); } catch {} this.breathingGain = null; }
  }

  public setVolume(vol: number) {
    this.lastVolume = vol;
    if (this.ctx) {
      this.init();
      if (this.mainGain) {
        this.mainGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
      }
    }
  }

  public toggleBinaural(active: boolean) {
    if (!active && !this.ctx) return;
    this.init();
    if (!this.ctx || !this.mainGain) return;

    if (active) {
      if (this.leftOsc) return; // Already running

      // Left Channel Oscillator (100 Hz)
      this.leftOsc = this.ctx.createOscillator();
      this.leftOsc.frequency.setValueAtTime(100, this.ctx.currentTime);
      this.leftGain = this.ctx.createGain();
      this.leftGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.leftOsc.connect(this.leftGain);

      // Right Channel Oscillator (140 Hz for 40 Hz Binaural Beat)
      this.rightOsc = this.ctx.createOscillator();
      this.rightOsc.frequency.setValueAtTime(140, this.ctx.currentTime);
      this.rightGain = this.ctx.createGain();
      this.rightGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.rightOsc.connect(this.rightGain);

      // Channel Merger Node
      this.merger = this.ctx.createChannelMerger(2);
      this.leftGain.connect(this.merger, 0, 0); // Left input to Left output
      this.rightGain.connect(this.merger, 0, 1); // Right input to Right output

      this.merger.connect(this.mainGain);

      this.leftOsc.start();
      this.rightOsc.start();
      this.activeTracks.binaural = true;
    } else {
      if (this.leftOsc) {
        try { this.leftOsc.stop(); } catch {}
        this.leftOsc = null;
      }
      if (this.rightOsc) {
        try { this.rightOsc.stop(); } catch {}
        this.rightOsc = null;
      }
      // Bug 1 fix: disconnect gain/merger nodes from graph to prevent dangling refs
      if (this.leftGain) { try { this.leftGain.disconnect(); } catch {} this.leftGain = null; }
      if (this.rightGain) { try { this.rightGain.disconnect(); } catch {} this.rightGain = null; }
      if (this.merger) { try { this.merger.disconnect(); } catch {} this.merger = null; }
      this.activeTracks.binaural = false;
    }
  }

  public toggleRain(active: boolean) {
    if (!active && !this.ctx) return;
    this.init();
    if (!this.ctx || !this.mainGain) return;

    if (active) {
      if (this.rainNode) return;

      // Synthesize Pink/Brown Noise for Rain
      const bufferSize = 4 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Simple Brown/Pink noise filter
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Gain compensation
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // Lowpass filter to make it sound like rain on glass/leaves
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

      noiseSource.connect(filter);
      filter.connect(this.rainGain);
      this.rainGain.connect(this.mainGain);

      noiseSource.start();
      this.rainNode = noiseSource;
      this.activeTracks.rain = true;
    } else {
      if (this.rainNode) {
        try { this.rainNode.stop(); } catch {}
        this.rainNode = null;
      }
      // Bug 1 fix: disconnect rain gain from graph
      if (this.rainGain) { try { this.rainGain.disconnect(); } catch {} this.rainGain = null; }
      this.activeTracks.rain = false;
    }
  }

  public toggleSynth(active: boolean) {
    if (!active && !this.ctx) return;
    this.init();
    if (!this.ctx || !this.mainGain) return;

    if (active) {
      if (this.synthInterval) return;

      this.synthGain = this.ctx.createGain();
      this.synthGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      this.synthGain.connect(this.mainGain);

      // Infinite ambient pulsing notes
      const playPulsingNote = () => {
        if (!this.ctx || !this.synthGain) return;
        const notes = [110, 165, 220, 330, 440]; // Low frequency ambient chord (A minor/C major extensions)
        const freq = notes[Math.floor(Math.random() * notes.length)];
        
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 3.0); // Slow attack
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 8.0); // Long decay

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, this.ctx.currentTime);

        osc.connect(gainNode);
        gainNode.connect(filter);
        filter.connect(this.synthGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 8.5);

        // Bug 2 fix: disconnect sub-nodes after oscillator ends to prevent stacking leaks
        osc.onended = () => {
          try { gainNode.disconnect(); } catch {}
          try { filter.disconnect(); } catch {}
        };
      };

      playPulsingNote();
      this.synthInterval = setInterval(playPulsingNote, 5000);
      this.activeTracks.synth = true;
    } else {
      if (this.synthInterval) {
        clearInterval(this.synthInterval);
        this.synthInterval = null;
      }
      if (this.synthGain) {
        try { this.synthGain.disconnect(); } catch {}
        this.synthGain = null;
      }
      this.activeTracks.synth = false;
    }
  }

  private breathingOsc: OscillatorNode | null = null;
  private breathingFilter: BiquadFilterNode | null = null;
  private breathingGain: GainNode | null = null;

  public playBreathingHum(phase: 'inhale' | 'hold_in' | 'exhale' | 'hold_out' | 'stop') {
    if (phase === 'stop' && !this.ctx) return;
    this.init();
    if (!this.ctx || !this.mainGain) return;

    if (phase === 'stop') {
      if (this.breathingOsc) {
        try { this.breathingOsc.stop(); } catch {}
        try { this.breathingOsc.disconnect(); } catch {}
        this.breathingOsc = null;
      }
      if (this.breathingFilter) {
        try { this.breathingFilter.disconnect(); } catch {}
        this.breathingFilter = null;
      }
      if (this.breathingGain) {
        try { this.breathingGain.disconnect(); } catch {}
        this.breathingGain = null;
      }
      return;
    }

    if (!this.breathingOsc) {
      this.breathingOsc = this.ctx.createOscillator();
      this.breathingOsc.type = 'triangle';
      this.breathingOsc.frequency.setValueAtTime(60, this.ctx.currentTime); // Grounding 60Hz hum

      this.breathingFilter = this.ctx.createBiquadFilter();
      this.breathingFilter.type = 'lowpass';
      this.breathingFilter.frequency.setValueAtTime(200, this.ctx.currentTime);

      this.breathingGain = this.ctx.createGain();
      this.breathingGain.gain.setValueAtTime(0.01, this.ctx.currentTime);

      this.breathingOsc.connect(this.breathingFilter);
      this.breathingFilter.connect(this.breathingGain);
      this.breathingGain.connect(this.mainGain);
      this.breathingOsc.start();
    }

    const t = this.ctx.currentTime;
    if (phase === 'inhale' && this.breathingGain && this.breathingFilter) {
      this.breathingGain.gain.cancelScheduledValues(t);
      this.breathingGain.gain.linearRampToValueAtTime(0.35, t + 4.0);
      this.breathingFilter.frequency.cancelScheduledValues(t);
      this.breathingFilter.frequency.exponentialRampToValueAtTime(450, t + 4.0);
    } else if (phase === 'exhale' && this.breathingGain && this.breathingFilter) {
      this.breathingGain.gain.cancelScheduledValues(t);
      this.breathingGain.gain.linearRampToValueAtTime(0.05, t + 4.0);
      this.breathingFilter.frequency.cancelScheduledValues(t);
      this.breathingFilter.frequency.exponentialRampToValueAtTime(150, t + 4.0);
    } else if (phase === 'hold_in' && this.breathingGain) {
      this.breathingGain.gain.cancelScheduledValues(t);
      this.breathingGain.gain.setValueAtTime(0.35, t);
    } else if (phase === 'hold_out' && this.breathingGain) {
      this.breathingGain.gain.cancelScheduledValues(t);
      this.breathingGain.gain.setValueAtTime(0.05, t);
    }
  }

  public playSpeedrunSound(type: 'correct' | 'wrong' | 'streak') {
    this.init();
    if (!this.ctx || !this.mainGain) return;

    const t = this.ctx.currentTime;
    if (type === 'correct') {
      // Ascending C5-E5 chime
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, t); // C5
      osc2.frequency.setValueAtTime(659.25, t + 0.1); // E5

      gainNode.gain.setValueAtTime(0.15, t);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.mainGain);

      osc1.start(t);
      osc2.start(t + 0.1);
      osc1.stop(t + 0.5);
      osc2.stop(t + 0.5);

      osc2.onended = () => {
        try { osc1.disconnect(); } catch {}
        try { osc2.disconnect(); } catch {}
        try { gainNode.disconnect(); } catch {}
      };
    } else if (type === 'wrong') {
      // Descending buzzer hum
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.linearRampToValueAtTime(100, t + 0.3);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, t);

      gainNode.gain.setValueAtTime(0.12, t);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.mainGain);

      osc.start(t);
      osc.stop(t + 0.35);

      osc.onended = () => {
        try { osc.disconnect(); } catch {}
        try { filter.disconnect(); } catch {}
        try { gainNode.disconnect(); } catch {}
      };
    } else if (type === 'streak') {
      // Major arpeggio streak sweep
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);

        gainNode.gain.setValueAtTime(0.1, t + idx * 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.3);

        osc.connect(gainNode);
        gainNode.connect(this.mainGain);

        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.35);

        osc.onended = () => {
          try { osc.disconnect(); } catch {}
          try { gainNode.disconnect(); } catch {}
        };
      });
    }
  }

  public stopAll() {
    this.toggleBinaural(false);
    this.toggleRain(false);
    this.toggleSynth(false);
    this.playBreathingHum('stop');
  }
}

export const soundscape = new SoundscapeService();
