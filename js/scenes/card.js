/* card.js — финал, шаг 7: открытка.
   Маленькие мишки-наклейки по четырём углам, в центре — текст автора,
   вставленный дословно (см. js/data/texts.js). */

import { el } from '../core/dom.js';
import { audio } from '../core/audio.js';
import { hud } from '../ui/hud.js';
import { buildHeart } from '../ui/heart.js';
import { bearSticker } from '../ui/bears.js';
import { CARD_TEXT } from '../data/texts.js';
import { finScene } from './finaleKit.js';
import { MUSIC_SRC } from './photos.js';

/** маленький пиксельный шеврон «листай вниз» */
function chevronSVG() {
  const rows = ['.#####.', '..###..', '...#...'];
  const NS = 'http://www.w3.org/2000/svg';
  const root = document.createElementNS(NS, 'svg');
  root.setAttribute('viewBox', '0 0 7 3');
  root.setAttribute('class', 'card__chev');
  root.setAttribute('aria-hidden', 'true');
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== '#') return;
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', String(x));
    r.setAttribute('y', String(y));
    r.setAttribute('width', '1.02');
    r.setAttribute('height', '1.02');
    r.setAttribute('fill', 'currentColor');
    root.appendChild(r);
  }));
  return root;
}

const STICKERS = [
  { kind: 'heart', pos: 'tl', rot: 6, flip: false, label: 'мишка с сердечком' },
  { kind: 'rose', pos: 'tr', rot: -7, flip: true, label: 'мишка с розочкой' },
  { kind: 'hug', pos: 'bl', rot: -6, flip: false, label: 'обнимающий мишка' },
  { kind: 'bow', pos: 'br', rot: 8, flip: true, label: 'мишка с бантиком' },
];

export function createCardScene() {
  let offs = [];

  return {
    id: 'card',

    mount() {
      hud.setCinema(true);

      /* если открытку открыли сразу после перезагрузки — музыка включается здесь
         (при первом касании экрана, автозапуска без жеста нет) */
      if (!audio.musicEl) audio.attachMusic(MUSIC_SRC, { loop: true, volume: 0.30 });
      audio.playMusic();

      const sheet = el('article', { class: 'card__sheet', 'aria-label': 'открытка' });

      for (const s of STICKERS) {
        const sticker = bearSticker(s.kind, { rotate: s.rot, flip: s.flip, label: s.label });
        sticker.classList.add('card__sticker', `card__sticker--${s.pos}`);
        sheet.appendChild(sticker);
      }

      const text = el('p', { class: 'card__text', text: CARD_TEXT });
      const sign = el('div', { class: 'card__sign' },
        buildHeart({ collected: [0, 1, 2, 3, 4, 5, 6, 7], classes: 'heart-svg card__signHeart', label: 'сердце' }));
      const scroll = el('div', { class: 'card__scroll', tabindex: '0' }, text, sign);

      const hint = el('span', { class: 'card__hint', 'aria-hidden': 'true' }, chevronSVG());

      sheet.append(scroll, hint);
      const view = finScene('card', sheet);

      // мягкий «вздох» музыкой уже играет; тут только тихий звук открытки
      setTimeout(() => { if (sheet.isConnected) audio.pickup(); }, 400);

      // подсказка о прокрутке гаснет, как только текст тронули
      const onScroll = () => {
        if (scroll.scrollTop > 24) {
          sheet.classList.add('is-scrolled');
          scroll.removeEventListener('scroll', onScroll);
        }
      };
      scroll.addEventListener('scroll', onScroll, { passive: true });
      offs.push(() => scroll.removeEventListener('scroll', onScroll));

      return view;
    },

    destroy() {
      offs.forEach((f) => f());
      offs = [];
      audio.stopMusic(1.4);
      hud.setCinema(false);
    },
  };
}
