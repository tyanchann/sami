/* retry.js — экран повторной попытки, когда жизни закончились.
   Игра никогда не «зависает»: прогресс сохраняется, 5 жизней возвращаются. */

import { el, wait, nextFrame } from '../core/dom.js';
import { audio } from '../core/audio.js';
import { buildHeart } from './heart.js';

/**
 * @param {{title?:string, text?:string, button?:string}} opts
 * @returns {Promise<boolean>} true, когда игрок решил продолжить
 */
export function showRetry(opts = {}) {
  const {
    title = 'Сердце разбилось',
    text = 'Но это не конец. Все собранные фрагменты на месте — попробуй ещё раз.',
    button = 'Попробовать снова',
  } = opts;

  return new Promise((resolve) => {
    const stage = document.querySelector('#stage');
    const overlay = el('div', { class: 'retry', role: 'dialog', 'aria-modal': 'true' });
    const box = el('div', { class: 'retry__box' });

    const heartWrap = el('div', { class: 'retry__heart heart-float' });
    heartWrap.appendChild(buildHeart({ collected: [], classes: 'heart-svg', label: 'Разбитое сердце' }));

    const h = el('h2', { class: 'retry__title', text: title });
    const p = el('p', { class: 'retry__text', text });
    const btn = el('button', { class: 'btn btn--rose', type: 'button', text: button });
    btn.setAttribute('aria-label', button);

    box.append(heartWrap, h, p, btn);
    overlay.appendChild(box);
    stage.appendChild(overlay);

    audio.lose();

    const close = async () => {
      btn.removeEventListener('click', close);
      document.removeEventListener('keydown', onKey);
      overlay.classList.remove('is-in');
      await wait(260);
      overlay.remove();
      resolve(true);
    };
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); }
    };

    btn.addEventListener('click', close);
    document.addEventListener('keydown', onKey);

    nextFrame().then(() => { overlay.classList.add('is-in'); btn.focus({ preventScroll: true }); });
  });
}
