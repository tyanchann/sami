/* photos.js — финал, шаг 6: три фотографии по очереди под нежную музыку.

   Загрузка: fetch → blob → objectURL, затем запасной прямой <img>, затем
   аккуратная пиксельная «рамка для фото». Пропорции не искажаются: object-fit: contain.
   Фотографии сменяются САМИ по таймеру (кнопок нет); касание лишь ускоряет показ. */

import { el } from '../core/dom.js';
import { audio } from '../core/audio.js';
import { device } from '../core/device.js';
import { hud } from '../ui/hud.js';
import { finScene } from './finaleKit.js';

export const PHOTO_FILES = [
  './assets/photos/image.png',
  './assets/photos/image1.png',
  './assets/photos/image2.png',
];

export const MUSIC_SRC = './assets/music/daisy.mp3';

/** загрузка одного фото с двумя запасными путями */
async function loadPhoto(src) {
  try {
    const res = await fetch(src, { cache: 'force-cache' });
    if (res.status === 404) return null;      // файла нет — сразу слот, без второго запроса
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (!blob.size) throw new Error('пустой файл');
    return { url: URL.createObjectURL(blob), revoke: true };
  } catch (_) {
    const direct = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth > 0);
      img.onerror = () => resolve(false);
      img.src = src;
    });
    return direct ? { url: src, revoke: false } : null;
  }
}

function slotNode(index) {
  const slot = el('div', { class: 'photo__slot' },
    el('p', { class: 'photo__slotText', text: 'здесь будет фото' }),
    el('p', { class: 'photo__slotPath', text: PHOTO_FILES[index] }),
  );
  return slot;
}

export function createPhotosScene(ctx) {
  let index = 0;
  let loaded = [];
  let urls = [];
  let frameEl = null;
  let dotsEl = null;
  let alive = true;
  let holdTimer = 0;
  let finished = false;

  /** сколько держим одну фотографию (при «уменьшенном движении» — меньше) */
  const HOLD = () => (device.reducedMotion ? 2600 : 4800);

  function clearHold() { clearTimeout(holdTimer); holdTimer = 0; }

  /** планируем следующий шаг: либо следующее фото, либо открытка */
  function schedule() {
    clearHold();
    if (!alive || finished) return;
    holdTimer = setTimeout(next, HOLD());
  }

  function paintDots() {
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    for (let i = 0; i < PHOTO_FILES.length; i++) {
      dotsEl.appendChild(el('span', { class: 'photo__dot' + (i === index ? ' is-on' : '') }));
    }
  }

  function showPhoto() {
    if (!alive || !frameEl) return;
    frameEl.innerHTML = '';
    const item = loaded[index];

    if (item && item.url) {
      const img = el('img', {
        class: 'photo__img',
        src: item.url,
        alt: 'наше фото',
        decoding: 'async',
        draggable: 'false',
      });
      img.addEventListener('load', () => img.classList.add('is-ready'), { once: true });
      frameEl.appendChild(img);
    } else {
      frameEl.appendChild(slotNode(index));
    }
    paintDots();
  }

  function next() {
    if (!alive || finished) return;
    if (index < PHOTO_FILES.length - 1) {
      index++;
      audio.click();
      showPhoto();
      schedule();
      return;
    }
    finished = true;
    clearHold();
    ctx.go('card');
  }

  return {
    id: 'photos',

    mount() {
      hud.setCinema(true);

      // музыка — только после первого касания (мы уже нажали стрелку на прошлой сцене)
      audio.attachMusic(MUSIC_SRC, { loop: true, volume: 0.34 });
      audio.playMusic();

      frameEl = el('div', { class: 'photo__frame' });
      dotsEl = el('div', { class: 'photo__dots', 'aria-hidden': 'true' });
      const view = finScene('photos', frameEl, dotsEl);

      // касание/клик ускоряет показ, но ничего нажимать не обязательно
      view.addEventListener('pointerup', () => next());

      // грузим все три заранее (не блокируя монтирование сцены)
      (async () => {
        const results = await Promise.all(PHOTO_FILES.map((src) => loadPhoto(src).catch(() => null)));
        if (!alive) {
          results.forEach((r) => r && r.revoke && URL.revokeObjectURL(r.url));
          return;
        }
        loaded = results;
        urls = results.filter((r) => r && r.revoke).map((r) => r.url);
        showPhoto();
        schedule();
      })();

      return view;
    },

    destroy() {
      alive = false;
      clearHold();
      finished = true;
      urls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (_) {} });
      urls = [];
      loaded = [];
      // музыку не глушим: она продолжает играть в открытке
      hud.setCinema(false);
    },
  };
}
