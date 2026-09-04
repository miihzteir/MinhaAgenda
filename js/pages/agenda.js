import { store, todayISO } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast } from '../modal.js';
import { escapeHtml } from './home.js';
import { openTaskModal } from './tasks.js';

let unsub = null;
let viewDate = new Date();
let selected = todayISO();
let mode = 'month'; // 'month' | 'semana'

const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DOW_FULL = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const CATEGORIES = {
  aula: { label: 'Aula', color: 'var(--sage-500)' },
  trabalho: { label: 'Trabalho', color: 'var(--accent)' },
  pessoal: { label: 'Pessoal', color: 'var(--mauve-500)' },
  outro: { label: 'Outro', color: 'var(--blush-500)' }
};
function catColor(cat) {
  return (CATEGORIES[cat] || CATEGORIES.pessoal).color;
}

function iso(y, m, day) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
export function addDays(dateISO, n) {
  const dt = new Date(dateISO + 'T00:00:00');
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

// Acha o próximo evento (hoje ou futuro), considerando repetições.
export function nextOccurrence(events, fromISO = todayISO(), maxDays = 120) {
  for (let i = 0; i < maxDays; i++) {
    const dateISO = addDays(fromISO, i);
    const evs = events.filter((e) => occursOn(e, dateISO)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    if (evs.length) return { dateISO, event: evs[0], daysAway: i };
  }
  return null;
}
function startOfWeek(dateISO) {
  const dt = new Date(dateISO + 'T00:00:00');
  dt.setDate(dt.getDate() - dt.getDay());
  return dt.toISOString().slice(0, 10);
}

export function occursOn(ev, dateISO) {
  if (!ev.date) return false;
  if (ev.date === dateISO) return true;
  if (dateISO < ev.date) return false;
  if (ev.repeat === 'daily') return true;
  if (ev.repeat === 'weekly') {
    const a = new Date(ev.date + 'T00:00:00');
    const b = new Date(dateISO + 'T00:00:00');
    return a.getDay() === b.getDay();
  }
  if (ev.repeat === 'monthly') {
    const a = new Date(ev.date + 'T00:00:00');
    const b = new Date(dateISO + 'T00:00:00');
    return a.getDate() === b.getDate();
  }
  return false;
}

export function renderAgenda(page) {
  if (unsub) unsub();
  unsub = store.onChange(() => draw(page));
  draw(page);
}

function draw(page) {
  const d = store.get();
  const today = todayISO();

  page.innerHTML = `
    <div class="topbar agenda-topbar" style="margin-bottom:8px;">
      <h1 style="font-size:22px;">Agenda</h1>
      <div class="agenda-topbar-actions">
        <div class="view-toggle">
          <button data-mode="month" class="${mode === 'month' ? 'active' : ''}">Mês</button>
          <button data-mode="semana" class="${mode === 'semana' ? 'active' : ''}">Semana</button>
        </div>
        <button class="mini-btn" id="add">${icons.plus} Novo evento</button>
      </div>
    </div>
    <div id="agenda-body"></div>
  `;

  page.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; draw(page); }));
  page.querySelector('#add').addEventListener('click', () => openEventModal(null, selected));

  const body = page.querySelector('#agenda-body');
  if (mode === 'month') drawMonth(body, d, today);
  else drawWeek(body, d, today);
}

