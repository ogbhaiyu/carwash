// High-Energy Procedural Desi Sound & Bhangra Audio Engine using Web Audio API

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isPlayingMusic = false;
    this.isMuted = false;
    this.tempo = 138; // Upbeat Bhangra BPM
    this.step = 0;
    this.musicTimer = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  ensureContext() {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.ensureContext();
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // --- BHANGRA DHOL INSTRUMENTS ---

  // Dagga (Heavy Dhol Bass hit)
  playDholBass(time, velocity = 1.0) {
    if (this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Pitch envelope drop: punchy drum thud
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(48, time + 0.16);

    gain.gain.setValueAtTime(0.9 * velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  // Tilli (Sharp Dhol Treble snap)
  playDholTreble(time, velocity = 0.8) {
    if (this.isMuted) return;
    // High-pitched pitched snap + noise burst
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, time);
    osc.frequency.exponentialRampToValueAtTime(180, time + 0.06);

    oscGain.gain.setValueAtTime(0.6 * velocity, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(oscGain);
    oscGain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.09);

    // Noise snap
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, time);
    filter.Q.setValueAtTime(3.0, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45 * velocity, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + 0.06);
  }

  // Tumbi (Plucked Punjabi Folk Instrument lead)
  playTumbiNote(freq, time, duration = 0.18) {
    if (this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    // Characteristic bright twang attack
    osc.frequency.setValueAtTime(freq * 1.06, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.025);

    // Filter to give that authentic tinny acoustic twang
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 2.2, time);
    filter.Q.setValueAtTime(4.5, time);

    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  // Celebratory Punjabi Whistle / Flute flourish
  playWhistle(time) {
    if (this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, time);
    osc.frequency.linearRampToValueAtTime(2200, time + 0.12);
    osc.frequency.linearRampToValueAtTime(1800, time + 0.25);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.32);
  }

  // --- MUSIC SEQUENCER (BHANGRA CHAAL GROOVE) ---
  // Classic 8-beat Chaal rhythm:
  // Beat 1: Bass + Treble | Beat 2: - | Beat 3: Treble | Beat 4: Bass
  // Beat 5: Treble | Beat 6: Bass | Beat 7: Treble | Beat 8: Treble (snap roll)
  startBhangraMusic() {
    this.ensureContext();
    if (this.isPlayingMusic) return;
    this.isPlayingMusic = true;
    this.step = 0;

    // Punjabi Pentatonic Riff scale notes (D, E, F#, A, B, D')
    const melodyScale = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99];
    const melodyPattern = [
      0, 2, 4, 5,  4, 2, 0, 2,
      4, 5, 7, 5,  4, 2, 4, 0,
      5, 5, 4, 2,  0, 2, 4, 2,
      7, 5, 4, 2,  0, 0, 4, 5
    ];

    const stepIntervalMs = (60 / this.tempo / 4) * 1000; // 16th notes

    const tick = () => {
      if (!this.isPlayingMusic) return;
      const now = this.ctx.currentTime;
      const s = this.step % 16;
      const barStep = this.step % 32;

      // Dhol Pattern
      if (s === 0) {
        this.playDholBass(now, 1.0);
        this.playDholTreble(now, 0.9);
      } else if (s === 2) {
        this.playDholTreble(now, 0.7);
      } else if (s === 4) {
        this.playDholBass(now, 0.85);
      } else if (s === 6) {
        this.playDholTreble(now, 0.8);
      } else if (s === 8) {
        this.playDholBass(now, 0.95);
        this.playDholTreble(now, 0.75);
      } else if (s === 10) {
        this.playDholTreble(now, 0.7);
      } else if (s === 12) {
        this.playDholBass(now, 0.9);
      } else if (s === 14) {
        this.playDholTreble(now, 0.9);
      } else if (s === 15) {
        this.playDholTreble(now, 0.6); // Pickup roll
      }

      // Tumbi Riff (plays on 8th notes)
      if (this.step % 2 === 0) {
        const noteIdx = melodyPattern[Math.floor(barStep / 2) % melodyPattern.length];
        const freq = melodyScale[noteIdx];
        this.playTumbiNote(freq, now, 0.16);
      }

      // Celebratory whistle every 64 steps
      if (this.step % 64 === 0) {
        this.playWhistle(now);
      }

      this.step++;
      this.musicTimer = setTimeout(tick, stepIntervalMs);
    };

    tick();
  }

  stopBhangraMusic() {
    this.isPlayingMusic = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  // --- SOUND EFFECTS (SFX) ---

  // Authentic Automotive Dual-Tone Car Horn ("HONK-HONK!")
  playCarHorn() {
    this.ensureContext();
    if (this.isMuted) return;
    const now = this.ctx.currentTime;

    // Dual automotive horn frequencies: Low tone ~415 Hz, High tone ~495 Hz
    const blasts = [
      { start: 0, duration: 0.16 },      // First snappy honk
      { start: 0.22, duration: 0.28 }     // Second solid honk
    ];

    blasts.forEach(blast => {
      const bStart = now + blast.start;
      const bEnd = bStart + blast.duration;

      // Body acoustic filter simulating car horn trumpet housing
      const hornFilter = this.ctx.createBiquadFilter();
      hornFilter.type = 'bandpass';
      hornFilter.frequency.setValueAtTime(1450, bStart);
      hornFilter.Q.setValueAtTime(1.8, bStart);

      const blastGain = this.ctx.createGain();
      blastGain.gain.setValueAtTime(0.001, bStart);
      blastGain.gain.linearRampToValueAtTime(0.55, bStart + 0.015);
      blastGain.gain.setValueAtTime(0.55, bEnd - 0.03);
      blastGain.gain.exponentialRampToValueAtTime(0.001, bEnd);

      hornFilter.connect(blastGain);
      blastGain.connect(this.sfxGain);

      // Low horn pair (412 Hz & 418 Hz for rich acoustic phasing)
      [412, 418].forEach(freq => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, bStart);
        osc.connect(hornFilter);
        osc.start(bStart);
        osc.stop(bEnd + 0.02);
      });

      // High horn pair (494 Hz & 502 Hz)
      [494, 502].forEach(freq => {
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, bStart);
        const pairGain = this.ctx.createGain();
        pairGain.gain.setValueAtTime(0.4, bStart);
        osc.connect(pairGain);
        pairGain.connect(hornFilter);
        osc.start(bStart);
        osc.stop(bEnd + 0.02);
      });
    });
  }

  // Alias for backward compatibility
  playDesiHorn() {
    this.playCarHorn();
  }

  // Realistic Pressurized Foam Cannon (High-pressure air + thick lather spray)
  playFoamSpray() {
    this.ensureContext();
    if (this.isMuted) return;
    const now = this.ctx.currentTime;
    const duration = 0.9;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Turbulence with bubbling micro-pops
    for (let i = 0; i < bufferSize; i++) {
      const progress = i / bufferSize;
      const baseNoise = Math.random() * 2 - 1;
      const bubblePop = Math.random() < 0.03 ? (Math.random() * 2 - 1) * 1.8 : 0;
      data[i] = (baseNoise + bubblePop) * Math.sin(progress * Math.PI);
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // Resonant sweep simulating pressurized foam lance
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(950, now + duration);
    filter.Q.setValueAtTime(2.2, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.55, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noiseSource.start(now);
  }

  // Realistic Wet Soapy Sponge Scrub (Authentic stick-slip squeak & lather friction)
  playSpongeSqueak() {
    this.ensureContext();
    if (this.isMuted) return;
    const now = this.ctx.currentTime;

    // Double wet squeaks: "sqwueee-squish!"
    const chirps = [
      { t: 0, startF: 950, peakF: 2200, endF: 1300, dur: 0.12 },
      { t: 0.14, startF: 1400, peakF: 2600, endF: 1100, dur: 0.11 }
    ];

    chirps.forEach(chirp => {
      const cStart = now + chirp.t;
      const cEnd = cStart + chirp.dur;

      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(chirp.startF, cStart);
      osc.frequency.exponentialRampToValueAtTime(chirp.peakF, cStart + chirp.dur * 0.45);
      osc.frequency.exponentialRampToValueAtTime(chirp.endF, cEnd);

      // Fast slip-stick micro-vibrato
      const vibrato = this.ctx.createOscillator();
      const vibratoGain = this.ctx.createGain();
      vibrato.frequency.setValueAtTime(45, cStart);
      vibratoGain.gain.setValueAtTime(70, cStart);
      vibrato.connect(osc.frequency);
      vibrato.start(cStart);
      vibrato.stop(cEnd);

      oscGain.gain.setValueAtTime(0.001, cStart);
      oscGain.gain.linearRampToValueAtTime(0.35, cStart + 0.02);
      oscGain.gain.exponentialRampToValueAtTime(0.001, cEnd);

      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);

      osc.start(cStart);
      osc.stop(cEnd + 0.02);
    });
  }

  // Realistic Industrial High-Pressure Hydro Jet (1500-PSI water blast roar)
  playWaterJet() {
    this.ensureContext();
    if (this.isMuted) return;
    const now = this.ctx.currentTime;
    const duration = 0.85;

    // 1. Turbulent rushing water noise buffer
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(2800, now);
    bandpass.Q.setValueAtTime(1.8, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.01, now);
    noiseGain.gain.linearRampToValueAtTime(0.65, now + 0.04);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);

    // 2. Sub-bass nozzle rumble (Heavy mechanical water pump pressure)
    const rumbleOsc = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumbleOsc.type = 'sawtooth';
    rumbleOsc.frequency.setValueAtTime(145, now);
    rumbleOsc.frequency.linearRampToValueAtTime(130, now + duration);

    const rumbleFilter = this.ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.setValueAtTime(220, now);

    rumbleGain.gain.setValueAtTime(0.01, now);
    rumbleGain.gain.linearRampToValueAtTime(0.35, now + 0.05);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    rumbleOsc.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.sfxGain);

    rumbleOsc.start(now);
    rumbleOsc.stop(now + duration + 0.02);
  }

  // Ka-ching! / Robinhood Crypto Confirmation Sound
  playCashRegister() {
    this.ensureContext();
    if (this.isMuted) return;
    const now = this.ctx.currentTime;

    // Metallic chime 1
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, now); // C6
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Metallic chime 2
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1567.98, now + 0.08); // G6
    gain2.gain.setValueAtTime(0.5, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.6);
  }

  // Squeaky clean celebration shine
  playSparkleShine() {
    this.ensureContext();
    if (this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.3, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.4);
    });
  }
}

export const soundEngine = new SoundEngine();
