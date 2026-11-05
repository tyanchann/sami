/* state.js — единственный источник истины + сохранение в localStorage */

const SAVE_KEY = 'samina.love.save.v1';

export const TOTAL_FRAGMENTS = 8;
export const MAX_LIVES = 5;
export const GAME_IDS = ['bow', 'drive', 'runner', 'catch', 'memory'];

const defaults = () => ({
  v: 1,
  fragments: new Array(TOTAL_FRAGMENTS).fill(false),
  lives: MAX_LIVES,
  questionsDone: 0,      // сколько вопросов пройдено (0..3)
  gamesWon: [],          // ['bow','drive',...]
  scene: 'intro',        // текущая сцена (для восстановления после перезагрузки)
  muted: false,
  visitedIntro: false,
  lastPlayed: 0,
});

function load() {
  const base = defaults();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return base;
    const merged = { ...base, ...saved };
    // страховки от битых данных
    // строго: только массив из 8 булевых; иначе — чистый прогресс
    merged.fragments = Array.from({ length: TOTAL_FRAGMENTS },
      (_, i) => !!(Array.isArray(saved.fragments) && saved.fragments[i] === true));
    merged.gamesWon = Array.isArray(saved.gamesWon)
      ? saved.gamesWon.filter((g) => GAME_IDS.includes(g)) : [];
    merged.lives = Number.isInteger(saved.lives) ? Math.max(0, Math.min(MAX_LIVES, saved.lives)) : MAX_LIVES;
    merged.questionsDone = Math.max(0, Math.min(3, Number(saved.questionsDone) || 0));
    merged.muted = saved.muted === true;   // только настоящее true, а не 'да'/1
    merged.visitedIntro = !!saved.visitedIntro;
    return merged;
  } catch (_) {
    return base;
  }
}

class GameState {
  constructor() {
    this.data = load();
    this._subs = new Set();
    this._saveTimer = 0;
    this.available = (() => {
      try { localStorage.setItem('samina.test', '1'); localStorage.removeItem('samina.test'); return true; }
      catch (_) { return false; }
    })();
  }

  /* ---------- подписка ---------- */
  subscribe(fn) { this._subs.add(fn); return () => this._subs.delete(fn); }
  emit(reason = 'change') { this._subs.forEach((fn) => { try { fn(this, reason); } catch (e) { console.error(e); } }); }

  /* ---------- сохранение ---------- */
  save(immediate = false) {
    if (!this.available) return;
    clearTimeout(this._saveTimer);
    if (immediate) { this._write(); return; }
    this._saveTimer = setTimeout(() => this._write(), 90);
  }

  _write() {
    this.data.lastPlayed = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); }
    catch (_) { /* переполнение или приватный режим — не критично */ }
  }

  /** записать прямо сейчас (перед уходом со страницы) */
  flush() {
    clearTimeout(this._saveTimer);
    if (this.available) this._write();
  }

  commit(reason, immediate = false) { this.save(immediate); this.emit(reason); }

  /** подписка на «страница уходит» — чтобы ничего не терялось */
  bindExitFlush() {
    const flush = () => this.flush();
    window.addEventListener('pagehide', flush, { passive: true });
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); }, { passive: true });
  }

  /* ---------- фрагменты ---------- */
  get fragmentCount() { return this.data.fragments.filter(Boolean).length; }
  get allFragments() { return this.fragmentCount === TOTAL_FRAGMENTS; }
  hasFragment(id) { return !!this.data.fragments[id]; }

  /** вернуть true, если фрагмент действительно выдан впервые */
  addFragment(id) {
    if (id < 0 || id >= TOTAL_FRAGMENTS) return false;
    if (this.data.fragments[id]) return false;
    this.data.fragments[id] = true;
    this.commit('fragment');
    return true;
  }

  fragmentList() {
    return this.data.fragments.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  }

  /* ---------- жизни ---------- */
  get lives() { return this.data.lives; }

  loseLife() {
    this.data.lives = Math.max(0, this.data.lives - 1);
    this.commit('life');
    return this.data.lives;
  }

  refillLives(n = MAX_LIVES) {
    this.data.lives = n;
    this.commit('life');
    return this.data.lives;
  }

  get isDead() { return this.data.lives <= 0; }

  /* ---------- вопросы ---------- */
  get questionsDone() { return this.data.questionsDone; }
  markQuestionDone(n) {
    this.data.questionsDone = Math.max(this.data.questionsDone, n);
    this.commit('question');
  }

  /* ---------- мини-игры ---------- */
  hasWonGame(id) { return this.data.gamesWon.includes(id); }
  markGameWon(id) {
    if (!this.data.gamesWon.includes(id)) {
      this.data.gamesWon.push(id);
      this.commit('game');
    }
  }

  /* ---------- сцена / настройки ---------- */
  setScene(name) {
    if (this.data.scene === name) return;
    this.data.scene = name;
    this.save();
  }
  get scene() { return this.data.scene; }

  get muted() { return this.data.muted; }
  setMuted(m) { this.data.muted = !!m; this.commit('mute', true); }

  /* ---------- сброс ---------- */
  resetProgress() {
    const muted = this.data.muted;
    this.data = defaults();
    this.data.muted = muted;
    this.commit('reset');
  }

  resetAll() {
    this.data = defaults();
    if (this.available) { try { localStorage.removeItem(SAVE_KEY); } catch (_) {} }
    this.commit('reset');
  }
}

export const state = new GameState();
state.bindExitFlush();
export default state;
