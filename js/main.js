/* main.js — точка входа: маршрутизация сцен, запуск HUD, глобальные события */

import { initDevice, device } from './core/device.js';
import { audio } from './core/audio.js';
import { state } from './state.js';
import screens from './ui/screens.js';
import hud from './ui/hud.js';
import { createIntroScene } from './scenes/intro.js';
import { createQuestionsScene } from './scenes/questions.js';
import { createInterludeScene } from './scenes/interlude.js';
import { createBowScene } from './games/bow.js';
import { createDriveScene } from './games/drive.js';
import { createRunnerScene } from './games/runner.js';
import { createCatchScene } from './games/catch.js';
import { createMemoryScene } from './games/memory.js';
import { createAssemblyScene } from './scenes/assembly.js';
import { createEyesScene } from './scenes/eyes.js';
import { createMatrixScene } from './scenes/matrix.js';
import { createRoseScene } from './scenes/rose.js';
import { createFireworksScene } from './scenes/fireworks.js';
import { createPhotosScene } from './scenes/photos.js';
import { createCardScene } from './scenes/card.js';
import { fx } from './ui/fx.js';
import { $ } from './core/dom.js';

/* ---------- реестр сцен ----------
   Каждая сцена: createScene(ctx) => { id, mount(container), destroy() }.
   Дальше этапы будут добавлять сюда вопросы, мини-игры и финальные сцены. */
const FACTORY = {
  intro: createIntroScene,
  questions: createQuestionsScene,
  interlude: createInterludeScene,
  'game:bow': createBowScene,
  'game:drive': createDriveScene,
  'game:runner': createRunnerScene,
  'game:catch': createCatchScene,
  'game:memory': createMemoryScene,
  assembly: createAssemblyScene,
  eyes: createEyesScene,
  matrix: createMatrixScene,
  rose: createRoseScene,
  fireworks: createFireworksScene,
  photos: createPhotosScene,
  card: createCardScene,
};

/* порядок финала: каждая сцена знает свою следующую */
export const FINALE_NEXT = {
  assembly: 'eyes',
  eyes: 'matrix',
  matrix: 'rose',
  rose: 'fireworks',
  fireworks: 'photos',
  photos: 'card',
  card: null,
};

const ctx = {
  state,
  audio,
  hud,
  screens,
  device,
  go,
  nextSceneId,
};

let currentId = 'intro';
let currentScene = null;

export async function go(id, opts = {}) {
  const factory = FACTORY[id];
  if (!factory) {
    console.warn('[route] сцена не зарегистрирована:', id);
    await screens.confirm({
      title: 'Дальше — следующий этап',
      text: 'Эта сцена появится на следующем шаге разработки.',
      ok: 'Хорошо',
      cancel: 'Назад',
    });
    return;
  }
  if (id === 'intro') audio.stopMusic(0.7);
  /* убираем возможные «висящие» оверлеи (экран повтора), чтобы они не накрыли новую сцену */
  document.querySelectorAll('#stage > .retry, #stage > .reward').forEach((n) => n.remove());
  currentId = id;
  state.setScene(id);
  const scene = factory(ctx);
  currentScene = scene;
  await screens.show(scene, opts);
}

/** какая сцена должна идти следующей по прогрессу */
export function nextSceneId() {
  if (state.questionsDone < 3) return 'questions';
  const order = ['bow', 'drive', 'runner', 'catch', 'memory'];
  for (const g of order) if (!state.hasWonGame(g)) return 'game:' + g;
  return 'assembly';
}

/* ---------- эффект «пиксельного нажатия» на тач-устройствах ---------- */
function wireTapFeedback() {
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    btn.style.setProperty('--px', `${e.clientX - r.left}px`);
    btn.style.setProperty('--py', `${e.clientY - r.top}px`);
    btn.classList.add('is-tapped');
    setTimeout(() => btn.classList.remove('is-tapped'), 140);
  }, { passive: true });
}

/* ---------- разблокировка звука по первому жесту ---------- */
function wireAudioUnlock() {
  const unlock = () => {
    audio.unlock();
    audio.setMuted(state.muted);
  };
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true });
}

/* ---------- запуск ---------- */
async function boot() {
  initDevice();
  fx.init($('#fx'));
  wireTapFeedback();
  wireAudioUnlock();

  hud.init({
    onReset: () => { go('intro', { wipe: true }); },
  });
  audio.setMuted(state.muted);

  // восстановление прогресса: если игра уже начата — продолжаем с нужной сцены
  const saved = state.scene;
  const known = Object.keys(FACTORY);
  const startAt = saved && known.includes(saved) && saved !== 'intro' ? saved : 'intro';

  await go(startAt, { wipe: false });
  document.documentElement.classList.add('ready');
}

boot().catch((err) => {
  console.error('[boot]', err);
});

/* ---------- отладочный/тестовый доступ (безопасно, только локально) ---------- */
window.__SAMINA = {
  get state() { return state; },
  hud, screens, audio, device, fx,
  go,
  nextSceneId,
  FINALE_NEXT,
  get sceneId() { return currentId; },
  get scene() { return currentScene; },
  version: '1.0.0',
};
