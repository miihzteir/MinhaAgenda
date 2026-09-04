// Camada de dados: tudo fica salvo no localStorage do navegador (por
// aparelho). Sem servidor, sem login — simples de propósito.

const KEY = 'minhaAgenda:v1';

const DEFAULT_DATA = {
  profile: { name: 'Você', course: '' },
  prefs: { theme: 'auto', accent: 'cocoa' },
  tasks: [],
  events: [],
  habits: [],
  reminders: [],
  notes: [],
  subjects: []
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_DATA), ...parsed };
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

let data = load();
const listeners = new Set();

function save() {
  localStorage.setItem(KEY, JSON.stringify(data));
  listeners.forEach((fn) => fn());
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
    data.tasks.push({ id: uid(), title: '', done: false, priority: 'media', createdAt: Date.now(), ...task });
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
    data.events.push({ id: uid(), title: '', repeat: 'none', ...ev });
    save();
  },
  updateEvent(id, patch) {
    data.events = data.events.map((e) => (e.id === id ? { ...e, ...patch } : e));
    save();
  },
  deleteEvent(id) {
    data.events = data.events.filter((e) => e.id !== id);
    save();
  },

  addHabit(h) {
    data.habits.push({ id: uid(), name: '', history: [], ...h });
    save();
  },
  toggleHabitToday(id) {
    const today = new Date().toISOString().slice(0, 10);
    data.habits = data.habits.map((h) => {
      if (h.id !== id) return h;
      const has = h.history.includes(today);
      return { ...h, history: has ? h.history.filter((d) => d !== today) : [...h.history, today] };
    });
    save();
  },
  deleteHabit(id) {
    data.habits = data.habits.filter((h) => h.id !== id);
    save();
  },

  addReminder(r) {
    data.reminders.push({ id: uid(), title: '', done: false, ...r });
    save();
  },
  updateReminder(id, patch) {
    data.reminders = data.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r));
    save();
  },
  deleteReminder(id) {
    data.reminders = data.reminders.filter((r) => r.id !== id);
    save();
  },

  addNote(n) {
    data.notes.push({ id: uid(), title: '', text: '', createdAt: Date.now(), ...n });
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

  addSubject(s) {
    data.subjects.push({ id: uid(), name: '', professor: '', schedule: '', ...s });
    save();
  },
  deleteSubject(id) {
    data.subjects = data.subjects.filter((s) => s.id !== id);
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
  }
};

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
