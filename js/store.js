// Camada de dados: tudo fica salvo no localStorage do navegador (por
// aparelho) e, se o Firebase estiver configurado e você estiver logada,
// também sincroniza com a nuvem (ver firebase.js).

const KEY = 'minhaAgenda:v1';

const DEFAULT_CATEGORIES = [
  { id: 'aula', name: 'Aula', color: 'sage', icon: 'book' },
  { id: 'trabalho', name: 'Trabalho', color: 'cocoa', icon: 'layers' },
  { id: 'pessoal', name: 'Pessoal', color: 'mauve', icon: 'heart' },
  { id: 'outro', name: 'Outro', color: 'blush', icon: 'tag' }
];

const DEFAULT_DATA = {
  profile: { name: 'Você', course: '', photoURL: null },
  prefs: { theme: 'auto', accent: 'cocoa', statColors: { done: 'sage', pending: 'cocoa', habits: 'mauve', events: 'blush' } },
  tasks: [],
  events: [],
  habits: [],
  notes: [],
  links: [],
  areas: [],
  categories: DEFAULT_CATEGORIES,
  routines: []
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw);
    const merged = { ...structuredClone(DEFAULT_DATA), ...parsed };
    merged.prefs = { ...structuredClone(DEFAULT_DATA.prefs), ...(parsed.prefs || {}) };
    merged.prefs.statColors = { ...structuredClone(DEFAULT_DATA.prefs.statColors), ...((parsed.prefs || {}).statColors || {}) };
    return merged;
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

let data = load();
const listeners = new Set();
let remotePush = null;
let applyingRemote = false;

function save() {
  localStorage.setItem(KEY, JSON.stringify(data));
  listeners.forEach((fn) => fn());
  if (remotePush && !applyingRemote) remotePush(data);
}

