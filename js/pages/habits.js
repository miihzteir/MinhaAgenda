import { store, todayISO } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast } from '../modal.js';
import { escapeHtml } from './home.js';

let unsub = null;

export function renderHabits(page) {
  if (unsub) unsub();
  unsub = store.onChange(() => draw(page));
  draw(page);
}

function draw(page) {
  const d = store.get();
  const today = todayISO();

  page.innerHTML = `
    <div class="topbar" style="margin-bottom:8px;"><h1 style="font-size:22px;">Hábitos</h1><button class="mini-btn" id="add" style="margin-left:auto;">${icons.plus} Novo hábito</button></div>
    <div class="card"><div class="card-body" style="padding-top:12px;">
      ${d.habits.length ? d.habits.map((h) => rowHtml(h, today)).join('') : `<div class="empty">${icons.habits}<div>Nenhum hábito ainda. Comece com algo pequeno.</div></div>`}
    </div></div>
  `;

  page.querySelector('#add').addEventListener('click', () => openHabitModal());
  page.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => store.toggleHabitToday(b.dataset.toggle)));
  page.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { store.deleteHabit(b.dataset.del); toast('Hábito excluído.'); }));
}

function rowHtml(h, today) {
  const done = h.history.includes(today);
  const last7 = [...Array(7)].map((_, i) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - (6 - i));
    const iso = dt.toISOString().slice(0, 10);
    return h.history.includes(iso);
  });
  return `
    <div class="item-row">
      <button class="checkbox ${done ? 'done' : ''}" data-toggle="${h.id}">${icons.check}</button>
      <div style="flex:1;">
        <div class="item-title">${escapeHtml(h.name)} ${h.history.length ? `<span style="font-size:11px;opacity:.6;">🔥${h.history.length}</span>` : ''}</div>
        <div style="display:flex;gap:3px;margin-top:6px;">
          ${last7.map((on) => `<span style="width:16px;height:16px;border-radius:5px;background:${on ? 'var(--sage-500)' : 'var(--cocoa-50)'};display:inline-block;"></span>`).join('')}
        </div>
      </div>
      <div class="row-actions"><button class="icon-btn sm" data-del="${h.id}">${icons.trash}</button></div>
    </div>`;
}

export function openHabitModal() {
  openModal({
    title: 'Novo hábito',
    bodyHtml: `
      <div class="field"><label>Nome</label><input class="input" id="f-name" placeholder="Ex.: Beber água" /></div>
      <div class="modal-footer">
        <button class="btn ghost" id="cancel">Cancelar</button>
        <button class="btn" id="save">Salvar</button>
      </div>
    `,
    onMount: (body, close) => {
      body.querySelector('#f-name').focus();
      body.querySelector('#cancel').addEventListener('click', close);
      body.querySelector('#save').addEventListener('click', () => {
        const name = body.querySelector('#f-name').value.trim();
        if (!name) return;
        store.addHabit({ name });
        toast('Hábito adicionado.');
        close();
      });
    }
  });
}
