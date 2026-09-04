import { store, todayISO } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast } from '../modal.js';
import { escapeHtml } from './home.js';

let unsub = null;
let viewDate = new Date();
let selected = todayISO();

const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function iso(y, m, day) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function occursOn(ev, dateISO) {
  if (!ev.date) return false;
  if (ev.date === dateISO) return true;
  if (dateISO < ev.date) return false;
  if (ev.repeat === 'daily') return true;
  if (ev.repeat === 'weekly') {
    const a = new Date(ev.date + 'T00:00:00');
    const b = new Date(dateISO + 'T00:00:00');
    return a.getDay() === b.getDay();
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
  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrevMonth = new Date(y, m, 0).getDate();
  const today = todayISO();

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

  const dayEvents = d.events.filter((e) => occursOn(e, selected)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  page.innerHTML = `
    <div class="topbar" style="margin-bottom:8px;"><h1 style="font-size:22px;">Agenda</h1><button class="mini-btn" id="add" style="margin-left:auto;">${icons.plus} Novo evento</button></div>
    <div class="card"><div class="card-body">
      <div class="month-nav">
        <button class="icon-btn sm" id="prev">${icons.chevronLeft}</button>
        <span class="label">${MONTHS[m]} de ${y}</span>
        <button class="icon-btn sm" id="next">${icons.chevronRight}</button>
      </div>
      <div class="week-grid">
        ${DOW.map((x) => `<div class="dow">${x}</div>`).join('')}
        ${cells.map((c) => {
          const hasEvent = c.dateISO && d.events.some((e) => occursOn(e, c.dateISO));
          const cls = ['day'];
          if (c.other) cls.push('other-month');
          if (c.dateISO === today) cls.push('today');
          if (c.dateISO === selected) cls.push('selected');
          return `<button class="${cls.join(' ')}" ${c.dateISO ? `data-day="${c.dateISO}"` : 'disabled'}>${c.day}${hasEvent ? '<span class="dot"></span>' : ''}</button>`;
        }).join('')}
      </div>
    </div></div>

    <div class="card">
      <div class="card-head"><span class="card-title">${formatSelected(selected)}</span></div>
      <div class="card-body">
        ${dayEvents.length ? dayEvents.map(eventRowHtml).join('') : `<div class="empty">${icons.agenda}<div>Nenhum evento neste dia.</div></div>`}
      </div>
    </div>
  `;

  page.querySelector('#add').addEventListener('click', () => openEventModal(null, selected));
  page.querySelector('#prev').addEventListener('click', () => { viewDate = new Date(y, m - 1, 1); draw(page); });
  page.querySelector('#next').addEventListener('click', () => { viewDate = new Date(y, m + 1, 1); draw(page); });
  page.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', () => { selected = b.dataset.day; draw(page); }));
  page.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openEventModal(d.events.find((e) => e.id === b.dataset.edit))));
  page.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { store.deleteEvent(b.dataset.del); toast('Evento excluído.'); }));
}

function formatSelected(dateISO) {
  const dt = new Date(dateISO + 'T00:00:00');
  return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function eventRowHtml(e) {
  return `
    <div class="item-row">
      <div style="width:48px;flex-shrink:0;font-size:11.5px;color:var(--ink-soft);opacity:.7;padding-top:2px;">${e.time || 'Dia todo'}</div>
      <div style="flex:1;">
        <div class="item-title">${escapeHtml(e.title)}</div>
        ${e.location ? `<div class="item-meta"><span class="chip">${escapeHtml(e.location)}</span></div>` : ''}
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
      <div class="field"><label>Repetir</label>
        <select class="input" id="f-repeat">
          <option value="none" ${!existing || existing.repeat === 'none' ? 'selected' : ''}>Não repete</option>
          <option value="daily" ${existing?.repeat === 'daily' ? 'selected' : ''}>Todos os dias</option>
          <option value="weekly" ${existing?.repeat === 'weekly' ? 'selected' : ''}>Toda semana, no mesmo dia</option>
        </select>
      </div>
      <div class="modal-footer">
        <button class="btn ghost" id="cancel">Cancelar</button>
        <button class="btn" id="save">Salvar</button>
      </div>
    `,
    onMount: (body, close) => {
      body.querySelector('#f-title').focus();
      body.querySelector('#cancel').addEventListener('click', close);
      body.querySelector('#save').addEventListener('click', () => {
        const title = body.querySelector('#f-title').value.trim();
        const date = body.querySelector('#f-date').value;
        if (!title || !date) return;
        const payload = {
          title,
          date,
          time: body.querySelector('#f-time').value || null,
          location: body.querySelector('#f-location').value.trim() || null,
          repeat: body.querySelector('#f-repeat').value
        };
        if (existing) store.updateEvent(existing.id, payload);
        else store.addEvent(payload);
        toast(existing ? 'Evento atualizado.' : 'Evento adicionado.');
        close();
      });
    }
  });
}
