/**
 * Procedural Web Audio Ambient Sound Synthesizer
 * Zero external audio files! Synthesizes realistic rain, wind, and soothing night ambience.
 */
class WeatherAudioSynth {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.currentMode = null; // 'rain', 'wind', 'night'
    this.masterGain = null;
    this.noiseNode = null;
    this.filterNode = null;
    this.cricketOsc = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  createNoiseBuffer() {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    // Generate Pink Noise for soothing rain/wind acoustics
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  setWeather(weatherDesc, isNight = false) {
    const desc = (weatherDesc || '').toLowerCase();
    let mode = 'wind';

    if (desc.includes('hujan') || desc.includes('petir')) {
      mode = 'rain';
    } else if (isNight) {
      mode = 'night';
    } else {
      mode = 'wind';
    }

    this.currentMode = mode;
    if (this.isPlaying) {
      this.play(mode);
    }
  }

  play(mode = this.currentMode || 'wind') {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.stopNodes();
    this.currentMode = mode;

    const noiseBuffer = this.createNoiseBuffer();
    if (!noiseBuffer) return;

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    this.filterNode = this.ctx.createBiquadFilter();

    if (mode === 'rain') {
      // Gentle rainfall bandpass + lowpass
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(1400, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(0.8, this.ctx.currentTime);
      this.noiseNode.connect(this.filterNode);
      this.filterNode.connect(this.masterGain);
      this.masterGain.gain.setTargetAtTime(0.28, this.ctx.currentTime, 0.4);
    } else if (mode === 'night') {
      // Gentle night breeze + crickets
      this.filterNode.type = 'bandpass';
      this.filterNode.frequency.setValueAtTime(450, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(1.2, this.ctx.currentTime);
      this.noiseNode.connect(this.filterNode);
      this.filterNode.connect(this.masterGain);
      this.masterGain.gain.setTargetAtTime(0.12, this.ctx.currentTime, 0.5);
    } else {
      // Gentle daylight breeze
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(320, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(0.6, this.ctx.currentTime);
      this.noiseNode.connect(this.filterNode);
      this.filterNode.connect(this.masterGain);
      this.masterGain.gain.setTargetAtTime(0.15, this.ctx.currentTime, 0.5);
    }

    this.noiseNode.start();
    this.isPlaying = true;
  }

  stopNodes() {
    if (this.noiseNode) {
      try {
        this.noiseNode.stop();
        this.noiseNode.disconnect();
      } catch (e) {}
      this.noiseNode = null;
    }
  }

  toggle() {
    this.init();
    if (this.isPlaying) {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
        setTimeout(() => {
          this.stopNodes();
          this.isPlaying = false;
        }, 250);
      } else {
        this.isPlaying = false;
      }
      return false;
    } else {
      this.play();
      return true;
    }
  }
}

window.WeatherAudioSynth = WeatherAudioSynth;