function drawMonth(body, d, today) {
  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrevMonth = new Date(y, m, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDow; i++) {
    const day = daysInPrevMonth - firstDow + 1 + i;
    cells.push({ day, other: true, dateISO: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, other: false, dateISO: iso(y, m, day) });
  }
  while (cells.length % 7 !== 0) {
    const day = cells.length - (firstDow + daysInMonth) + 1;
    cells.push({ day, other: true, dateISO: null });
  }

  body.innerHTML = `
    <div class="card calendar-card"><div class="card-body">
      <div class="month-nav">
        <button class="icon-btn sm" id="prev">${icons.chevronLeft}</button>
        <span class="label">${MONTHS[m]} de ${y}</span>
        <button class="icon-btn sm" id="next">${icons.chevronRight}</button>
      </div>
      <div style="text-align:right;margin-bottom:8px;"><button class="mini-btn" id="today-btn">Hoje</button></div>
      <div class="week-grid">
        ${DOW.map((x) => `<div class="dow">${x}</div>`).join('')}
        ${cells.map((c) => {
          const evs = c.dateISO ? d.events.filter((e) => occursOn(e, c.dateISO)) : [];
          const cls = ['day'];
          if (c.other) cls.push('other-month');
          if (c.dateISO === today) cls.push('today');
          if (c.dateISO === selected) cls.push('selected');
          const dotStyle = evs[0] ? ` style="--cat-color:${catColor(evs[0].category)}"` : '';
          return `<button class="${cls.join(' ')}" ${c.dateISO ? `data-day="${c.dateISO}"` : 'disabled'}>${c.day}${evs.length ? `<span class="dot"${dotStyle}></span>` : ''}</button>`;
        }).join('')}
      </div>
    </div></div>

    <div class="card">
      <div class="card-head"><span class="card-title">${formatSelected(selected)}</span></div>
      <div class="card-body">${daySectionsHtml(selected, d)}</div>
    </div>
  `;

  body.querySelector('#prev').addEventListener('click', () => { viewDate = new Date(y, m - 1, 1); draw(body.parentElement); });
  body.querySelector('#next').addEventListener('click', () => { viewDate = new Date(y, m + 1, 1); draw(body.parentElement); });
  body.querySelector('#today-btn').addEventListener('click', () => { viewDate = new Date(); selected = today; draw(body.parentElement); });
  body.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', () => { selected = b.dataset.day; draw(body.parentElement); }));
  wireEventRows(body, d);
  wireDaySections(body, d);
}

