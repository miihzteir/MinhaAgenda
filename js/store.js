// Camada de dados: tudo fica salvo no localStorage do navegador (por
// aparelho) e, se o Firebase estiver configurado e você estiver logada,
// também sincroniza com a nuvem (ver firebase.js).

const KEY = 'minhaAgenda:v1';

const DEFAULT_DATA = {
  profile: { name: 'Você', course: '', photoURL: null },
  prefs: { theme: 'auto', accent: 'cocoa', statColors: { done: 'sage', pending: 'cocoa', habits: 'mauve', events: 'blush' } },
  tasks: [],
  events: [],
  habits: [],
  notes: [],
  links: []
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
    data.tasks.push({ id: uid(), title: '', done: false, priority: 'media', color: 'cocoa', eventId: null, createdAt: Date.now(), ...task });
    save();
  },
  updateTask(id, patch) {
    data.tasks = data.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
    save();
  },
  deleteTask(id) {
    data.tasks = data.tasks.filter((t) => t.id !== id);
    save();
  },

  addEvent(ev) {
    data.events.push({ id: uid(), title: '', repeat: 'none', category: 'pessoal', ...ev });
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
    data.habits.push({ id: uid(), name: '', history: [], color: 'sage', ...h });
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
  deleteHabit(id) {
    data.habits = data.habits.filter((h) => h.id !== id);
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
    data.notes.push({ id: uid(), title: '', text: '', pinned: false, color: null, date: todayISO(), createdAt: Date.now(), ...n });
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
