import { store, todayISO } from '../store.js';
import { icons } from '../icons.js';
import { openTaskModal } from './tasks.js';
import { openEventModal, nextOccurrence } from './agenda.js';

let unsub = null;

const GREETINGS = [
  'Vamos cuidar do que importa hoje?',
  'Um passo de cada vez também é progresso.',
  'Seu dia não precisa ser perfeito para ser produtivo.',
  'Hoje, vamos começar pelo essencial.',
  'Vale mais terminar uma coisa do que começar cinco.',
  'Vá com calma — o que não couber hoje, cabe amanhã.'
];
function phraseOfDay() {
  const n = Math.floor(Date.now() / 86400000);
  return GREETINGS[n % GREETINGS.length];
}
function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function renderHome(page) {
  if (unsub) unsub();
  unsub = store.onChange(() => draw(page));
  draw(page);
}

function draw(page) {
  const d = store.get();
  const today = todayISO();
  const name = d.profile.name || 'Você';

  const todayTasks = d.tasks.filter((t) => !t.dueDate || t.dueDate === today);
  const priorities = todayTasks.filter((t) => t.priority === 'alta' && !t.done).slice(0, 3);
  const others = todayTasks.filter((t) => !priorities.includes(t)).slice(0, 6);
  const doneCount = todayTasks.filter((t) => t.done).length;
  const pendingCount = todayTasks.filter((t) => !t.done).length;
  const habitsToday = d.habits;
  const habitsDone = habitsToday.filter((h) => h.history.includes(today)).length;
  const todaysEvents = d.events
    .filter((e) => e.date === today)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const pendingReminders = d.reminders.filter((r) => !r.done).slice(0, 3);
  const total = todayTasks.length || 1;
  const pct = Math.round((doneCount / total) * 100);
  const next = nextOccurrence(d.events, today);

  page.innerHTML = `
    <div class="greeting-date">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
    <h1 class="greeting-h1">${greetingWord()}, ${escapeHtml(name)}.</h1>
    <div class="greeting-sub">${phraseOfDay()}</div>

    <div class="summary-card">
      <div class="summary-top"><span>Progresso do dia</span><strong style="color:var(--accent-strong)">${pct}%</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="stat-row">
        <div class="stat"><span class="stat-dot" style="background:var(--sage-500)"></span><div><div class="stat-num">${doneCount}</div><div class="stat-label">concluídas</div></div></div>
        <div class="stat"><span class="stat-dot" style="background:var(--accent)"></span><div><div class="stat-num">${pendingCount}</div><div class="stat-label">pendentes</div></div></div>
        <div class="stat"><span class="stat-dot" style="background:var(--mauve-500)"></span><div><div class="stat-num">${habitsDone}/${habitsToday.length}</div><div class="stat-label">hábitos feitos</div></div></div>
        <div class="stat"><span class="stat-dot" style="background:var(--blush-500)"></span><div><div class="stat-num">${pendingReminders.length}</div><div class="stat-label">lembretes</div></div></div>
      </div>
    </div>

    ${next ? `
    <div class="countdown-card" id="countdown-card" style="cursor:pointer;">
      <div class="countdown-num">${next.daysAway === 0 ? 'Hoje' : next.daysAway === 1 ? '1' : next.daysAway}${next.daysAway > 1 ? '<small>dias</small>' : ''}</div>
      <div class="countdown-info">
        <div class="t">${escapeHtml(next.event.title)}</div>
        <div class="s">${next.daysAway === 0 ? 'hoje' : next.daysAway === 1 ? 'amanhã' : formatShort(next.dateISO)}${next.event.time ? ` às ${next.event.time}` : ''}</div>
      </div>
    </div>` : ''}

    <div class="capture">
      ${icons.pencil}
      <input id="quick-note" placeholder="Anote algo rápido, antes que esqueça…" />
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">O que preciso fazer hoje</span><button class="mini-btn" id="add-task">${icons.plus} Nova tarefa</button></div>
      <div class="card-body">
        ${priorities.length ? `
          <div class="priorities-box">
            <div class="priorities-label">${icons.star} Minhas 3 prioridades</div>
            ${priorities.map(taskRowHtml).join('')}
          </div>` : ''}
        ${others.length ? others.map(taskRowHtml).join('') : (priorities.length ? '' : emptyHtml('tasks', 'Nada por aqui ainda. Adicione sua primeira tarefa.'))}
      </div>
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">Agenda de hoje</span></div>
      <div class="card-body">
        ${todaysEvents.length ? todaysEvents.map((e) => `
          <div class="item-row">
            <div style="width:44px;flex-shrink:0;font-size:11.5px;color:var(--ink-soft);opacity:.7;padding-top:2px;">${e.time || ''}</div>
            <div><div class="item-title">${escapeHtml(e.title)}</div>${e.location ? `<div class="item-meta"><span class="chip">${escapeHtml(e.location)}</span></div>` : ''}</div>
          </div>`).join('') : emptyHtml('agenda', 'Nenhum evento hoje.')}
      </div>
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">Hábitos de hoje</span></div>
      <div class="card-body">
        ${habitsToday.length ? habitsToday.map((h) => `
          <div class="item-row">
            <button class="checkbox ${h.history.includes(today) ? 'done' : ''}" data-habit="${h.id}">${icons.check}</button>
            <div class="item-title">${escapeHtml(h.name)} ${h.history.length ? `<span class="streak-badge">${icons.flame} ${h.history.length}</span>` : ''}</div>
          </div>`).join('') : emptyHtml('habits', 'Nenhum hábito cadastrado ainda.')}
      </div>
    </div>

    ${pendingReminders.length ? `
    <div class="card">
      <div class="card-head"><span class="card-title">Lembretes importantes</span></div>
      <div class="card-body">
        ${pendingReminders.map((r) => `
          <div class="item-row">
            <span style="color:var(--blush-500);">${icons.bell}</span>
            <div><div class="item-title">${escapeHtml(r.title)}</div><div style="font-size:11px;color:var(--ink-soft);opacity:.7;">${r.date || ''} ${r.time || ''}</div></div>
          </div>`).join('')}
      </div>
    </div>` : ''}
  `;

  page.querySelector('#add-task')?.addEventListener('click', () => openTaskModal());
  page.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => store.updateTask(btn.dataset.toggle, { done: !btn.classList.contains('done') }));
  });
  page.querySelectorAll('[data-habit]').forEach((btn) => {
    btn.addEventListener('click', () => store.toggleHabitToday(btn.dataset.habit));
  });
  page.querySelector('#countdown-card')?.addEventListener('click', () => { window.location.hash = '#/agenda'; });
  const noteInput = page.querySelector('#quick-note');
  noteInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && noteInput.value.trim()) {
      store.addNote({ title: noteInput.value.trim(), text: '' });
      noteInput.value = '';
    }
  });
}

function taskRowHtml(t) {
  return `
    <div class="task-row">
      <button class="checkbox ${t.done ? 'done' : ''}" data-toggle="${t.id}">${icons.check}</button>
      <div style="flex:1;">
        <div class="item-title ${t.done ? 'done' : ''}">${escapeHtml(t.title)}</div>
        <div class="item-meta">
          ${t.time ? `<span class="chip">${t.time}</span>` : ''}
          ${t.subject ? `<span class="chip">${escapeHtml(t.subject)}</span>` : ''}
          <span class="chip prio-${t.priority}">${t.priority === 'alta' ? 'Alta' : t.priority === 'baixa' ? 'Baixa' : 'Média'}</span>
        </div>
      </div>
    </div>`;
}

function emptyHtml(icon, text) {
  return `<div class="empty">${icons[icon] || ''}<div>${text}</div></div>`;
}

function formatShort(dateISO) {
  const dt = new Date(dateISO + 'T00:00:00');
  return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
