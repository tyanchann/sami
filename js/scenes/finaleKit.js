/* finaleKit.js — общие детали финальных сцен:
   контейнер, планировщик автопереходов, полноэкранная canvas-подложка. */

import { el } from '../core/dom.js';
import { canvasScale, device } from '../core/device.js';

/**
 * Автопереход между финальными сценами: один таймер на сцену,
 * защита от повторного запуска и обязательная отмена при destroy.
 * Кнопок в финале больше нет — всё идёт по таймингам.
 * @param {object} ctx
 * @param {string} nextId
 * @param {number} ms
 * @param {{speed?:() => number, onExit?: () => void}} opts
 */
export function autoExit(ctx, nextId, ms, opts = {}) {
  let timer = 0;
  let fired = false;
  const speed = opts.speed || (() => 1);
  return {
    /** запустить отсчёт (повторный вызов не создаёт второй таймер) */
    start() {
      if (fired) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (fired) return;
        fired = true;
        if (opts.onExit) { try { opts.onExit(); } catch (e) { console.error('[finale] onExit', e); } }
        ctx.go(nextId);
      }, Math.max(500, Math.round(ms * speed())));
    },
    /** отменить (вызывается из destroy) */
    stop() {
      clearTimeout(timer);
      fired = true;
    },
  };
}

/** корень финальной сцены */
export function finScene(name, ...children) {
  return el('div', { class: `fin fin--${name}` }, ...children);
}

/**
 * Полноэкранная canvas-подложка: живёт прямо в #stage,
 * чтобы дождь/салют заполняли весь экран, а не только колонку сцены.
 */
export function fullCanvas(className = '', opts = {}) {
  const maxDpr = opts.maxDpr ?? 2;
  const stage = document.querySelector('#stage');
  const canvas = el('canvas', { class: `fin-bg ${className}`.trim(), 'aria-hidden': 'true' });
  stage.insertBefore(canvas, document.querySelector('#scene'));
  /* канвас непрозрачный и закрывает фон целиком: убираем декоративные слои,
     иначе композитор каждый кадр пересобирает всю страницу (замер: 35 → 60 fps) */
  stage.classList.add('stage--opaque');
  const ctx = canvas.getContext('2d', { alpha: false });
  let w = 0;
  let h = 0;
  let dpr = 1;

  const fit = () => {
    const r = canvas.getBoundingClientRect();
    w = Math.max(1, r.width);
    h = Math.max(1, r.height);
    dpr = canvasScale(canvas, w, h);
    if (dpr > maxDpr) {          // пиксельной графике хватает меньшей плотности
      dpr = maxDpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  };
  fit();
  window.addEventListener('resize', fit, { passive: true });
  window.addEventListener('orientationchange', fit, { passive: true });

  return {
    canvas,
    ctx,
    get w() { return w; },
    get h() { return h; },
    get dpr() { return dpr; },
    get lowPower() { return device.quality === 'low'; },
    fit,
    dispose() {
      window.removeEventListener('resize', fit);
      window.removeEventListener('orientationchange', fit);
      canvas.remove();
      stage.classList.remove('stage--opaque');
    },
  };
}
