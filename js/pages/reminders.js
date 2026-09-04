import { store, todayISO } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast } from '../modal.js';
import { escapeHtml } from './home.js';

let unsub = null;
let notifyTimer = null;

export function renderReminders(page) {
  if (unsub) unsub();
  unsub = store.onChange(() => draw(page));
  draw(page);
  startWatcher();
}

// Enquanto a aba estiver aberta, avisa quando um lembrete chega na hora.
// (Sem servidor, não dá pra avisar com o app fechado — isso é honesto sobre a limitação.)
function startWatcher() {
  if (notifyTimer) return;
  notifyTimer = setInterval(() => {
    const now = new Date();
    const nowISO = now.toISOString().slice(0, 10);
    const nowHM = now.toTimeString().slice(0, 5);
    store.get().reminders.forEach((r) => {
      if (!r.done && r.date === nowISO && r.time === nowHM && !r._notified) {
        store.updateReminder(r.id, { _notified: true });
        if (Notification.permission === 'granted') {
          new Notification('Minha Agenda', { body: r.title });
        }
      }
    });
  }, 30000);
}

function draw(page) {
  const d = store.get();
  const list = d.reminders.slice().sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`));
  const perm = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';

  page.innerHTML = `
    <div class="topbar" style="margin-bottom:8px;"><h1 style="font-size:22px;">Lembretes</h1><button class="mini-btn" id="add" style="margin-left:auto;">${icons.plus} Novo lembrete</button></div>
    ${perm === 'default' ? `
      <div class="callout" style="margin-bottom:14px;">${icons.bell}<div>Ative as notificações do navegador pra ser avisada na hora certa, mesmo em outra aba. <button class="mini-btn" id="ask-perm" style="margin-top:6px;">Ativar</button></div></div>
    ` : ''}
    <div class="card"><div class="card-body" style="padding-top:12px;">
      ${list.length ? list.map(rowHtml).join('') : `<div class="empty">${icons.reminders}<div>Nenhum lembrete por aqui.</div></div>`}
    </div></div>
  `;

  page.querySelector('#add').addEventListener('click', () => openReminderModal());
  page.querySelector('#ask-perm')?.addEventListener('click', () => Notification.requestPermission().then(() => draw(page)));
  page.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => store.updateReminder(b.dataset.toggle, { done: !b.classList.contains('done') })));
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
      <div class="row-actions"><button class="icon-btn sm" data-del="${r.id}">${icons.trash}</button></div>
    </div>`;
}

export function openReminderModal() {
  const now = new Date();
  openModal({
    title: 'Novo lembrete',
    bodyHtml: `
      <div class="field"><label>Título</label><input class="input" id="f-title" /></div>
      <div class="field-row">
        <div class="field"><label>Data</label><input class="input" type="date" id="f-date" value="${now.toISOString().slice(0, 10)}" /></div>
        <div class="field"><label>Hora</label><input class="input" type="time" id="f-time" /></div>
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
        store.addReminder({ title, date: body.querySelector('#f-date').value, time: body.querySelector('#f-time').value || null });
        toast('Lembrete adicionado.');
        close();
      });
    }
  });
}
