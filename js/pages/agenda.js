import { store, todayISO } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast } from '../modal.js';
import { escapeHtml } from './home.js';
import { openTaskModal } from './tasks.js';
import { colorValue } from '../colors.js';

import { openHabitModal } from './habits.js';

let unsub = null;
let viewDate = new Date();
let selected = todayISO();
let mode = 'month'; // 'dia' | 'month' | 'semana'

const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DOW_FULL = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Categorias de evento são personalizáveis (ver js/pages/areas.js-like CRUD
// em Configurações) — aqui só lemos do store, com a primeira como fallback.
function getCategories() {
  return store.get().categories;
}
function catOf(catId) {
  const cats = getCategories();
  return cats.find((c) => c.id === catId) || cats[0];
}
function catColor(catId) {
  return colorValue(catOf(catId).color);
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
  const a = new Date(ev.date + 'T00:00:00');
  const b = new Date(dateISO + 'T00:00:00');
  const diffDays = Math.round((b - a) / 86400000);

  switch (ev.repeat) {
    case 'daily':
      return true;
    case 'weekdays': {
      const dow = b.getDay();
      return dow >= 1 && dow <= 5;
    }
    case 'weekly':
      return a.getDay() === b.getDay();
    case 'monthly':
      return a.getDate() === b.getDate();
    case 'yearly':
      return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
    case 'custom': {
      const n = Math.max(1, Number(ev.repeatInterval) || 1);
      const unit = ev.repeatUnit || 'weeks';
      if (unit === 'days') return diffDays % n === 0;
      if (unit === 'weeks') return a.getDay() === b.getDay() && diffDays % (n * 7) === 0;
      if (unit === 'months') {
        if (a.getDate() !== b.getDate()) return false;
        const monthsDiff = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
        return monthsDiff % n === 0;
      }
      return false;
    }
    default:
      return false;
  }
}

const REPEAT_LABELS = {
  none: 'Não repete', daily: 'Todos os dias', weekdays: 'Dias de semana (seg a sex)',
  weekly: 'Toda semana', monthly: 'Todo mês', yearly: 'Todo ano', custom: 'Personalizado'
};
function repeatLabel(ev) {
  if (ev.repeat === 'custom') {
    const n = ev.repeatInterval || 1;
    const unitLabel = { days: n === 1 ? 'dia' : 'dias', weeks: n === 1 ? 'semana' : 'semanas', months: n === 1 ? 'mês' : 'meses' }[ev.repeatUnit || 'weeks'];
    return `A cada ${n} ${unitLabel}`;
  }
  return REPEAT_LABELS[ev.repeat] || REPEAT_LABELS.none;
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
          <button data-mode="dia" class="${mode === 'dia' ? 'active' : ''}">Dia</button>
          <button data-mode="month" class="${mode === 'month' ? 'active' : ''}">Mês</button>
          <button data-mode="semana" class="${mode === 'semana' ? 'active' : ''}">Semana</button>
        </div>
        <button class="mini-btn" id="add">${icons.plus} Adicionar</button>
      </div>
    </div>
    <div id="agenda-body"></div>
  `;

  page.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; draw(page); }));
  page.querySelector('#add').addEventListener('click', () => openAddMenu());

  const body = page.querySelector('#agenda-body');
  if (mode === 'dia') drawDay(body, d, today);
  else if (mode === 'month') drawMonth(body, d, today);
  else drawWeek(body, d, today);
}

function openAddMenu() {
  const OPTIONS = [
    { label: 'Evento', icon: 'agenda', fn: () => openEventModal(null, selected) },
    { label: 'Tarefa', icon: 'tasks', fn: () => openTaskModal(null, selected) },
    { label: 'Hábito', icon: 'habits', fn: () => openHabitModal() }
  ];
  const close = openModal({
    title: 'Adicionar',
    bodyHtml: `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
      ${OPTIONS.map((o, i) => `<button class="theme-opt" data-i="${i}" style="padding:16px 8px;">${icons[o.icon]}<span>${o.label}</span></button>`).join('')}
    </div>`,
    onMount: (body) => {
      body.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
        close();
        OPTIONS[Number(b.dataset.i)].fn();
      }));
    }
  });
}

function drawDay(body, d, today) {
  const dt = new Date(selected + 'T00:00:00');
  body.innerHTML = `
    <div class="card"><div class="card-body">
      <div class="month-nav">
        <button class="icon-btn sm" id="prev">${icons.chevronLeft}</button>
        <span class="label">${formatSelected(selected)}</span>
        <button class="icon-btn sm" id="next">${icons.chevronRight}</button>
      </div>
      <div class="day-jump-row">
        <input class="input" type="date" id="jump-date" value="${selected}" title="Ir para um dia" />
        <button class="mini-btn" id="today-btn">Hoje</button>
      </div>
    </div></div>

    <div class="card">
      <div class="card-body">${dayTimelineHtml(selected, d)}</div>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="day-section">
          <div class="day-section-head"><span>Hábitos</span></div>
          ${d.habits.length ? d.habits.map((h) => habitMiniRowHtml(h, selected)).join('') : emptyMini('Nenhum hábito cadastrado ainda.')}
        </div>
      </div>
    </div>
  `;

  body.querySelector('#prev').addEventListener('click', () => { selected = addDays(selected, -1); draw(body.parentElement); });
  body.querySelector('#next').addEventListener('click', () => { selected = addDays(selected, 1); draw(body.parentElement); });
  body.querySelector('#today-btn').addEventListener('click', () => { selected = today; draw(body.parentElement); });
  body.querySelector('#jump-date').addEventListener('change', (e) => {
    if (!e.target.value) return;
    selected = e.target.value;
    draw(body.parentElement);
  });
  wireEventRows(body, d);
  wireDaySections(body, d);
}

const TIMELINE_HOURS = [...Array(18)].map((_, i) => i + 6); // 06:00 – 23:00

function dayTimelineHtml(dateISO, d) {
  const dayEvents = d.events.filter((e) => occursOn(e, dateISO)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const eventIds = new Set(dayEvents.map((e) => e.id));
  const dayTasks = dayTasksFor(dateISO, d, eventIds);

  const timedEvents = dayEvents.filter((e) => e.time);
  const untimedEvents = dayEvents.filter((e) => !e.time);
  const timedTasks = dayTasks.filter((t) => t.time);
  const untimedTasks = dayTasks.filter((t) => !t.time);

  const byHour = {};
  TIMELINE_HOURS.forEach((h) => { byHour[h] = []; });
  timedEvents.forEach((e) => { const h = Number(e.time.split(':')[0]); if (byHour[h]) byHour[h].push({ kind: 'event', item: e }); });
  timedTasks.forEach((t) => { const h = Number(t.time.split(':')[0]); if (byHour[h]) byHour[h].push({ kind: 'task', item: t }); });

  const untimedHtml = (untimedEvents.length || untimedTasks.length) ? `
    <div class="day-section" style="margin-bottom:14px;">
      <div class="day-section-head"><span>Sem horário</span></div>
      ${untimedEvents.map((e) => eventRowHtml(e, d)).join('')}
      ${untimedTasks.map(taskMiniRowHtml).join('')}
    </div>` : '';

  const timelineHtml = `
    <div class="timeline">
      ${TIMELINE_HOURS.map((h) => `
        <div class="timeline-row">
          <div class="timeline-hour">${String(h).padStart(2, '0')}:00</div>
          <div class="timeline-slot">
            ${byHour[h].map((x) => (x.kind === 'event' ? timelineEventHtml(x.item) : timelineTaskHtml(x.item))).join('')}
          </div>
        </div>`).join('')}
    </div>`;

  return untimedHtml + timelineHtml;
}

function timelineEventHtml(e) {
  return `
    <div class="timeline-block" style="--cat-color:${catColor(e.category)};">
      <div style="flex:1;min-width:0;">
        <div class="tb-title">${escapeHtml(e.title)}</div>
        <div class="tb-time">${e.time}${e.endTime ? `–${e.endTime}` : ''}${e.location ? ` · ${escapeHtml(e.location)}` : ''}</div>
      </div>
      <div class="row-actions">
        <button class="icon-btn sm" data-edit="${e.id}">${icons.edit}</button>
        <button class="icon-btn sm" data-del="${e.id}">${icons.trash}</button>
      </div>
    </div>`;
}

function timelineTaskHtml(t) {
  return `
    <div class="timeline-block task" style="--sw-color:${colorValue(t.color)};">
      <button class="checkbox ${t.done ? 'done' : ''}" data-day-task-toggle="${t.id}">${icons.check}</button>
      <div class="tb-title" data-day-task-edit="${t.id}" style="cursor:pointer;flex:1;">${escapeHtml(t.title)}${t.estimatedDuration ? ` · ${t.estimatedDuration}min` : ''}</div>
    </div>`;
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
      <div class="day-jump-row">
        <input class="input" type="date" id="jump-date" value="${selected}" title="Ir para um dia" />
        <button class="mini-btn" id="today-btn">Hoje</button>
      </div>
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
  body.querySelector('#jump-date').addEventListener('change', (e) => {
    const v = e.target.value;
    if (!v) return;
    viewDate = new Date(v + 'T00:00:00');
    selected = v;
    draw(body.parentElement);
  });
  body.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', () => { selected = b.dataset.day; draw(body.parentElement); }));
  wireEventRows(body, d);
  wireDaySections(body, d);
}

function dayTasksFor(dateISO, d, eventIds) {
  return d.tasks.filter((t) => (t.plannedDate || t.dueDate) === dateISO && !(t.eventId && eventIds.has(t.eventId)));
}

function daySectionsHtml(dateISO, d) {
  const dayEvents = d.events.filter((e) => occursOn(e, dateISO)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const eventIds = new Set(dayEvents.map((e) => e.id));
  const dayTasks = dayTasksFor(dateISO, d, eventIds);
  const dayHabits = d.habits;

  return `
    <div class="day-section">
      <div class="day-section-head"><span>Eventos</span></div>
      ${dayEvents.length ? dayEvents.map((e) => eventRowHtml(e, d)).join('') : emptyMini('Nenhum evento neste dia.')}
    </div>
    <div class="day-section">
      <div class="day-section-head"><span>Tarefas</span></div>
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
      <span class="item-dot" style="--sw-color:${colorValue(t.color)}"></span>
      <button class="checkbox ${t.done ? 'done' : ''}" data-day-task-toggle="${t.id}">${icons.check}</button>
      <div style="flex:1;">
        <div class="item-title ${t.done ? 'done' : ''}" data-day-task-edit="${t.id}" style="cursor:pointer;">${escapeHtml(t.title)}</div>
      </div>
    </div>`;
}

function habitMiniRowHtml(h, dateISO) {
  const done = h.history.includes(dateISO);
  const color = colorValue(h.color);
  return `
    <div class="item-row">
      <button class="checkbox ${done ? 'done' : ''}" data-day-habit-toggle="${h.id}" style="${done ? `background:${color};border-color:${color};` : `border-color:${color};`}">${icons.check}</button>
      <div class="item-title">${escapeHtml(h.name)}</div>
    </div>`;
}

function emptyMini(text) {
  return `<div style="font-size:11.5px;color:var(--ink-soft);opacity:.6;padding:6px 4px;">${text}</div>`;
}

function wireDaySections(scope, d) {
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
          <span class="chip">${escapeHtml(catOf(e.category).name)}</span>
          ${e.repeat && e.repeat !== 'none' ? `<span class="chip">${repeatLabel(e)}</span>` : ''}
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
        <div class="field"><label>Início (opcional)</label><input class="input" type="time" id="f-time" value="${existing?.time || ''}" /></div>
        <div class="field"><label>Fim (opcional)</label><input class="input" type="time" id="f-endtime" value="${existing?.endTime || ''}" /></div>
      </div>
      <div class="field"><label>Local (opcional)</label><input class="input" id="f-location" value="${existing ? escapeHtml(existing.location || '') : ''}" /></div>
      ${store.get().areas.length ? `
      <div class="field"><label>Área (opcional)</label>
        <select class="input" id="f-area">
          <option value="">Nenhuma</option>
          ${store.get().areas.map((a) => `<option value="${a.id}" ${existing?.areaId === a.id ? 'selected' : ''}>${escapeHtml(a.name)}</option>`).join('')}
        </select>
      </div>` : ''}
      <div class="field"><label>Descrição / observações (opcional)</label><textarea class="input" id="f-desc" rows="2">${existing ? escapeHtml(existing.description || '') : ''}</textarea></div>
      <div class="field"><label>Categoria</label>
        <div class="category-select" id="f-category">
          ${getCategories().map((c) => `<button type="button" class="category-opt" data-cat="${c.id}" style="--cat-color:${colorValue(c.color)}" aria-pressed="${(existing?.category || getCategories()[0].id) === c.id}"><span class="category-dot" style="--cat-color:${colorValue(c.color)}"></span>${escapeHtml(c.name)}</button>`).join('')}
        </div>
        <p style="font-size:11px;color:var(--ink-soft);opacity:.7;margin:6px 0 0;">Gerencie as categorias em Configurações.</p>
      </div>
      <div class="field"><label>Repetir</label>
        <select class="input" id="f-repeat">
          <option value="none" ${!existing || existing.repeat === 'none' ? 'selected' : ''}>Não repete</option>
          <option value="daily" ${existing?.repeat === 'daily' ? 'selected' : ''}>Todos os dias</option>
          <option value="weekdays" ${existing?.repeat === 'weekdays' ? 'selected' : ''}>Dias de semana (seg a sex)</option>
          <option value="weekly" ${existing?.repeat === 'weekly' ? 'selected' : ''}>Toda semana, no mesmo dia</option>
          <option value="monthly" ${existing?.repeat === 'monthly' ? 'selected' : ''}>Todo mês, no mesmo dia</option>
          <option value="yearly" ${existing?.repeat === 'yearly' ? 'selected' : ''}>Todo ano, na mesma data</option>
          <option value="custom" ${existing?.repeat === 'custom' ? 'selected' : ''}>Personalizado...</option>
        </select>
      </div>
      <div class="field-row" id="f-custom-row" ${existing?.repeat === 'custom' ? '' : 'hidden'}>
        <div class="field"><label>A cada</label><input class="input" type="number" min="1" id="f-repeat-n" value="${existing?.repeatInterval || 1}" /></div>
        <div class="field"><label>&nbsp;</label>
          <select class="input" id="f-repeat-unit">
            <option value="days" ${existing?.repeatUnit === 'days' ? 'selected' : ''}>dias</option>
            <option value="weeks" ${!existing || !existing.repeatUnit || existing.repeatUnit === 'weeks' ? 'selected' : ''}>semanas</option>
            <option value="months" ${existing?.repeatUnit === 'months' ? 'selected' : ''}>meses</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn ghost" id="cancel">Cancelar</button>
        <button class="btn" id="save">Salvar</button>
      </div>
    `,
    onMount: (body, close) => {
      let category = existing?.category || getCategories()[0].id;
      body.querySelector('#f-title').focus();
      body.querySelector('#cancel').addEventListener('click', close);
      body.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => {
        category = b.dataset.cat;
        body.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.cat === category));
      }));
      body.querySelector('#f-repeat').addEventListener('change', (e) => {
        body.querySelector('#f-custom-row').hidden = e.target.value !== 'custom';
      });
      body.querySelector('#save').addEventListener('click', () => {
        const title = body.querySelector('#f-title').value.trim();
        const date = body.querySelector('#f-date').value;
        if (!title || !date) return;
        const repeat = body.querySelector('#f-repeat').value;
        const payload = {
          title,
          date,
          description: body.querySelector('#f-desc').value.trim(),
          time: body.querySelector('#f-time').value || null,
          endTime: body.querySelector('#f-endtime').value || null,
          location: body.querySelector('#f-location').value.trim() || null,
          areaId: body.querySelector('#f-area')?.value || null,
          repeat,
          repeatInterval: repeat === 'custom' ? Math.max(1, Number(body.querySelector('#f-repeat-n').value) || 1) : null,
          repeatUnit: repeat === 'custom' ? body.querySelector('#f-repeat-unit').value : null,
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
