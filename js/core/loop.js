/* loop.js — единый менеджер игровых циклов.
   Правила:
   · каждый цикл стартует только когда его сцена активна;
   · при скрытой вкладке все циклы замирают;
   · можно ограничить fps (например 30 для фоновых сцен);
   · если устройство стабильно не тянет — качество эффектов понижается. */

import { degradeQuality, device } from './device.js';

const live = new Set();
let pageHidden = false;
let watchdog = { frames: 0, time: 0, done: false };

export class Loop {
  /**
   * @param {(dt:number, now:number)=>void} update
   * @param {{fps?:number, maxDt?:number, name?:string}} opts
   */
  constructor(update, opts = {}) {
    this.update = update;
    this.fps = opts.fps || 60;
    this.maxDt = opts.maxDt || 0.05;
    this.name = opts.name || 'loop';
    this._id = 0;
    this._last = 0;
    this._acc = 0;
    this._running = false;
    this._paused = false;
    this._tick = this._tick.bind(this);
  }

  get running() { return this._running; }

  start() {
    if (this._running) return this;
    this._running = true;
    this._last = performance.now();
    this._acc = 0;
    live.add(this);
    this._id = requestAnimationFrame(this._tick);
    return this;
  }

  stop() {
    if (!this._running) return this;
    this._running = false;
    this._paused = false;
    cancelAnimationFrame(this._id);
    this._id = 0;
    live.delete(this);
    return this;
  }

  _tick(now) {
    if (!this._running) return;
    this._id = requestAnimationFrame(this._tick);
    if (this._paused) { this._last = now; return; }

    const step = 1 / this.fps;
    let dt = (now - this._last) / 1000;
    this._last = now;

    // ограничитель частоты: пропускаем кадры, если fps-лимит ниже
    if (this.fps < 60) {
      this._acc += dt;
      if (this._acc < step) return;
      dt = this._acc;
      this._acc = 0;
    }

    if (dt > this.maxDt) dt = this.maxDt;
    if (dt <= 0) dt = 1 / 60;

    measure(dt);
    try { this.update(dt, now / 1000); }
    catch (err) { console.error('[loop]', this.name, err); }
  }
}

function measure(dt) {
  if (watchdog.done || pageHidden) return;
  watchdog.frames++;
  watchdog.time += dt;
  if (watchdog.frames === 90) {
    const fps = watchdog.frames / watchdog.time;
    watchdog.done = true;
    if (fps < 42 && device.quality !== 'low') degradeQuality();
  }
}

/* пауза всего при уходе со вкладки */
function onVisibility() {
  pageHidden = document.hidden;
  live.forEach((l) => { l._paused = pageHidden; });
}
document.addEventListener('visibilitychange', onVisibility, { passive: true });
window.addEventListener('pagehide', () => { pageHidden = true; live.forEach((l) => { l._paused = true; }); });
window.addEventListener('pageshow', () => { pageHidden = document.hidden; live.forEach((l) => { l._paused = pageHidden; }); });

/** аварийно остановить все циклы (например при reset игры) */
export function stopAllLoops() {
  Array.from(live).forEach((l) => l.stop());
}

/** одноразовый кадровый колбэк (не держит цикл) */
export function tick() {
  return new Promise((r) => requestAnimationFrame((t) => r(t)));
}
