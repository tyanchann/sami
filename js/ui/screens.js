/* screens.js — управление сценами, переходы, вспышки, модальные окна */

import { $, el, wait, nextFrame } from '../core/dom.js';
import { audio } from '../core/audio.js';

export class Screens {
  constructor() {
    this.sceneEl = $('#scene');
    this.wipeEl = $('#wipe');
    this.flashEl = $('#flash');
    this.modalEl = $('#modal');
    this.current = null;      // { id, destroy }
    this.viewEl = null;
    this._busy = false;
    this._buildWipe();
    this._wireModal();
  }

  _buildWipe() {
    const cols = 8;
    for (let i = 0; i < cols; i++) {
      const s = el('span');
      if (i % 2 === 1) s.style.transitionDelay = `${i * 16}ms`;
      else s.style.transitionDelay = `${(cols - i) * 10}ms`;
      this.wipeEl.appendChild(s);
    }
  }

  /* ---------- переход между сценами ---------- */
  /**
   * @param {{id:string, mount:(c:HTMLElement)=>HTMLElement|void, destroy:()=>void}} scene
   * @param {{wipe?:boolean, delay?:number}} opts
   */
  async show(scene, opts = {}) {
    const { wipe = true, delay = 0 } = opts;
    if (this._busy) { // не даём наслаивать переходы
      await wait(240);
    }
    this._busy = true;

    if (this.current && wipe) await this._wipeOn();
    if (delay) await wait(delay);

    // уничтожаем старую сцену
    if (this.current) {
      try { this.current.destroy(); } catch (e) { console.error('[screens] destroy', e); }
      this.current = null;
    }
    this.sceneEl.innerHTML = '';
    this.viewEl = null;

    // монтируем новую (mount может оказаться асинхронным — дожидаемся)
    const view = await scene.mount(this.sceneEl);
    this.viewEl = view || this.sceneEl.firstElementChild;
    // сцена может вернуть свой корень — тогда добавляем его в контейнер
    if (view && view.parentNode !== this.sceneEl) this.sceneEl.appendChild(view);
    this.current = scene;

    if (this.viewEl) {
      this.viewEl.classList.add('view');
      await nextFrame();
      this.viewEl.classList.add('is-in');
    }

    if (this.current && wipe) await this._wipeOff();
    this._busy = false;
  }

  async _wipeOn() {
    const w = this.wipeEl;
    w.classList.remove('is-off');
    w.classList.add('is-on');
    // старый экран мягко уходит
    if (this.viewEl) this.viewEl.classList.add('is-out');
    await wait(300);
  }

  async _wipeOff() {
    const w = this.wipeEl;
    w.classList.add('is-off');
    await wait(70);
    w.classList.remove('is-on');
    await wait(260);
    w.classList.remove('is-off');
  }

  /* ---------- вспышки экрана ---------- */
  flash(kind = 'wrong') {
    const f = this.flashEl;
    f.classList.remove('is-wrong', 'is-right');
    void f.offsetWidth;
    f.classList.add(kind === 'right' ? 'is-right' : 'is-wrong');
    setTimeout(() => f.classList.remove('is-wrong', 'is-right'), 420);
  }

  /* ---------- модальные окна ---------- */
  _wireModal() {
    this.modalTitle = $('#modal-title');
    this.modalText = $('#modal-text');
    this.modalOk = $('#modal-ok');
    this.modalCancel = $('#modal-cancel');
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl && this._modalResolve) this._closeModal(false);
    });
    this.modalOk.addEventListener('click', () => { audio.click(); this._closeModal(true); });
    this.modalCancel.addEventListener('click', () => { audio.click(); this._closeModal(false); });
    document.addEventListener('keydown', (e) => {
      if (this.modalEl.hidden) return;
      if (e.key === 'Escape') this._closeModal(false);
      if (e.key === 'Enter') this._closeModal(true);
    });
  }

  /** @returns {Promise<boolean>} */
  confirm({ title = '', text = '', ok = 'Да', cancel = 'Отмена' } = {}) {
    this.modalTitle.textContent = title;
    this.modalText.textContent = text;
    this.modalOk.textContent = ok;
    this.modalCancel.textContent = cancel;
    this.modalEl.hidden = false;
    this.modalOk.focus({ preventScroll: true });
    return new Promise((resolve) => { this._modalResolve = resolve; });
  }

  _closeModal(result) {
    const resolve = this._modalResolve;
    this._modalResolve = null;
    this.modalEl.hidden = true;
    if (resolve) resolve(result);
  }

  /** блокировать интерфейс на время длинного перехода */
  get busy() { return this._busy; }
}

export const screens = new Screens();
export default screens;
