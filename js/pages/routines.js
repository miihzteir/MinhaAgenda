// Rotinas — checklists que se repetem (rotina da manhã, da noite...),
// reiniciando a cada dia aplicável.
import { store, todayISO } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast } from '../modal.js';
import { escapeHtml } from './home.js';

let unsub = null;

const FREQ_LABELS = { daily: 'Todos os dias', weekdays: 'Dias úteis', weekend: 'Fim de semana', days: 'Dias específicos' };
const DOW_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function routineAppliesOn(r, dateISO) {
  const f = r.frequency || { kind: 'daily' };
  const dow = new Date(dateISO + 'T00:00:00').getDay();
  if (f.kind === 'weekdays') return dow >= 1 && dow <= 5;
  if (f.kind === 'weekend') return dow === 0 || dow === 6;
  if (f.kind === 'days') return (f.days || []).includes(dow);
  return true;
}

export function renderRoutines(page) {
  if (unsub) unsub();
  unsub = store.onChange(() => draw(page));
  draw(page);
}

function draw(page) {
  const d = store.get();
  const today = todayISO();
  const list = d.routines.filter((r) => routineAppliesOn(r, today));
  const others = d.routines.filter((r) => !routineAppliesOn(r, today));

  page.innerHTML = `
    <div class="topbar" style="margin-bottom:8px;"><h1 style="font-size:22px;">Rotinas</h1><button class="mini-btn" id="add" style="margin-left:auto;">${icons.plus} Nova rotina</button></div>
    <p style="font-size:12.5px;color:var(--ink-soft);opacity:.8;margin:0 0 12px;">Checklists que voltam do zero a cada dia que valem — tipo a rotina da manhã ou da noite.</p>
    ${list.length ? list.map((r) => routineCardHtml(r, today)).join('') : `<div class="card"><div class="card-body"><div class="empty">${icons.layers}<div>Nenhuma rotina pra hoje.</div></div></div></div>`}
    ${others.length ? `
      <p style="font-size:11px;color:var(--ink-soft);opacity:.6;margin:16px 0 8px;">Não valem hoje</p>
      ${others.map((r) => routineCardHtml(r, today, true)).join('')}
    ` : ''}
  `;

  page.querySelector('#add').addEventListener('click', () => openRoutineModal());
  page.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openRoutineModal(d.routines.find((r) => r.id === b.dataset.edit))));
  page.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
    if (confirm('Excluir esta rotina?')) { store.deleteRoutine(b.dataset.del); toast('Rotina excluída.'); }
  }));
  page.querySelectorAll('[data-item-toggle]').forEach((b) => b.addEventListener('click', () => {
    store.toggleRoutineItem(b.dataset.routine, b.dataset.itemToggle, today);
  }));
}