function daySectionsHtml(dateISO, d) {
  const dayEvents = d.events.filter((e) => occursOn(e, dateISO)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const eventIds = new Set(dayEvents.map((e) => e.id));
  const dayTasks = d.tasks.filter((t) => t.dueDate === dateISO && !(t.eventId && eventIds.has(t.eventId)));
  const dayHabits = d.habits;

  return `
    <div class="day-section">
      <div class="day-section-head"><span>Eventos</span><button class="mini-btn" data-add-event>${icons.plus} Evento</button></div>
      ${dayEvents.length ? dayEvents.map((e) => eventRowHtml(e, d)).join('') : emptyMini('Nenhum evento neste dia.')}
    </div>
    <div class="day-section">
      <div class="day-section-head"><span>Tarefas</span><button class="mini-btn" data-add-task>${icons.plus} Tarefa</button></div>
      ${dayTasks.length ? dayTasks.map(taskMiniRowHtml).join('') : emptyMini('Nenhuma tarefa pra este dia.')}
    </div>
    <div class="day-section">
      <div class="day-section-head"><span>Hábitos</span></div>
      ${dayHabits.length ? dayHabits.map((h) => habitMiniRowHtml(h, dateISO)).join('') : emptyMini('Nenhum hábito cadastrado ainda.')}
    </div>
  `;
}

function taskMiniRowHtml(t) {
  return `
    <div class="task-row">
      <button class="checkbox ${t.done ? 'done' : ''}" data-day-task-toggle="${t.id}">${icons.check}</button>
      <div style="flex:1;">
        <div class="item-title ${t.done ? 'done' : ''}" data-day-task-edit="${t.id}" style="cursor:pointer;">${escapeHtml(t.title)}</div>
      </div>
    </div>`;
}

function habitMiniRowHtml(h, dateISO) {
  const done = h.history.includes(dateISO);
  return `
    <div class="item-row">
      <button class="checkbox ${done ? 'done' : ''}" data-day-habit-toggle="${h.id}">${icons.check}</button>
      <div class="item-title">${escapeHtml(h.name)}</div>
    </div>`;
}

function emptyMini(text) {
  return `<div style="font-size:11.5px;color:var(--ink-soft);opacity:.6;padding:6px 4px;">${text}</div>`;
}

function wireDaySections(scope, d) {
  scope.querySelector('[data-add-event]')?.addEventListener('click', () => openEventModal(null, selected));
  scope.querySelector('[data-add-task]')?.addEventListener('click', () => openTaskModal(null, selected));
  scope.querySelectorAll('[data-day-task-toggle]').forEach((b) => b.addEventListener('click', () => store.updateTask(b.dataset.dayTaskToggle, { done: !b.classList.contains('done') })));
  scope.querySelectorAll('[data-day-task-edit]').forEach((b) => b.addEventListener('click', () => openTaskModal(d.tasks.find((t) => t.id === b.dataset.dayTaskEdit))));
  scope.querySelectorAll('[data-day-habit-toggle]').forEach((b) => b.addEventListener('click', () => store.toggleHabitOn(b.dataset.dayHabitToggle, selected)));
}

function drawWeek(body, d, today) {
  const weekStart = startOfWeek(selected);
  const days = [...Array(7)].map((_, i) => addDays(weekStart, i));
  const weekEnd = days[6];
  const first = new Date(weekStart + 'T00:00:00');
  const last = new Date(weekEnd + 'T00:00:00');
  const label = first.getMonth() === last.getMonth()
    ? `${first.getDate()} a ${last.getDate()} de ${MONTHS[first.getMonth()]}`
    : `${first.getDate()} de ${MONTHS[first.getMonth()]} a ${last.getDate()} de ${MONTHS[last.getMonth()]}`;

  body.innerHTML = `
    <div class="card"><div class="card-body">
      <div class="month-nav">
        <button class="icon-btn sm" id="prev">${icons.chevronLeft}</button>
        <span class="label">${label}</span>
        <button class="icon-btn sm" id="next">${icons.chevronRight}</button>
      </div>
      <div style="text-align:right;margin-bottom:4px;"><button class="mini-btn" id="today-btn">Hoje</button></div>
    </div></div>

    <div class="week-strip">
      ${days.map((day) => {
        const evs = d.events.filter((e) => occursOn(e, day)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        const dt = new Date(day + 'T00:00:00');
        return `
          <div class="week-strip-day">
            <div class="week-strip-head ${day === today ? 'today' : ''}" data-expand="${day}">
              <span class="wd">${DOW_FULL[dt.getDay()]}</span>
              <span class="dn">${dt.getDate()}</span>
              <span class="count">${evs.length ? `${evs.length} evento${evs.length > 1 ? 's' : ''}` : 'livre'}</span>
            </div>
            <div class="week-strip-body">
              ${evs.length ? evs.map((e) => eventRowHtml(e, d)).join('') : `<div style="font-size:11.5px;color:var(--ink-soft);opacity:.6;padding:4px 6px 8px;">Nenhum evento.</div>`}
            </div>
          </div>`;
      }).join('')}
    </div>
  `;

  body.querySelector('#prev').addEventListener('click', () => { selected = addDays(selected, -7); draw(body.parentElement); });
  body.querySelector('#next').addEventListener('click', () => { selected = addDays(selected, 7); draw(body.parentElement); });
  body.querySelector('#today-btn').addEventListener('click', () => { selected = today; draw(body.parentElement); });
  body.querySelectorAll('[data-expand]').forEach((h) => h.addEventListener('click', () => openEventModal(null, h.dataset.expand)));
  wireEventRows(body, d);
}

function wireEventRows(scope, d) {
  scope.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); openEventModal(d.events.find((e) => e.id === b.dataset.edit)); }));
  scope.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); store.deleteEvent(b.dataset.del); toast('Evento excluído.'); }));
  scope.querySelectorAll('[data-task-toggle]').forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); store.updateTask(b.dataset.taskToggle, { done: !b.classList.contains('done') }); }));
  scope.querySelectorAll('[data-task-edit]').forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); openTaskModal(d.tasks.find((t) => t.id === b.dataset.taskEdit)); }));
}

