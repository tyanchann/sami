/* ИГРА 5 — PIXEL MEMORY
   Шесть карточек, три пары: сердце, роза и мишка.
   Здесь нет canvas — карточки живут в DOM, чтобы переворот был по-настоящему красивым. */

import { el, wait, nextFrame } from '../core/dom.js';
import { audio } from '../core/audio.js';
import { device } from '../core/device.js';
import { state } from '../state.js';
import hud from '../ui/hud.js';
import { showFragmentReward } from '../ui/reward.js';
import { mapToSVG } from './sprites.js';

/* ---------- пиксельные рисунки ---------- */
const HEART_MAP = [
  '.##...##.',
  '####.####',
  '#########',
  '#########',
  '.#######.',
  '..#####..',
  '...###...',
  '....#....',
];
const HEART_PAL = { '#': '#e8253a' };

const ROSE_MAP = [
  '....rrrrr....',
  '..rrppppprr..',
  '.rpprrrrrppr.',
  '.rprrdddrrpr.',
  'rrprdrrrdrprr',
  'rrprdrrrdrprr',
  '.rprrdddrrpr.',
  '..rrppppprr..',
  '.....ggg.....',
  '.....ggg.....',
  '..ll.ggg.ll..',
  '.llllgggllll.',
  '.....ggg.....',
];
const ROSE_PAL = {
  r: '#d8334e', p: '#ff8fa8', d: '#8c1e33', g: '#3f7d4f', l: '#5aa06a',
};

const BEAR_MAP = [
  '..##.....##..',
  '.#bb#...#bb#.',
  '.#bbb#.#bbb#.',
  '.#bbbbbbbbb#.',
  '#bbbbbbbbbbb#',
  '#bbbbbbbbbbb#',
  '#bbeebbbeebb#',
  '#bbbbbbbbbbb#',
  '#bbbblllbbbb#',
  '#bbblllllbbb#',
  '#bbbllnllbbb#',
  '.#bblllllbb#.',
  '..#########..',
];
const BEAR_PAL = {
  '#': '#3a2318', b: '#a06a3c', l: '#d9a06a', e: '#2a1a12', n: '#2a1a12',
};

const FACES = [
  { key: 'heart', label: 'сердце', map: HEART_MAP, pal: HEART_PAL },
  { key: 'rose', label: 'роза', map: ROSE_MAP, pal: ROSE_PAL },
  { key: 'bear', label: 'мишка', map: BEAR_MAP, pal: BEAR_PAL },
];

/* ---------- сцена ---------- */
export function createMemoryScene(ctx) {
  let layout = [];        // индексы карточек → ключ рисунка
  let opened = [];        // индексы открытых сейчас
  let matched = new Set();
  let locked = true;
  let started = false;
  let cardEls = [];
  let view = null;
  let overlayEl = null;
  let offs = [];

  function buildLayout() {
    const keys = [0, 0, 1, 1, 2, 2];
    // перемешивание Фишера—Йетса
    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [keys[i], keys[j]] = [keys[j], keys[i]];
    }
    return keys;
  }

  function cardNode(index) {
    const face = FACES[layout[index]];
    const back = el('span', { class: 'mcard__face mcard__face--back' });
    back.appendChild(mapToSVG(HEART_MAP, HEART_PAL, 'mcard__backArt'));
    const front = el('span', { class: 'mcard__face mcard__face--front' });
    front.appendChild(mapToSVG(face.map, face.pal, 'mcard__art'));
    const inner = el('span', { class: 'mcard__inner' }, back, front);

    const btn = el('button', {
      class: 'mcard', type: 'button', 'data-index': String(index),
      'aria-label': 'карточка',
    }, inner);
    btn.addEventListener('click', () => onCard(index, btn));
    return btn;
  }

  async function onCard(index, btn) {
    if (!started || locked) return;
    if (btn.classList.contains('is-open') || btn.classList.contains('is-matched')) return;
    if (opened.length >= 2) return;

    audio.flip();
    btn.classList.add('is-open');
    opened.push(index);

    if (opened.length < 2) return;

    const [a, b] = opened;
    const same = layout[a] === layout[b];

    if (same) {
      locked = true;
      await wait(500);
      cardEls[a].classList.add('is-matched');
      cardEls[b].classList.add('is-matched');
      matched.add(a); matched.add(b);
      audio.match();
      if (matched.size === layout.length) {
        locked = true;
        await wait(520);
        await finish();
      } else {
        opened = [];
        locked = false;
      }
    } else {
      locked = true;
      await wait(device.reducedMotion ? 420 : 1150);
      cardEls[a].classList.remove('is-open');
      cardEls[b].classList.remove('is-open');
      opened = [];
      locked = false;
      audio.click();
    }
  }

  function buildBoard() {
    const board = el('div', { class: 'memory__board' });
    cardEls = [];
    layout.forEach((_, i) => {
      const c = cardNode(i);
      cardEls.push(c);
      board.appendChild(c);
    });
    return board;
  }

  function buildOverlay() {
    const panel = el('div', { class: 'game__panel' },
      el('h3', { class: 'game__panelTitle', text: 'Память' }),
      el('ul', { class: 'game__rules' },
        el('li', { text: 'Открывай по две карточки и находи пары.' }),
        el('li', { text: 'Три пары: сердце, роза и мишка.' }),
        el('li', { text: 'Найди все — и фрагмент твой.' }),
      ),
    );
    const btn = el('button', { class: 'btn btn--rose btn--wide', type: 'button', text: 'начать' });
    panel.appendChild(btn);
    btn.addEventListener('click', () => {
      audio.unlock();
      audio.click();
      overlayEl.classList.remove('is-on');
      peek();                      // карточки ненадолго открываются — время запомнить
    });
    return panel;
  }

  /** показ всех карточек перед игрой: 1.6 с, затем доска закрывается и игра идёт */
  async function peek() {
    const live = cardEls.filter(Boolean);
    if (!live.length) { started = true; locked = false; return; }
    locked = true;
    live.forEach((c) => c.classList.add('is-open'));
    await wait(device.reducedMotion ? 900 : 1600);
    if (!live.every((c) => c.isConnected)) return;   // сцену уже закрыли
    live.forEach((c) => { if (!c.classList.contains('is-matched')) c.classList.remove('is-open'); });
    started = true;
    locked = false;
  }

  async function finish() {
    audio.win();
    state.markGameWon('memory');
    await showFragmentReward(7, {
      from: { x: window.innerWidth / 2, y: window.innerHeight * 0.62 },
    });
    ctx.go(ctx.nextSceneId());
  }

  return {
    id: 'memory',

    mount(container) {
      hud.show(true);
      layout = buildLayout();
      opened = [];
      matched = new Set();
      locked = true;
      started = false;

      const board = buildBoard();
      const boardWrap = el('div', { class: 'memory__wrap' }, board);

      overlayEl = el('div', { class: 'memory__overlay is-on' }, buildOverlay());
      boardWrap.appendChild(overlayEl);

      view = el('div', { class: 'game memory' },
        el('div', { class: 'game__head' },
          el('p', { class: 'kicker', text: 'испытание 5 из 5' }),
          el('h2', { class: 'game__title', text: 'Память' }),
        ),
        boardWrap,
        el('p', { class: 'game__hint', text: 'найди три пары: сердце, роза, мишка' }),
      );

      nextFrame().then(() => view.classList.add('memory--in'));
      return view;
    },

    destroy() {
      offs.forEach((f) => f());
      offs.length = 0;
      locked = true;
      started = false;
    },

    /** только для автотестов: какие рисунки где лежат */
    _layout() { return layout.slice(); },
  };
}