export const store = {
  get: () => data,

  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  updateProfile(patch) {
    data.profile = { ...data.profile, ...patch };
    save();
  },
  updatePrefs(patch) {
    data.prefs = { ...data.prefs, ...patch };
    save();
  },

  addTask(task) {
    data.tasks.push({
      id: uid(), title: '', description: '', done: false, priority: 'media', color: 'cocoa',
      eventId: null, areaId: null, dueDate: null, plannedDate: null, time: null,
      estimatedDuration: null, subtasks: [], someday: false, completedAt: null, createdAt: Date.now(), ...task
    });
    save();
  },
  updateTask(id, patch) {
    data.tasks = data.tasks.map((t) => {
      if (t.id !== id) return t;
      const next = { ...t, ...patch };
      // Guarda quando a tarefa foi concluída, pra dar pra ver o que foi
      // feito na semana na Revisão semanal — sem exigir nada extra da pessoa.
      if (patch.done === true && !t.done) next.completedAt = Date.now();
      if (patch.done === false) next.completedAt = null;
      return next;
    });
    save();
  },
  deleteTask(id) {
    data.tasks = data.tasks.filter((t) => t.id !== id);
    save();
  },
  duplicateTask(id) {
    const t = data.tasks.find((x) => x.id === id);
    if (!t) return;
    data.tasks.push({ ...t, id: uid(), title: `${t.title} (cópia)`, done: false, createdAt: Date.now() });
    save();
  },

  addArea(a) {
    data.areas.push({ id: uid(), name: '', color: 'cocoa', icon: 'star', ...a });
    save();
  },
  updateArea(id, patch) {
    data.areas = data.areas.map((a) => (a.id === id ? { ...a, ...patch } : a));
    save();
  },
  deleteArea(id) {
    data.areas = data.areas.filter((a) => a.id !== id);
    data.tasks = data.tasks.map((t) => (t.areaId === id ? { ...t, areaId: null } : t));
    data.events = data.events.map((e) => (e.areaId === id ? { ...e, areaId: null } : e));
    data.notes = data.notes.map((n) => (n.areaId === id ? { ...n, areaId: null } : n));
    save();
  },

  addEvent(ev) {
    data.events.push({ id: uid(), title: '', repeat: 'none', category: 'pessoal', endTime: null, areaId: null, ...ev });
    save();
  },
  updateEvent(id, patch) {
    data.events = data.events.map((e) => (e.id === id ? { ...e, ...patch } : e));
    save();
  },
  deleteEvent(id) {
    data.events = data.events.filter((e) => e.id !== id);
    // desvincula tarefas que apontavam pra esse evento
    data.tasks = data.tasks.map((t) => (t.eventId === id ? { ...t, eventId: null } : t));
    save();
  },

  addHabit(h) {
    data.habits.push({
      id: uid(), name: '', description: '', history: [], logs: {}, color: 'sage', icon: 'flame',
      type: 'yesno', goal: null, unit: '', preferredTime: null,
      frequency: { kind: 'daily' }, ...h
    });
    save();
  },
  updateHabit(id, patch) {
    data.habits = data.habits.map((h) => (h.id === id ? { ...h, ...patch } : h));
    save();
  },
  toggleHabitOn(id, dateISO) {
    data.habits = data.habits.map((h) => {
      if (h.id !== id) return h;
      const has = h.history.includes(dateISO);
      return { ...h, history: has ? h.history.filter((d) => d !== dateISO) : [...h.history, dateISO] };
    });
    save();
  },
  toggleHabitToday(id) {
    this.toggleHabitOn(id, new Date().toISOString().slice(0, 10));
  },
  // Pra hábitos de quantidade/duração/contagem: registra o valor do dia e
  // marca (ou desmarca) a data como concluída quando bate a meta.
  setHabitProgress(id, dateISO, value) {
    data.habits = data.habits.map((h) => {
      if (h.id !== id) return h;
      const logs = { ...(h.logs || {}) };
      if (value > 0) logs[dateISO] = value;
      else delete logs[dateISO];
      const metGoal = h.goal ? value >= h.goal : value > 0;
      const has = h.history.includes(dateISO);
      let history = h.history;
      if (metGoal && !has) history = [...h.history, dateISO];
      if (!metGoal && has) history = h.history.filter((d) => d !== dateISO);
      return { ...h, logs, history };
    });
    save();
  },
  deleteHabit(id) {
    data.habits = data.habits.filter((h) => h.id !== id);
    save();
  },

  addRoutine(r) {
    data.routines.push({ id: uid(), name: '', items: [], frequency: { kind: 'daily' }, completions: {}, ...r });
    save();
  },
  updateRoutine(id, patch) {
    data.routines = data.routines.map((r) => (r.id === id ? { ...r, ...patch } : r));
    save();
  },
  deleteRoutine(id) {
    data.routines = data.routines.filter((r) => r.id !== id);
    save();
  },
  toggleRoutineItem(id, itemId, dateISO) {
    data.routines = data.routines.map((r) => {
      if (r.id !== id) return r;
      const done = new Set(r.completions[dateISO] || []);
      if (done.has(itemId)) done.delete(itemId); else done.add(itemId);
      return { ...r, completions: { ...r.completions, [dateISO]: [...done] } };
    });
    save();
  },

  addCategory(c) {
    data.categories.push({ id: uid(), name: '', color: 'cocoa', icon: 'tag', ...c });
    save();
  },
  updateCategory(id, patch) {
    data.categories = data.categories.map((c) => (c.id === id ? { ...c, ...patch } : c));
    save();
  },
  deleteCategory(id) {
    if (data.categories.length <= 1) return;
    data.categories = data.categories.filter((c) => c.id !== id);
    const fallback = data.categories[0].id;
    data.events = data.events.map((e) => (e.category === id ? { ...e, category: fallback } : e));
    save();
  },

  addLink(l) {
    data.links.push({ id: uid(), title: '', url: '', ...l });
    save();
  },
  updateLink(id, patch) {
    data.links = data.links.map((l) => (l.id === id ? { ...l, ...patch } : l));
    save();
  },
  deleteLink(id) {
    data.links = data.links.filter((l) => l.id !== id);
    save();
  },

  addNote(n) {
    data.notes.push({
      id: uid(), title: '', text: '', pinned: false, archived: false, color: null,
      type: 'text', items: [], tags: [], areaId: null, date: todayISO(), createdAt: Date.now(), ...n
    });
    save();
  },
  updateNote(id, patch) {
    data.notes = data.notes.map((n) => (n.id === id ? { ...n, ...patch } : n));
    save();
  },
  deleteNote(id) {
    data.notes = data.notes.filter((n) => n.id !== id);
    save();
  },
  toggleNoteItem(id, itemId) {
    data.notes = data.notes.map((n) => {
      if (n.id !== id) return n;
      const items = (n.items || []).map((it) => (it.id === itemId ? { ...it, done: !it.done } : it));
      return { ...n, items };
    });
    save();
  },

  exportBackup() {
    return JSON.stringify(data, null, 2);
  },
  importBackup(json) {
    const parsed = JSON.parse(json);
    data = { ...structuredClone(DEFAULT_DATA), ...parsed };
    save();
  },
  wipeAll() {
    data = structuredClone(DEFAULT_DATA);
    save();
  },

  // --- sincronização (usado por firebase.js) ---
  _setRemotePush(fn) {
    remotePush = fn;
  },
  _applyRemote(remoteData) {
    applyingRemote = true;
    data = { ...structuredClone(DEFAULT_DATA), ...remoteData };
    data.prefs = { ...structuredClone(DEFAULT_DATA.prefs), ...(remoteData.prefs || {}) };
    data.prefs.statColors = { ...structuredClone(DEFAULT_DATA.prefs.statColors), ...((remoteData.prefs || {}).statColors || {}) };
    save();
    applyingRemote = false;
  }
};

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