function formatSelected(dateISO) {
  const dt = new Date(dateISO + 'T00:00:00');
  return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function eventRowHtml(e, d) {
  const linkedTasks = (d?.tasks || []).filter((t) => t.eventId === e.id);
  return `
    <div class="item-row" style="align-items:flex-start;">
      <span class="category-dot" style="--cat-color:${catColor(e.category)};margin-top:6px;"></span>
      <div style="width:44px;flex-shrink:0;font-size:11.5px;color:var(--ink-soft);opacity:.7;padding-top:2px;">${e.time || 'Dia todo'}</div>
      <div style="flex:1;min-width:0;">
        <div class="item-title">${escapeHtml(e.title)}</div>
        <div class="item-meta">
          ${e.location ? `<span class="chip">${escapeHtml(e.location)}</span>` : ''}
          <span class="chip">${(CATEGORIES[e.category] || CATEGORIES.pessoal).label}</span>
        </div>
        ${linkedTasks.length ? `
          <div style="margin-top:4px;">
            ${linkedTasks.map((t) => `
              <div class="linked-task-row">
                <button class="checkbox ${t.done ? 'done' : ''}" data-task-toggle="${t.id}">${icons.check}</button>
                <span class="${t.done ? 'item-title done' : ''}" data-task-edit="${t.id}" style="cursor:pointer;">${escapeHtml(t.title)}</span>
              </div>`).join('')}
          </div>` : ''}
      </div>
      <div class="row-actions">
        <button class="icon-btn sm" data-edit="${e.id}">${icons.edit}</button>
        <button class="icon-btn sm" data-del="${e.id}">${icons.trash}</button>
      </div>
    </div>`;
}

export function openEventModal(existing, defaultDate) {
  openModal({
    title: existing ? 'Editar evento' : 'Novo evento',
    bodyHtml: `
      <div class="field"><label>Título</label><input class="input" id="f-title" value="${existing ? escapeHtml(existing.title) : ''}" /></div>
      <div class="field-row">
        <div class="field"><label>Data</label><input class="input" type="date" id="f-date" value="${existing?.date || defaultDate || ''}" /></div>
        <div class="field"><label>Hora (opcional)</label><input class="input" type="time" id="f-time" value="${existing?.time || ''}" /></div>
      </div>
      <div class="field"><label>Local (opcional)</label><input class="input" id="f-location" value="${existing ? escapeHtml(existing.location || '') : ''}" /></div>
      <div class="field"><label>Categoria</label>
        <div class="category-select" id="f-category">
          ${Object.entries(CATEGORIES).map(([key, c]) => `<button type="button" class="category-opt" data-cat="${key}" style="--cat-color:${c.color}" aria-pressed="${(existing?.category || 'pessoal') === key}"><span class="category-dot" style="--cat-color:${c.color}"></span>${c.label}</button>`).join('')}
        </div>
      </div>
      <div class="field"><label>Repetir</label>
        <select class="input" id="f-repeat">
          <option value="none" ${!existing || existing.repeat === 'none' ? 'selected' : ''}>Não repete</option>
          <option value="daily" ${existing?.repeat === 'daily' ? 'selected' : ''}>Todos os dias</option>
          <option value="weekly" ${existing?.repeat === 'weekly' ? 'selected' : ''}>Toda semana, no mesmo dia</option>
          <option value="monthly" ${existing?.repeat === 'monthly' ? 'selected' : ''}>Todo mês, no mesmo dia</option>
        </select>
      </div>
      <div class="modal-footer">
        <button class="btn ghost" id="cancel">Cancelar</button>
        <button class="btn" id="save">Salvar</button>
      </div>
    `,
    onMount: (body, close) => {
      let category = existing?.category || 'pessoal';
      body.querySelector('#f-title').focus();
      body.querySelector('#cancel').addEventListener('click', close);
      body.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => {
        category = b.dataset.cat;
        body.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.cat === category));
      }));
      body.querySelector('#save').addEventListener('click', () => {
        const title = body.querySelector('#f-title').value.trim();
        const date = body.querySelector('#f-date').value;
        if (!title || !date) return;
        const payload = {
          title,
          date,
          time: body.querySelector('#f-time').value || null,
          location: body.querySelector('#f-location').value.trim() || null,
          repeat: body.querySelector('#f-repeat').value,
          category
        };
        if (existing) store.updateEvent(existing.id, payload);
        else store.addEvent(payload);
        toast(existing ? 'Evento atualizado.' : 'Evento adicionado.');
        close();
      });
    }
  });
}
