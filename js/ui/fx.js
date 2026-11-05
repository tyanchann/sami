/* fx.js — общий слой частиц (canvas поверх игры).
   Один цикл на весь проект: запускается только когда есть живые частицы,
   количество ограничено, при скрытой вкладке замирает. */

import { canvasScale, device } from '../core/device.js';
import { Loop } from '../core/loop.js';

const MAX = () => (device.quality === 'low' ? 46 : 150);

class Fx {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.parts = [];
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.loop = new Loop((dt) => this._step(dt), { fps: 60, name: 'fx' });
    this._onResize = () => this.resize();
  }

  init(canvas) {
    if (!canvas || this.canvas) return this;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.resize();
    window.addEventListener('resize', this._onResize, { passive: true });
    window.addEventListener('orientationchange', this._onResize, { passive: true });
    return this;
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    this.dpr = canvasScale(this.canvas, w, h);
    this.w = w;
    this.h = h;
    if (this.ctx) this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  get active() { return this.parts.length > 0; }

  _push(p) {
    if (this.parts.length >= MAX()) this.parts.shift();
    this.parts.push(p);
    if (!this.loop.running) this._ensureSize(), this.loop.start();
  }

  _ensureSize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    if (Math.abs(rect.width - this.w) > 1 || Math.abs(rect.height - this.h) > 1) this.resize();
  }

  /** пиксельные осколки */
  burst(x, y, opts = {}) {
    if (!this.canvas) return;
    const {
      count = 16, colors = ['#ff5f86', '#ffb8c6', '#c03a5e'], speed = 240,
      size = 5, life = 0.8, gravity = 780, spread = Math.PI * 2, angle = -Math.PI / 2,
      drift = 0.6,
    } = opts;
    const n = device.quality === 'low' ? Math.ceil(count * 0.6) : count;
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const sp = speed * (0.45 + Math.random() * 0.85);
      this._push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        g: gravity,
        size: size * (0.5 + Math.random()),
        color: colors[(Math.random() * colors.length) | 0],
        life: life * (0.7 + Math.random() * 0.7),
        age: 0,
        drag: drift,
        kind: 'shard',
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 8,
      });
    }
  }

  /** мягкая искра / пылинка */
  spark(x, y, opts = {}) {
    if (!this.canvas) return;
    const { color = '#ffd7e0', size = 3, life = 0.5, vx = 0, vy = 0, gravity = 0 } = opts;
    if (device.quality === 'low' && Math.random() < 0.4) return;
    this._push({ x, y, vx, vy, g: gravity, size, color, life, age: 0, drag: 0.9, kind: 'spark' });
  }

  /** след за летящим объектом */
  trail(x, y, opts = {}) {
    const { color = '#ff9fb4', size = 4, life = 0.42 } = opts;
    this.spark(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8, {
      color, size: size * (0.6 + Math.random() * 0.8), life, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40,
    });
  }

  clear() {
    this.parts.length = 0;
    if (this.ctx) this.ctx.clearRect(0, 0, this.w, this.h);
    this.loop.stop();
  }

  _step(dt) {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.w, this.h);

    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.age += dt;
      if (p.age >= p.life) { this.parts.splice(i, 1); continue; }

      p.vy += p.g * dt;
      if (p.drag) { p.vx *= 1 - p.drag * dt * 2; p.vy *= 1 - p.drag * dt * 0.35; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const t = p.age / p.life;
      ctx.globalAlpha = p.kind === 'spark' ? (1 - t) * 0.9 : (1 - t * t);
      ctx.fillStyle = p.color;

      if (p.kind === 'shard') {
        const s = p.size * (1 - t * 0.35);
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.vr) ctx.rotate((p.rot || 0) + p.vr * p.age);
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      } else {
        const s = p.size * (1 - t * 0.6);
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
      }
    }
    ctx.globalAlpha = 1;

    if (!this.parts.length) {
      this.loop.stop();
      ctx.clearRect(0, 0, this.w, this.h);
    }
  }
}

export const fx = new Fx();
export default fx;
