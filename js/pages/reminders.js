import { store } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast } from '../modal.js';
import { escapeHtml } from './home.js';

let unsub = null;

export function renderReminders(page) {
  if (unsub) unsub();
  unsub = store.onChange(() => draw(page));
  draw(page);
}

function draw(page) {
  const d = store.get();
  const list = d.reminders.slice().sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`));

  page.innerHTML = `
    <div class="topbar" style="margin-bottom:8px;"><h1 style="font-size:22px;">Lembretes</h1><button class="mini-btn" id="add" style="margin-left:auto;">${icons.plus} Novo lembrete</button></div>
    <div class="card"><div class="card-body" style="padding-top:12px;">
      ${list.length ? list.map(rowHtml).join('') : `<div class="empty">${icons.reminders}<div>Nenhum lembrete por aqui.</div></div>`}
    </div></div>
  `;

  page.querySelector('#add').addEventListener('click', () => openReminderModal());
  page.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => store.updateReminder(b.dataset.toggle, { done: !b.classList.contains('done') })));
  page.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openReminderModal(d.reminders.find((r) => r.id === b.dataset.edit))));
  page.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { store.deleteReminder(b.dataset.del); toast('Lembrete excluído.'); }));
}

function rowHtml(r) {
  return `
    <div class="item-row">
      <button class="checkbox ${r.done ? 'done' : ''}" data-toggle="${r.id}">${icons.check}</button>
      <div style="flex:1;">
        <div class="item-title ${r.done ? 'done' : ''}">${escapeHtml(r.title)}</div>
        <div class="item-meta"><span class="chip">${r.date ? r.date.split('-').reverse().join('/') : ''} ${r.time || ''}</span></div>
      </div>
      <div class="row-actions">
        <button class="icon-btn sm" data-edit="${r.id}">${icons.edit}</button>
        <button class="icon-btn sm" data-del="${r.id}">${icons.trash}</button>
      </div>
    </div>`;
}

export function openReminderModal(existing) {
  const now = new Date();
  openModal({
    title: existing ? 'Editar lembrete' : 'Novo lembrete',
    bodyHtml: `
      <div class="field"><label>Título</label><input class="input" id="f-title" value="${existing ? escapeHtml(existing.title) : ''}" /></div>
      <div class="field-row">
        <div class="field"><label>Data</label><input class="input" type="date" id="f-date" value="${existing?.date || now.toISOString().slice(0, 10)}" /></div>
        <div class="field"><label>Hora</label><input class="input" type="time" id="f-time" value="${existing?.time || ''}" /></div>
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
        if (!title) return;
        const payload = { title, date: body.querySelector('#f-date').value, time: body.querySelector('#f-time').value || null };
        if (existing) store.updateReminder(existing.id, payload);
        else store.addReminder(payload);
        toast(existing ? 'Lembrete atualizado.' : 'Lembrete adicionado.');
        close();
      });
    }
  });
}
