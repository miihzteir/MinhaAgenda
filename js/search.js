import { store } from './store.js';
import { icons } from './icons.js';
import { openModal } from './modal.js';
import { escapeHtml } from './pages/home.js';

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function collect(query) {
  const d = store.get();
  const q = normalize(query);
  if (!q) return [];

  const groups = [
    { label: 'Tarefas', icon: 'tasks', to: '#/tarefas', items: d.tasks.filter((t) => normalize(t.title).includes(q)).map((t) => ({ title: t.title, meta: t.dueDate ? t.dueDate.split('-').reverse().join('/') : '' })) },
    { label: 'Agenda', icon: 'agenda', to: '#/agenda', items: d.events.filter((e) => normalize(e.title).includes(q)).map((e) => ({ title: e.title, meta: e.date ? e.date.split('-').reverse().join('/') : '' })) },
    { label: 'Hábitos', icon: 'habits', to: '#/habitos', items: d.habits.filter((h) => normalize(h.name).includes(q)).map((h) => ({ title: h.name, meta: '' })) },
    { label: 'Notas', icon: 'notes', to: '#/notas', items: d.notes.filter((n) => normalize(n.title).includes(q) || normalize(n.text).includes(q)).map((n) => ({ title: n.title, meta: '' })) },
    { label: 'Links', icon: 'link', to: '#/links', items: d.links.filter((l) => normalize(l.title).includes(q) || normalize(l.url).includes(q)).map((l) => ({ title: l.title, meta: '' })) }
  ];
  return groups.filter((g) => g.items.length);
}

export function openSearch() {
  openModal({
    title: 'Buscar',
    bodyHtml: `
      <div class="field"><input class="input" id="q" placeholder="Tarefas, eventos, hábitos, notas..." /></div>
      <div class="search-results" id="results"></div>
    `,
    onMount: (body, close) => {
      const input = body.querySelector('#q');
      const results = body.querySelector('#results');
      input.focus();

      const draw = () => {
        const groups = collect(input.value);
        if (!input.value.trim()) {
          results.innerHTML = `<div class="empty">${icons.search}<div>Digite pra buscar em tudo: tarefas, agenda, hábitos, notas e links.</div></div>`;
          return;
        }
        if (!groups.length) {
          results.innerHTML = `<div class="empty">${icons.search}<div>Nada encontrado.</div></div>`;
          return;
        }
        results.innerHTML = groups.map((g) => `
          <div class="search-group-label">${g.label}</div>
          ${g.items.map((it) => `
            <div class="search-result" data-to="${g.to}">
              <span class="ic">${icons[g.icon]}</span>
              <div style="flex:1;"><div class="item-title">${escapeHtml(it.title)}</div></div>
              ${it.meta ? `<span class="chip">${it.meta}</span>` : ''}
            </div>
          `).join('')}
        `).join('');
        results.querySelectorAll('[data-to]').forEach((el) => el.addEventListener('click', () => {
          window.location.hash = el.dataset.to;
          close();
        }));
      };

      input.addEventListener('input', draw);
      draw();
    }
  });
}
