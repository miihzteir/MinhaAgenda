import { icons } from './icons.js';
import { openTaskModal } from './pages/tasks.js';
import { openEventModal } from './pages/agenda.js';
import { openHabitModal } from './pages/habits.js';
import { openNoteModal } from './pages/notes.js';
import { openLinkModal } from './pages/links.js';
import { openModal } from './modal.js';

const OPTIONS = [
  { label: 'Tarefa', icon: 'tasks', fn: () => openTaskModal() },
  { label: 'Evento', icon: 'agenda', fn: () => openEventModal() },
  { label: 'Hábito', icon: 'habits', fn: () => openHabitModal() },
  { label: 'Nota', icon: 'notes', fn: () => openNoteModal() },
  { label: 'Link', icon: 'link', fn: () => openLinkModal() }
];

export function openQuickAdd() {
  const close = openModal({
    title: 'Adicionar',
    bodyHtml: `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
      ${OPTIONS.map((o, i) => `
        <button class="theme-opt" data-i="${i}" style="padding:16px 8px;">${icons[o.icon]}<span>${o.label}</span></button>
      `).join('')}
    </div>`,
    onMount: (body) => {
      body.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
        close();
        OPTIONS[Number(b.dataset.i)].fn();
      }));
    }
  });
}
