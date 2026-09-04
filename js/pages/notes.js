import { store } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast } from '../modal.js';
import { escapeHtml } from './home.js';

let unsub = null;
let search = '';

export function renderNotes(page) {
  if (unsub) unsub();
  unsub = store.onChange(() => draw(page));
  draw(page);
}

function draw(page) {
  const d = store.get();
  const q = search.trim().toLowerCase();
  const list = d.notes
    .filter((n) => !q || n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q))
    .sort((a, b) => b.createdAt - a.createdAt);

  page.innerHTML = `
    <div class="topbar" style="margin-bottom:8px;"><h1 style="font-size:22px;">Notas</h1><button class="mini-btn" id="add" style="margin-left:auto;">${icons.plus} Nova nota</button></div>
    <div class="field" style="max-width:320px;"><input class="input" id="search" placeholder="Buscar notas..." value="${escapeHtml(search)}" /></div>
    <div class="card"><div class="card-body" style="padding-top:12px;">
      ${list.length ? list.map(rowHtml).join('') : `<div class="empty">${icons.notes}<div>Nenhuma nota ainda.</div></div>`}
    </div></div>
  `;

  page.querySelector('#add').addEventListener('click', () => openNoteModal());
  page.querySelector('#search').addEventListener('input', (e) => { search = e.target.value; draw(page); });
  page.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openNoteModal(d.notes.find((n) => n.id === b.dataset.edit))));
  page.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); store.deleteNote(b.dataset.del); toast('Nota excluída.'); }));
}

function rowHtml(n) {
  return `
    <div class="item-row" data-edit="${n.id}" style="cursor:pointer;">
      <div style="flex:1;">
        <div class="item-title">${escapeHtml(n.title || 'Sem título')}</div>
        ${n.text ? `<div style="font-size:12px;color:var(--ink-soft);opacity:.75;margin-top:3px;">${escapeHtml(n.text.slice(0, 90))}</div>` : ''}
        <div class="item-meta"><span class="chip">${formatNoteDate(n.createdAt)}</span></div>
      </div>
      <div class="row-actions"><button class="icon-btn sm" data-del="${n.id}">${icons.trash}</button></div>
    </div>`;
}

function formatNoteDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function openNoteModal(existing) {
  openModal({
    title: existing ? 'Editar nota' : 'Nova nota',
    bodyHtml: `
      <div class="field"><label>Título</label><input class="input" id="f-title" value="${existing ? escapeHtml(existing.title) : ''}" /></div>
      <div class="field"><label>Conteúdo</label><textarea class="input" id="f-text" rows="5">${existing ? escapeHtml(existing.text) : ''}</textarea></div>
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
        const text = body.querySelector('#f-text').value.trim();
        if (!title && !text) return;
        const payload = { title: title || 'Sem título', text };
        if (existing) store.updateNote(existing.id, payload);
        else store.addNote(payload);
        toast(existing ? 'Nota atualizada.' : 'Nota adicionada.');
        close();
      });
    }
  });
}
