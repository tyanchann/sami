/* audio.js — звук целиком на Web Audio API.
   Все эффекты синтезируются на месте: ни одного скачанного файла, ни одной лицензии.
   Фоновая музыка (один mp3) подключается отдельно в фазе финальных сцен. */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.volume = 0.85;
    this.ready = false;
    this.musicEl = null;
    this.musicWanted = false;
    this._noiseBuf = null;
    this._voices = 0;
    this.maxVoices = 8;
    this._lastPlay = new Map();
  }

  /* ---------- инициализация ---------- */
  init() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
      this.ready = true;
    } catch (err) {
      console.warn('[audio] недоступно:', err && err.message);
      this.ctx = null;
    }
    return this.ctx;
  }

  /** вызывать из первого пользовательского жеста */
  unlock() {
    const ctx = this.init();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (this.musicWanted) this._startMusic();
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  /* ---------- громкость / mute ---------- */
  setMuted(m) {
    this.muted = !!m;
    if (this.master) {
      const t = this.now;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, t, 0.02);
    }
    if (this.musicEl) this.musicEl.muted = this.muted;
    return this.muted;
  }

  /* ---------- примитивы синтеза ---------- */
  _noiseBuffer() {
    if (this._noiseBuf || !this.ctx) return this._noiseBuf;
    const len = Math.floor(this.ctx.sampleRate * 0.7);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._noiseBuf = buf;
    return buf;
  }

  _tone({ f = 440, f2 = null, dur = 0.14, type = 'sine', gain = 0.12, at = 0,
          attack = 0.006, curve = 'exp', detune = 0 } = {}) {
    if (!this.ctx || this.muted) return null;
    const t0 = this.now + at;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t0);
    if (detune) osc.detune.setValueAtTime(detune, t0);
    if (f2 !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    else g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
    this._track(osc, dur);
    return osc;
  }

  _noise({ dur = 0.2, gain = 0.1, type = 'highpass', freq = 1200, freq2 = null, q = 1, at = 0 } = {}) {
    if (!this.ctx || this.muted) return null;
    const buf = this._noiseBuffer();
    if (!buf) return null;
    const t0 = this.now + at;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.setValueAtTime(freq, t0);
    if (freq2 !== null) filt.frequency.exponentialRampToValueAtTime(Math.max(80, freq2), t0 + dur);
    filt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
    this._track(src, dur);
    return src;
  }

  _track(node, dur) {
    this._voices++;
    node.onended = () => { this._voices = Math.max(0, this._voices - 1); };
    setTimeout(() => { this._voices = Math.max(0, this._voices - 1); }, (dur + 0.2) * 1000);
  }

  /** защита от каши: не больше N одновременных звуков и не чаще 8 раз в 30мс */
  _throttle(key, ms = 34) {
    const t = performance.now();
    const last = this._lastPlay.get(key) || 0;
    if (t - last < ms) return false;
    this._lastPlay.set(key, t);
    return true;
  }

  /* ---------- именные звуки ---------- */
  click() {
    if (!this._throttle('click', 40)) return;
    this._tone({ f: 720, f2: 560, dur: 0.06, type: 'square', gain: 0.05 });
  }

  hover() {
    if (!this._throttle('hover', 60)) return;
    this._tone({ f: 1000, dur: 0.03, type: 'sine', gain: 0.025 });
  }

  correct() {
    // тёплый мажорный арпеджио: E5 → B5
    this._tone({ f: 659.25, dur: 0.13, type: 'triangle', gain: 0.10 });
    this._tone({ f: 987.77, dur: 0.22, type: 'triangle', gain: 0.085, at: 0.075 });
    this._tone({ f: 1318.5, dur: 0.26, type: 'sine', gain: 0.045, at: 0.15 });
  }

  wrong() {
    // мягкий «упавший» звук, без резкости
    this._tone({ f: 233, f2: 155, dur: 0.26, type: 'triangle', gain: 0.11 });
    this._noise({ dur: 0.12, gain: 0.03, type: 'lowpass', freq: 700 });
  }

  crack() {
    // короткий «хруст» трещины
    this._noise({ dur: 0.09, gain: 0.05, type: 'bandpass', freq: 3400, q: 2.2 });
    this._tone({ f: 1480, f2: 900, dur: 0.07, type: 'triangle', gain: 0.03 });
  }

  shatter() {
    this._noise({ dur: 0.42, gain: 0.10, type: 'highpass', freq: 1800, freq2: 5200, q: 0.7 });
    for (let i = 0; i < 4; i++) {
      this._tone({ f: 900 + Math.random() * 1400, dur: 0.09, type: 'triangle', gain: 0.035, at: 0.02 + i * 0.05 });
    }
    this._tone({ f: 120, f2: 60, dur: 0.24, type: 'sine', gain: 0.09 });
  }

  fragment() {
    // «щелчок пазла» + светлый звон
    this._tone({ f: 1180, dur: 0.07, type: 'triangle', gain: 0.055 });
    this._tone({ f: 1568, dur: 0.16, type: 'sine', gain: 0.05, at: 0.05 });
    this._tone({ f: 2093, dur: 0.2, type: 'sine', gain: 0.028, at: 0.1 });
    this._noise({ dur: 0.05, gain: 0.03, type: 'highpass', freq: 3000 });
  }

  assemble() {
    // эмоциональный аккорд: A3-C#4-E4-A4
    const notes = [220, 277.18, 329.63, 440, 554.37];
    notes.forEach((f, i) => {
      this._tone({ f, dur: 1.6, type: 'triangle', gain: 0.05, at: i * 0.09, attack: 0.12 });
    });
    this._tone({ f: 110, dur: 1.9, type: 'sine', gain: 0.05, attack: 0.2 });
  }

  heartbeat() {
    this._tone({ f: 62, f2: 44, dur: 0.2, type: 'sine', gain: 0.16, attack: 0.005 });
    this._tone({ f: 55, f2: 38, dur: 0.24, type: 'sine', gain: 0.1, at: 0.26, attack: 0.005 });
  }

  flip() {
    this._noise({ dur: 0.08, gain: 0.05, type: 'bandpass', freq: 2200, q: 1.4 });
    this._tone({ f: 520, f2: 700, dur: 0.06, type: 'triangle', gain: 0.03 });
  }

  match() {
    this._tone({ f: 880, dur: 0.1, type: 'triangle', gain: 0.08 });
    this._tone({ f: 1318.5, dur: 0.18, type: 'triangle', gain: 0.07, at: 0.07 });
  }

  arrow() {
    this._noise({ dur: 0.16, gain: 0.06, type: 'bandpass', freq: 2600, freq2: 900, q: 1.1 });
  }

  hit() {
    this._tone({ f: 160, f2: 70, dur: 0.16, type: 'triangle', gain: 0.14 });
    this._noise({ dur: 0.1, gain: 0.06, type: 'lowpass', freq: 1400 });
  }

  jump() {
    this._tone({ f: 340, f2: 660, dur: 0.13, type: 'square', gain: 0.05 });
  }

  land() {
    this._tone({ f: 200, f2: 110, dur: 0.1, type: 'sine', gain: 0.07 });
  }

  pickup() {
    this._tone({ f: 1046.5, dur: 0.08, type: 'triangle', gain: 0.07 });
    this._tone({ f: 1568, dur: 0.14, type: 'sine', gain: 0.05, at: 0.06 });
  }

  crash() {
    this._noise({ dur: 0.3, gain: 0.09, type: 'lowpass', freq: 900, freq2: 240 });
    this._tone({ f: 90, f2: 50, dur: 0.3, type: 'square', gain: 0.07 });
  }

  boom() {
    // салют: низкий удар + воздух
    if (!this._throttle('boom', 120)) return;
    this._tone({ f: 96, f2: 38, dur: 0.42, type: 'sine', gain: 0.13, attack: 0.004 });
    this._noise({ dur: 0.34, gain: 0.07, type: 'lowpass', freq: 2100, freq2: 420, q: 0.8 });
    this._noise({ dur: 0.16, gain: 0.04, type: 'highpass', freq: 3800, at: 0.02 });
  }

  win() {
    const seq = [523.25, 659.25, 783.99, 1046.5];
    seq.forEach((f, i) => this._tone({ f, dur: 0.3, type: 'triangle', gain: 0.07, at: i * 0.1 }));
    this._tone({ f: 1568, dur: 0.5, type: 'sine', gain: 0.04, at: 0.42 });
  }

  lose() {
    const seq = [392, 349.23, 293.66];
    seq.forEach((f, i) => this._tone({ f, dur: 0.3, type: 'triangle', gain: 0.07, at: i * 0.12 }));
  }

  /* ---------- музыка ---------- */
  /** @param {string} src относительный путь, @param {{loop?:boolean, volume?:number, fade?:number}} opts */
  attachMusic(src, opts = {}) {
    if (!src) return null;
    const a = new Audio();
    a.src = src;
    a.loop = opts.loop !== false;
    a.preload = 'auto';
    a.volume = 0;
    a.muted = this.muted;
    a.playsInline = true;
    a.setAttribute('playsinline', '');
    this.musicEl = a;
    this.musicVolume = opts.volume ?? 0.38;
    return a;
  }

  playMusic() {
    this.musicWanted = true;
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    this._startMusic();
  }

  _startMusic() {
    const a = this.musicEl;
    if (!a) return;
    const p = a.play();
    if (p && p.catch) p.catch(() => { /* ждём следующего жеста */ });
    this._fadeMusic(this.musicVolume ?? 0.38, 2.2);
  }

  stopMusic(fade = 1.2) {
    this.musicWanted = false;
    this._fadeMusic(0, fade, () => { if (this.musicEl) this.musicEl.pause(); });
  }

  _fadeMusic(to, seconds = 1, done) {
    const a = this.musicEl;
    if (!a) { if (done) done(); return; }
    const from = a.volume;
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / (seconds * 1000));
      a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) requestAnimationFrame(step);
      else if (done) done();
    };
    step();
  }
}

export const audio = new AudioEngine();
export default audio;
