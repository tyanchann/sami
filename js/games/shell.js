/* shell.js — общая оболочка мини-игр.
   Отвечает за: сцену, canvas с логическим разрешением 320×200 и пиксельным
   масштабированием, инструкцию перед стартом, ввод (мышь/палец/клавиши),
   цикл обновлений, победный финал с выдачей фрагмента и провал с потерей жизни. */

import { el, wait, nextFrame } from '../core/dom.js';
import { audio } from '../core/audio.js';
import { device, canvasScale } from '../core/device.js';
import { Loop } from '../core/loop.js';
import { state } from '../state.js';
import hud from '../ui/hud.js';
import screens from '../ui/screens.js';
import { loseLife } from '../ui/lifeLoss.js';
import { showFragmentReward } from '../ui/reward.js';
import { showRetry } from '../ui/retry.js';

export const LW = 320;
export const LH = 200;

export const GAME_ORDER = ['bow', 'drive', 'runner', 'catch', 'memory'];

export class GameShell {
  /**
   * @param {object} ctx контекст приложения (go, nextSceneId, ...)
   * @param {object} game {id,title,index,piece,hint,instructions,reset,update,onDown,onMove,onUp,onKey,destroy}
   */
  constructor(ctx, game) {
    this.ctx = ctx;
    this.game = game;
    this.LW = LW;
    this.LH = LH;
    this.id = game.id;
    this.G = null;            // 2d context
    this.canvas = null;
    this.time = 0;
    this.busy = false;
    this.active = false;      // раунд идёт
    this.pointer = { x: 0, y: 0, down: false };
    this.keys = new Set();
    this._offs = [];
    this._raf = 0;
    this.loop = new Loop((dt) => this._tick(dt), { fps: 60, name: 'game:' + game.id });
    this._onResize = () => this.fit();
  }

  /* ================= DOM ================= */
  mount(container) {
    hud.show(true);

    const total = GAME_ORDER.length;
    const kicker = el('p', {
      class: 'kicker',
      text: `испытание ${this.game.index + 1} из ${total}`,
    });
    const title = el('h2', { class: 'game__title', text: this.game.title });

    this.canvas = el('canvas', { class: 'game__canvas' });
    this.G = this.canvas.getContext('2d', { alpha: false });

    this.scoreEl = el('span', { class: 'game__score', text: '' });
    this.chipEl = el('div', {
      class: 'game__chip' + (this.game.chipPos === 'bottom' ? ' game__chip--bottom' : ''),
    }, this.scoreEl);
    this.chipEl.hidden = true;

    this.flashEl = el('div', { class: 'game__flash', 'aria-hidden': 'true' });

    this.overlayEl = el('div', { class: 'game__overlay' });
    this.frameEl = el('div', { class: 'game__frame' },
      this.canvas, this.chipEl, this.flashEl, this.overlayEl);

    this.hintEl = el('p', { class: 'game__hint', text: this.game.hint || '' });

    /* инструкция живёт НЕ внутри рамки: на телефоне рамка всего ~220px высотой,
       и панель с правилами в неё не влезает (кнопка «начать» обрезалась) */
    this.introEl = el('div', { class: 'game__intro' });

    this.view = el('div', { class: 'game' },
      el('div', { class: 'game__head' }, kicker, title),
      this.frameEl,
      this.hintEl);

    this._buildStartPanel();

    // размеры и ввод
    requestAnimationFrame(() => this.fit());
    this._observeResize();
    this._bindInput();
    window.addEventListener('keydown', this._keyDown);
    window.addEventListener('keyup', this._keyUp);
    this._offs.push(() => window.removeEventListener('keydown', this._keyDown));
    this._offs.push(() => window.removeEventListener('keyup', this._keyUp));

    return this.view;
  }

