/**
 * Web Audio Engine for Heavy Haul 3D
 * Synthesizes realistic diesel engine RPM, air brakes, dual pneumatic horn,
 * mechanical blinker relay clicks, and an interactive multi-station FM radio.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private radioGain: GainNode | null = null;

  // Engine synth nodes
  private engineGain: GainNode | null = null;
  private oscBase: OscillatorNode | null = null;
  private oscRumble: OscillatorNode | null = null;
  private oscTurbo: OscillatorNode | null = null;
  private turboGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private isEngineRunning: boolean = false;

  // Horn nodes
  private hornGain: GainNode | null = null;
  private hornOsc1: OscillatorNode | null = null;
  private hornOsc2: OscillatorNode | null = null;
  private isHornPlaying: boolean = false;

  // Radio synthesizer
  private currentStationIndex: number = 1; // 0: Off, 1: Lo-Fi, 2: Synthwave, 3: Country Rock
  private radioInterval: number | null = null;
  private radioStep: number = 0;

  // Volumes
  private sfxVolume: number = 0.8;
  private radioVolume: number = 0.6;

  public init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.radioGain = this.ctx.createGain();
    this.radioGain.gain.setValueAtTime(this.radioVolume, this.ctx.currentTime);
    this.radioGain.connect(this.masterGain);

    this.setupEngineSynth();
    this.startRadioTrack();
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private setupEngineSynth() {
    if (!this.ctx || !this.sfxGain) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(260, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    // Primary cylinder firing saw oscillator
    this.oscBase = this.ctx.createOscillator();
    this.oscBase.type = 'sawtooth';
    this.oscBase.frequency.setValueAtTime(32, this.ctx.currentTime);

    // Sub-bass rumble triangle oscillator
    this.oscRumble = this.ctx.createOscillator();
    this.oscRumble.type = 'triangle';
    this.oscRumble.frequency.setValueAtTime(16, this.ctx.currentTime);

    // Turbocharger high pitch whistle
    this.oscTurbo = this.ctx.createOscillator();
    this.oscTurbo.type = 'sine';
    this.oscTurbo.frequency.setValueAtTime(950, this.ctx.currentTime);

    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.oscTurbo.connect(this.turboGain);
    this.turboGain.connect(this.sfxGain);

    this.oscBase.connect(this.engineFilter);
    this.oscRumble.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.oscBase.start();
    this.oscRumble.start();
    this.oscTurbo.start();
  }

  public updateEngineSound(rpm: number, throttle: number, engineStarted: boolean) {
    if (!this.ctx || !this.engineGain || !this.oscBase || !this.oscRumble || !this.engineFilter || !this.oscTurbo || !this.turboGain) return;

    if (!engineStarted) {
      this.engineGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.1);
      this.turboGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.1);
      this.isEngineRunning = false;
      return;
    }

    this.isEngineRunning = true;

    // RPM ranges from ~650 (idle) to ~2600 (diesel redline)
    const normalizedRPM = Math.max(650, Math.min(2600, rpm));
    const baseFreq = 22 + (normalizedRPM / 2600) * 58; // 22Hz to 80Hz
    const filterFreq = 180 + (normalizedRPM / 2600) * 550 + throttle * 400; // Cutoff opens with load
    const turboFreq = 800 + (normalizedRPM / 2600) * 1400; // 800Hz to 2200Hz
    const turboVol = Math.max(0, throttle * 0.08 * (normalizedRPM / 2600));

    const t = this.ctx.currentTime;
    this.oscBase.frequency.setTargetAtTime(baseFreq, t, 0.04);
    this.oscRumble.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.04);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.05);

    this.oscTurbo.frequency.setTargetAtTime(turboFreq, t, 0.08);
    this.turboGain.gain.setTargetAtTime(turboVol, t, 0.08);

    const masterEngineVol = 0.35 + throttle * 0.25;
    this.engineGain.gain.setTargetAtTime(masterEngineVol, t, 0.05);
  }

  public playAirBrake() {
    if (!this.ctx || !this.sfxGain) return;
    this.resume();

    // Air release burst (white noise through bandpass filter with quick decay)
    const bufferSize = this.ctx.sampleRate * 0.35;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.32);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    whiteNoise.start(t);
  }

  public setHorn(active: boolean) {
    if (!this.ctx || !this.sfxGain) return;
    this.resume();

    if (active && !this.isHornPlaying) {
      this.isHornPlaying = true;
      this.hornGain = this.ctx.createGain();
      this.hornGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.hornGain.gain.linearRampToValueAtTime(0.45, this.ctx.currentTime + 0.05);

      this.hornOsc1 = this.ctx.createOscillator();
      this.hornOsc2 = this.ctx.createOscillator();

      this.hornOsc1.type = 'sawtooth';
      this.hornOsc2.type = 'sawtooth';

      // Authentic resonant dual-tone truck horn (F3 and G#3 chord)
      this.hornOsc1.frequency.setValueAtTime(174.6, this.ctx.currentTime);
      this.hornOsc2.frequency.setValueAtTime(207.6, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, this.ctx.currentTime);

      this.hornOsc1.connect(filter);
      this.hornOsc2.connect(filter);
      filter.connect(this.hornGain);
      this.hornGain.connect(this.sfxGain);

      this.hornOsc1.start();
      this.hornOsc2.start();
    } else if (!active && this.isHornPlaying && this.hornGain) {
      this.isHornPlaying = false;
      const t = this.ctx.currentTime;
      this.hornGain.gain.linearRampToValueAtTime(0.01, t + 0.08);
      setTimeout(() => {
        try {
          this.hornOsc1?.stop();
          this.hornOsc2?.stop();
          this.hornOsc1?.disconnect();
          this.hornOsc2?.disconnect();
        } catch {
          // ignore
        }
      }, 100);
    }
  }

  public playBlinkerClick(highTone: boolean) {
    if (!this.ctx || !this.sfxGain) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(highTone ? 1420 : 980, t);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  public playCrash() {
    if (!this.ctx || !this.sfxGain) return;
    this.resume();

    const bufferSize = this.ctx.sampleRate * 0.6;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    source.start();
  }

  public playSuccessChime() {
    if (!this.ctx || !this.sfxGain) return;
    this.resume();

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  public playIgnition() {
    if (!this.ctx || !this.sfxGain) return;
    this.resume();

    const t = this.ctx.currentTime;
    // Starter motor chug-chug-vroom sequence
    [0, 0.12, 0.24].forEach((delay) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(45, t + delay);
      gain.gain.setValueAtTime(0.22, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, t + delay + 0.08);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + delay);
      osc.stop(t + delay + 0.09);
    });

    // Roar catch at 0.38s
    setTimeout(() => {
      if (!this.ctx || !this.sfxGain) return;
      const roar = this.ctx.createOscillator();
      const roarGain = this.ctx.createGain();
      roar.type = 'triangle';
      const curT = this.ctx.currentTime;
      roar.frequency.setValueAtTime(50, curT);
      roar.frequency.exponentialRampToValueAtTime(110, curT + 0.2);
      roar.frequency.exponentialRampToValueAtTime(60, curT + 0.5);
      roarGain.gain.setValueAtTime(0.35, curT);
      roarGain.gain.exponentialRampToValueAtTime(0.01, curT + 0.55);
      roar.connect(roarGain);
      roarGain.connect(this.sfxGain);
      roar.start(curT);
      roar.stop(curT + 0.56);
    }, 360);
  }

  public playHapticClick() {
    if (!this.ctx || !this.sfxGain) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.04);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // FM Radio Synthesizer
  public setRadioStation(stationIndex: number) {
    this.currentStationIndex = stationIndex;
    this.startRadioTrack();
  }

  public getRadioStation(): number {
    return this.currentStationIndex;
  }

  public setVolumes(sfx: number, radio: number) {
    this.sfxVolume = sfx;
    this.radioVolume = radio;
    if (this.ctx) {
      this.sfxGain?.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.05);
      this.radioGain?.gain.setTargetAtTime(radio, this.ctx.currentTime, 0.05);
    }
  }

  private startRadioTrack() {
    if (this.radioInterval) {
      clearInterval(this.radioInterval);
      this.radioInterval = null;
    }

    if (this.currentStationIndex === 0 || !this.ctx || !this.radioGain) {
      return;
    }

    // Step-sequenced ambient FM radio tracks
    const stepDurationMs = 280;
    this.radioStep = 0;

    this.radioInterval = window.setInterval(() => {
      if (!this.ctx || !this.radioGain || this.currentStationIndex === 0) return;
      this.playRadioStep();
      this.radioStep = (this.radioStep + 1) % 16;
    }, stepDurationMs);
  }

  private playRadioStep() {
    if (!this.ctx || !this.radioGain) return;
    const t = this.ctx.currentTime;
    const step = this.radioStep;

    if (this.currentStationIndex === 1) {
      // Station 1: "Lo-Fi Roadside Beats"
      // Chord progression: Dm7 -> G7 -> Cmaj7 -> Am7
      const bassNotes = [146.8, 146.8, 196.0, 196.0, 130.8, 130.8, 220.0, 220.0];
      if (step % 2 === 0) {
        const bassFreq = bassNotes[(step / 2) % bassNotes.length];
        this.synthBassNote(bassFreq, 0.25, 'sine', 0.15);
      }
      // Hi-hat / rimshot click
      if (step % 2 === 1) {
        this.synthHiHat(0.04, 0.04);
      }
      // Mellow chord stab on beats 0, 4, 8, 12
      if (step % 4 === 0) {
        const chordFrequencies = [
          [293.66, 349.23, 440.0],  // Dm
          [293.66, 392.00, 493.88], // G
          [261.63, 329.63, 392.0],  // C
          [220.00, 261.63, 329.63], // Am
        ][Math.floor(step / 4)];
        chordFrequencies.forEach((f) => this.synthPadNote(f, 0.5, 0.06));
      }
    } else if (this.currentStationIndex === 2) {
      // Station 2: "Synthwave Highway"
      // Driving 16th note arp and pulse kick
      const arpFreqs = [110, 164.8, 220, 277.2, 329.6, 277.2, 220, 164.8];
      const freq = arpFreqs[step % arpFreqs.length];
      this.synthBassNote(freq, 0.18, 'sawtooth', 0.08);

      if (step % 4 === 0) {
        this.synthKick(0.2, 0.22);
      } else if (step % 4 === 2) {
        this.synthSnare(0.15, 0.12);
      }
    } else if (this.currentStationIndex === 3) {
      // Station 3: "Country Trucker Blues"
      // Shuffle beat with bass walk
      const walk = [98.0, 123.47, 146.83, 164.81, 196.0, 164.81, 146.83, 123.47];
      this.synthBassNote(walk[step % walk.length], 0.2, 'triangle', 0.18);
      if (step % 2 === 1) {
        this.synthHiHat(0.05, 0.06);
      }
    }
  }

  private synthBassNote(freq: number, duration: number, type: OscillatorType, gainVol: number) {
    if (!this.ctx || !this.radioGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(gainVol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.radioGain);

    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private synthPadNote(freq: number, duration: number, gainVol: number) {
    if (!this.ctx || !this.radioGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const t = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(gainVol, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.radioGain);

    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private synthKick(duration: number, gainVol: number) {
    if (!this.ctx || !this.radioGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + duration);

    gain.gain.setValueAtTime(gainVol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.radioGain);

    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  private synthSnare(duration: number, gainVol: number) {
    if (!this.ctx || !this.radioGain) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(900, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(gainVol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.radioGain);

    noise.start(t);
  }

  private synthHiHat(duration: number, gainVol: number) {
    if (!this.ctx || !this.radioGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'square';
    osc.frequency.setValueAtTime(7500, t);

    gain.gain.setValueAtTime(gainVol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.radioGain);

    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  public playThunder() {
    if (!this.ctx || !this.sfxGain) return;
    this.resume();

    const t = this.ctx.currentTime;
    const duration = 2.5;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.9));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, t);
    filter.frequency.exponentialRampToValueAtTime(45, t + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
  }

  public playTurboWhistle() {
    if (!this.ctx || !this.sfxGain) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(3200, t + 1.2);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 2.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 2.3);
  }

  public playFueling() {
    if (!this.ctx || !this.sfxGain) return;
    this.resume();

    const t = this.ctx.currentTime;
    const duration = 1.6;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.linearRampToValueAtTime(480, t + duration);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  public playCBRadio() {
    if (!this.ctx || !this.sfxGain) return;
    this.resume();

    const t = this.ctx.currentTime;
    // Squelch click
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(440, t + 0.08);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.22);
  }
}

export const audioEngine = new SoundEngine();
