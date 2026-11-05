/* hud.js — верхняя панель: жизни, прогресс сердца, звук, сброс */

import { $ } from '../core/dom.js';
import { audio } from '../core/audio.js';
import { state, MAX_LIVES } from '../state.js';
import { buildHeart, updateHeart, lifeHeart, pixelIcon } from './heart.js';
import screens from './screens.js';

class Hud {
  constructor() {
    this.livesEl = $('#lives');
    this.progressHeartEl = $('#progress-heart');
    this.progressCountEl = $('#progress-count');
    this.soundBtn = $('#btn-sound');
    this.resetBtn = $('#btn-reset');
    this.root = $('#hud');
    this.hearts = [];
    this.miniHeart = null;
    this.onReset = null;
    this._ready = false;
  }

  init({ onReset } = {}) {
    if (this._ready) return this;
    this.onReset = onReset || null;

    // 5 сердец жизни
    this.livesEl.innerHTML = '';
    for (let i = 0; i < MAX_LIVES; i++) {
      const h = lifeHeart(true);
      h.classList.add('life');
      h.dataset.index = String(i);
      this.livesEl.appendChild(h);
      this.hearts.push(h);
    }

    // мини-сердце прогресса
    this.miniHeart = buildHeart({
      collected: state.fragmentList(),
      classes: 'heart-svg',
      label: 'Собранные фрагменты',
    });
    this.progressHeartEl.appendChild(this.miniHeart);

    // иконка сброса
    this.resetBtn.innerHTML = '';
    this.resetBtn.appendChild(pixelIcon('reset'));
    this.resetBtn.querySelector('svg').classList.add('iconbtn__svg');

    // звук
    this._paintSound();
    this.soundBtn.addEventListener('click', () => {
      const muted = !state.muted;
      state.setMuted(muted);
      audio.setMuted(muted);
      this._paintSound();
      if (!muted) audio.click();
    });

    // сброс
    this.resetBtn.addEventListener('click', async () => {
      audio.click();
      const ok = await screens.confirm({
        title: 'Начать заново?',
        text: 'Собранные фрагменты и прогресс будут сброшены. Это нельзя отменить.',
        ok: 'Заново',
        cancel: 'Оставить',
      });
      if (!ok) return;
      state.resetAll();
      audio.setMuted(state.muted);
      this.refresh();
      if (this.onReset) this.onReset();
    });

    state.subscribe((_, reason) => {
      if (reason === 'life' || reason === 'fragment' || reason === 'reset') this.refresh();
    });

    this._ready = true;
    this.refresh();
    return this;
  }

  _paintSound() {
    const muted = state.muted;
    this.soundBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    this.soundBtn.setAttribute('aria-label', muted ? 'Включить звук' : 'Выключить звук');
    this.soundBtn.innerHTML = '';
    this.soundBtn.appendChild(pixelIcon(muted ? 'muted' : 'sound'));
    this.soundBtn.querySelector('svg').classList.add('iconbtn__svg');
  }

  show(visible = true) { this.root.hidden = !visible; }

  /** режим финала: в HUD остаются только звук и сброс */
  setCinema(on) {
    if (!this.root) return;
    this.root.classList.toggle('hud--cinema', !!on);
    // финальные сцены не вызывают show(): после перезагрузки HUD должен появиться сам
    if (on) this.root.hidden = false;
  }

  /** перерисовать панель по состоянию */
  refresh() {
    this.hearts.forEach((h, i) => {
      h.classList.toggle('is-empty', i >= state.lives);
    });
    updateHeart(this.miniHeart, state.fragmentList());
    this.progressCountEl.textContent = String(state.fragmentCount);
  }

  /** анимация «сердце потеряно» — индекс умирающего сердца */
  animateLifeLost(index) {
    const h = this.hearts[index];
    if (!h) return;
    h.classList.remove('is-lost');
    void h.offsetWidth;
    h.classList.add('is-lost');
    setTimeout(() => { h.classList.remove('is-lost'); this.refresh(); }, 340);
  }

  /** анимация «сердце восстановлено» */
  animateLifeGain(index) {
    const h = this.hearts[index];
    if (!h) return;
    h.classList.remove('is-pulse');
    void h.offsetWidth;
    h.classList.add('is-pulse');
    setTimeout(() => h.classList.remove('is-pulse'), 520);
  }

  /** пульс всего сердца при новом фрагменте */
  pulseHeart() {
    const svg = this.miniHeart;
    if (!svg) return;
    svg.classList.remove('is-beating');
    void svg.offsetWidth;
    svg.classList.add('is-beating');
    setTimeout(() => svg.classList.remove('is-beating'), 2500);
  }

  /** мигание панели прогресса */
  pulseProgress() {
    const box = $('#progress');
    if (!box) return;
    box.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }],
      { duration: 420, easing: 'cubic-bezier(.3,1.4,.5,1)' },
    );
  }

  /** координаты сердца жизни на экране (для полёта в центр) */
  heartRect(index) {
    const h = this.hearts[index] || this.hearts[this.hearts.length - 1];
    return h ? h.getBoundingClientRect() : null;
  }
}

export const hud = new Hud();
export default hud;