function routineCardHtml(r, today, dimmed) {
  const doneIds = new Set(r.completions[today] || []);
  const total = r.items.length;
  const done = r.items.filter((it) => doneIds.has(it.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `
    <div class="card" style="${dimmed ? 'opacity:.55;' : ''}">
      <div class="card-head">
        <span class="card-title">${escapeHtml(r.name)}</span>
        <span class="card-sub">${done}/${total} · ${FREQ_LABELS[(r.frequency || {}).kind || 'daily']}</span>
        <div class="row-actions" style="margin-left:8px;">
          <button class="icon-btn sm" data-edit="${r.id}">${icons.edit}</button>
          <button class="icon-btn sm" data-del="${r.id}">${icons.trash}</button>
        </div>
      </div>
      <div class="card-body">
        ${total ? `<div class="bar-track" style="height:6px;margin-bottom:10px;"><div class="bar-fill" style="width:${pct}%;"></div></div>` : ''}
        ${r.items.length ? r.items.map((it) => `
          <div class="item-row">
            <button class="checkbox ${doneIds.has(it.id) ? 'done' : ''}" data-routine="${r.id}" data-item-toggle="${it.id}" ${dimmed ? 'disabled' : ''}>${icons.check}</button>
            <div class="item-title ${doneIds.has(it.id) ? 'done' : ''}">${escapeHtml(it.title)}</div>
          </div>`).join('') : `<div style="font-size:12px;color:var(--ink-soft);opacity:.7;">Sem itens ainda.</div>`}
      </div>
    </div>`;
}

export function openRoutineModal(existing) {
  let items = (existing?.items || []).map((i) => ({ ...i }));
  let days = (existing?.frequency || {}).days || [];

  openModal({
    title: existing ? 'Editar rotina' : 'Nova rotina',
    bodyHtml: `
      <div class="field"><label>Nome</label><input class="input" id="f-name" placeholder="Ex.: Rotina da manhã" value="${existing ? escapeHtml(existing.name) : ''}" /></div>
      <div class="field"><label>Frequência</label>
        <select class="input" id="f-freq">
          ${Object.entries(FREQ_LABELS).map(([k, l]) => `<option value="${k}" ${((existing?.frequency || {}).kind || 'daily') === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="field" id="f-days-row" ${((existing?.frequency || {}).kind !== 'days') ? 'hidden' : ''}>
        <label>Dias da semana</label>
        <div class="chip-select">
          ${DOW_LETTERS.map((l, i) => `<button type="button" class="chip-opt" data-dow="${i}" aria-pressed="${days.includes(i)}">${l}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <label>Itens</label>
        <div class="subtask-list" id="f-items"></div>
        <button type="button" class="mini-btn" id="add-item" style="margin-top:6px;">${icons.plus} Adicionar item</button>
      </div>
      <div class="modal-footer">
        <button class="btn ghost" id="cancel">Cancelar</button>
        <button class="btn" id="save">Salvar</button>
      </div>
    `,
    onMount: (body, close) => {
      body.querySelector('#f-name').focus();
      body.querySelector('#cancel').addEventListener('click', () => close());
      body.querySelector('#f-freq').addEventListener('change', (e) => {
        body.querySelector('#f-days-row').hidden = e.target.value !== 'days';
      });
      body.querySelectorAll('[data-dow]').forEach((b) => b.addEventListener('click', () => {
        const i = Number(b.dataset.dow);
        days = days.includes(i) ? days.filter((x) => x !== i) : [...days, i];
        b.setAttribute('aria-pressed', days.includes(i));
      }));

      const itemsEl = body.querySelector('#f-items');
      function drawItems() {
        itemsEl.innerHTML = items.map((it, i) => `
          <div class="subtask-row">
            <input class="input" data-item-title="${i}" value="${escapeHtml(it.title)}" placeholder="Item" style="flex:1;" />
            <button type="button" class="icon-btn sm" data-item-del="${i}">${icons.trash}</button>
          </div>`).join('');
        itemsEl.querySelectorAll('[data-item-title]').forEach((inp) => inp.addEventListener('input', (e) => {
          items[Number(inp.dataset.itemTitle)].title = e.target.value;
        }));
        itemsEl.querySelectorAll('[data-item-del]').forEach((b) => b.addEventListener('click', () => {
          items.splice(Number(b.dataset.itemDel), 1);
          drawItems();
        }));
      }
      drawItems();
      body.querySelector('#add-item').addEventListener('click', () => {
        items.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: '' });
        drawItems();
        itemsEl.querySelector(`[data-item-title="${items.length - 1}"]`)?.focus();
      });

      body.querySelector('#save').addEventListener('click', () => {
        const name = body.querySelector('#f-name').value.trim();
        if (!name) return;
        const freqKind = body.querySelector('#f-freq').value;
        const frequency = { kind: freqKind };
        if (freqKind === 'days') frequency.days = days;
        const payload = { name, frequency, items: items.filter((i) => i.title.trim()) };
        if (existing) store.updateRoutine(existing.id, payload);
        else store.addRoutine(payload);
        toast(existing ? 'Rotina atualizada.' : 'Rotina criada.');
        close();
      });
    }
  });
}