  _observeResize() {
    window.addEventListener('resize', this._onResize, { passive: true });
    window.addEventListener('orientationchange', this._onResize, { passive: true });
    this._offs.push(() => window.removeEventListener('resize', this._onResize));
    this._offs.push(() => window.removeEventListener('orientationchange', this._onResize));
    if (this._ro) this._ro.disconnect();
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this.fit());
      this._ro.observe(this.frameEl);
      this._offs.push(() => this._ro && this._ro.disconnect());
    }
  }

  fit() {
    if (!this.canvas || !this.frameEl) return;
    const r = this.frameEl.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.dpr = canvasScale(this.canvas, r.width, r.height);
    // равномерный масштаб + letterbox: пропорции игрового поля не искажаются
    this.scale = Math.min(this.canvas.width / LW, this.canvas.height / LH);
    this.offX = (this.canvas.width - LW * this.scale) / 2;
    this.offY = (this.canvas.height - LH * this.scale) / 2;
    this._pxPerCss = this.canvas.width / r.width;
    this.cssW = r.width;
    this.cssH = r.height;
    if (this.game.onResize) this.game.onResize(this);
  }

  /* ================= инструкция / старт ================= */
  _buildStartPanel() {
    const title = el('h3', { class: 'game__panelTitle', text: this.game.title });
    const list = el('ul', { class: 'game__rules' });
    (this.game.instructions || []).forEach((t) => list.appendChild(el('li', { text: t })));
    this.startBtn = el('button', { class: 'btn btn--rose btn--wide', type: 'button', text: 'начать' });

    this.panelEl = el('div', { class: 'game__panel' }, title, list, this.startBtn);
    this.introEl.appendChild(this.panelEl);
    this.view.appendChild(this.introEl);
    this.introEl.classList.add('is-on');

    const start = () => {
      if (this.busy) return;
      audio.unlock();
      audio.click();
      this.startRound();
    };
    this.startBtn.addEventListener('click', start);
    this._offs.push(() => this.startBtn.removeEventListener('click', start));
  }

  /** начать/перезапустить раунд */
  startRound() {
    this.busy = false;
    this.active = true;
    this.time = 0;
    this.keys.clear();
    this.pointer.down = false;
    this.overlayEl.classList.remove('is-on');
    this.overlayEl.classList.remove('is-win');
    this.overlayEl.classList.remove('is-toast');
    this.overlayEl.innerHTML = '';
    if (this.introEl) this.introEl.classList.remove('is-on');
    /* страховка: снимаем фокус с кнопки и обнуляем возможную прокрутку рамки,
       иначе канвас может «уехать» внутри overflow-контейнера */
    if (this.introEl && this.introEl.contains(document.activeElement)) document.activeElement.blur();
    if (this.frameEl) { this.frameEl.scrollTop = 0; this.frameEl.scrollLeft = 0; }
    this.chipEl.hidden = false;
    this.setScore('');
    this._clear();
    if (this.game.reset) this.game.reset(this);
    this.loop.start();
  }

  /** залить фон и выставить пиксельно-ровный трансформ игрового поля */
  _clear() {
    const g = this.G;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#D8CBB9';
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    g.setTransform(this.scale, 0, 0, this.scale, this.offX, this.offY);
    g.imageSmoothingEnabled = false;
  }

  _tick(dt) {
    this.time += dt;
    this._clear();
    try { this.game.update(dt, this.time, this); }
    catch (e) { console.error('[game:' + this.id + ']', e); }
  }

  stopRound() {
    this.active = false;
    this.loop.stop();
  }

  setScore(text) {
    if (!this.scoreEl) return;
    if (text === this._lastScore)	return;
    this._lastScore = text;
    this.scoreEl.textContent = text;
    this.chipEl.hidden = !text;
  }

  flash(kind = 'bad') {
    if (!this.flashEl) return;
    this.flashEl.className = 'game__flash';
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add(kind === 'good' ? 'is-good' : 'is-bad');
    setTimeout(() => { if (this.flashEl) this.flashEl.className = 'game__flash'; }, 320);
  }

  /* ================= победа ================= */
  async win(message = 'испытание пройдено') {
    if (this.busy) return;
    this.busy = true;
    this.stopRound();
    audio.win();
    this.flash('good');

    this.overlayEl.innerHTML = '';
    this.overlayEl.className = 'game__overlay is-on is-win';
    this.overlayEl.appendChild(el('div', { class: 'game__win' },
      el('p', { class: 'game__winText', text: message }),
    ));
    await wait(device.reducedMotion ? 120 : 900);

    state.markGameWon(this.game.id);
    this.game.destroyExtra && this.game.destroyExtra();
    await showFragmentReward(this.game.piece, {
      from: { x: window.innerWidth / 2, y: window.innerHeight * 0.58 },
    });

    this.busy = false;
    this.ctx.go(this.ctx.nextSceneId());
  }

  /* ================= провал ================= */
  async fail(message = 'ой!') {
    if (this.busy) return;
    this.busy = true;
    this.stopRound();
    audio.crash();
    this.flash('bad');

    this.overlayEl.innerHTML = '';
    this.overlayEl.className = 'game__overlay is-on is-toast';
    this.overlayEl.appendChild(el('p', { class: 'game__toast', text: message }));

    await wait(220);
    await loseLife({ index: Math.max(0, state.lives - 1) });

    if (state.isDead) {
      await showRetry({
        title: 'Сердце разбилось',
        text: 'Собранные фрагменты остались с тобой. Попробуем испытание ещё раз?',
        button: 'Попробовать снова',
      });
      state.refillLives();
      hud.refresh();
      hud.animateLifeGain(4);
    }

    await wait(device.reducedMotion ? 60 : 520);
    this.busy = false;
    this.startRound();
  }

  /* ================= ввод ================= */
  _pos(ev) {
    const r = this.canvas.getBoundingClientRect();
    const pxPerCss = r.width ? this.canvas.width / r.width : 1;
    const px = (ev.clientX - r.left) * pxPerCss;
    const py = (ev.clientY - r.top) * (this.canvas.height / r.height);
    return {
      x: (px - this.offX) / this.scale,
      y: (py - this.offY) / this.scale,
    };
  }

  _bindInput() {
    const down = (ev) => {
      if (this.busy || !this.active) return;
      ev.preventDefault();
      const p = this._pos(ev);
      this.pointer = { x: p.x, y: p.y, down: true };
      this.game.onDown && this.game.onDown(p.x, p.y, ev, this);
    };
    const move = (ev) => {
      const p = this._pos(ev);
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      if (!this.busy && this.active && this.game.onMove) this.game.onMove(p.x, p.y, ev, this);
    };
    const up = (ev) => {
      if (!this.pointer.down) return;
      this.pointer.down = false;
      const p = this._pos(ev);
      if (this.active && this.game.onUp) this.game.onUp(p.x, p.y, ev, this);
    };
    this.canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    this._offs.push(() => this.canvas.removeEventListener('pointerdown', down));
    this._offs.push(() => window.removeEventListener('pointermove', move));
    this._offs.push(() => window.removeEventListener('pointerup', up));
    this._offs.push(() => window.removeEventListener('pointercancel', up));

    this._keyDown = (ev) => {
      if (!this.active || this.busy) return;
      const k = ev.key;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Spacebar'].includes(k)) ev.preventDefault();
      this.keys.add(k === ' ' ? 'Space' : k);
      this.game.onKey && this.game.onKey(k === ' ' ? 'Space' : k, true, this);
    };
    this._keyUp = (ev) => {
      const k = ev.key === ' ' ? 'Space' : ev.key;
      this.keys.delete(k);
      this.game.onKey && this.game.onKey(k, false, this);
    };
  }

  /* ================= сервис ================= */
  /** удобная точка привязки слушателей с автоочисткой */
  listen(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this._offs.push(() => target.removeEventListener(type, fn, opts));
  }

  destroy() {
    this.busy = true;
    this.active = false;
    this.loop.stop();
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
    this._offs.forEach((f) => { try { f(); } catch (_) {} });
    this._offs.length = 0;
    if (this.game.destroy) this.game.destroy(this);
    if (this.G) this.G.setTransform(1, 0, 0, 1, 0, 0);
  }
}
