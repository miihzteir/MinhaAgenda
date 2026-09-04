// Notas — inclui também "listas" (notas do tipo checklist), sem precisar de
// uma aba nova: é só escolher o tipo ao criar a nota.
import { store, todayISO } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast } from '../modal.js';
import { escapeHtml } from './home.js';
import { areaChipHtml } from './areas.js';

let unsub = null;
let search = '';
let showArchived = false;

export function renderNotes(page) {
  if (unsub) unsub();
  unsub = store.onChange(() => draw(page));
  draw(page);
}

function draw(page) {
  const d = store.get();
  const q = search.trim().toLowerCase();
  let list = d.notes.filter((n) => showArchived ? n.archived : !n.archived);
  if (q) {
    list = list.filter((n) =>
      n.title.toLowerCase().includes(q) ||
      (n.text || '').toLowerCase().includes(q) ||
      (n.tags || []).some((t) => t.toLowerCase().includes(q)) ||
      (n.items || []).some((it) => it.text.toLowerCase().includes(q))
    );
  }
  list = list.sort((a, b) => (b.pinned - a.pinned) || (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);

  page.innerHTML = `
    <div class="topbar" style="margin-bottom:8px;"><h1 style="font-size:22px;">Notas</h1><button class="mini-btn" id="add" style="margin-left:auto;">${icons.plus} Nova nota</button></div>
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center;">
      <div class="field" style="max-width:280px;margin:0;flex:1;"><input class="input" id="search" placeholder="Buscar notas, listas, tags..." value="${escapeHtml(search)}" /></div>
      <button class="mini-btn" id="toggle-archived" style="${showArchived ? 'background:var(--accent);color:var(--cream);' : ''}">${icons.book} ${showArchived ? 'Arquivadas' : 'Ver arquivadas'}</button>
    </div>
    <div class="card"><div class="card-body" style="padding-top:12px;">
      ${list.length ? list.map(rowHtml).join('') : `<div class="empty">${icons.notes}<div>${showArchived ? 'Nenhuma nota arquivada.' : 'Nenhuma nota ainda.'}</div></div>`}
    </div></div>
  `;

  page.querySelector('#add').addEventListener('click', () => openNoteModal());
  page.querySelector('#search').addEventListener('input', (e) => { search = e.target.value; draw(page); });
  page.querySelector('#toggle-archived').addEventListener('click', () => { showArchived = !showArchived; draw(page); });
  page.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openNoteModal(d.notes.find((n) => n.id === b.dataset.edit))));
  page.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); if (confirm('Excluir esta nota?')) { store.deleteNote(b.dataset.del); toast('Nota excluída.'); } }));
  page.querySelectorAll('[data-pin]').forEach((b) => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const n = d.notes.find((x) => x.id === b.dataset.pin);
    store.updateNote(n.id, { pinned: !n.pinned });
  }));
  page.querySelectorAll('[data-archive]').forEach((b) => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const n = d.notes.find((x) => x.id === b.dataset.archive);
    store.updateNote(n.id, { archived: !n.archived });
    toast(n.archived ? 'Nota desarquivada.' : 'Nota arquivada.');
  }));
  page.querySelectorAll('[data-item-toggle]').forEach((b) => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    store.toggleNoteItem(b.dataset.noteId, b.dataset.itemToggle);
  }));
}

function rowHtml(n) {
  const isList = n.type === 'checklist';
  const itemsDone = isList ? (n.items || []).filter((it) => it.done).length : 0;
  const itemsTotal = isList ? (n.items || []).length : 0;
  return `
    <div class="item-row" data-edit="${n.id}" style="cursor:pointer;align-items:flex-start;">
      <span class="area-ic" style="--sw-color:var(--accent);flex-shrink:0;">${icons[isList ? 'tasks' : 'notes']}</span>
      <div style="flex:1;min-width:0;">
        <div class="item-title">${n.pinned ? `${icons.star} ` : ''}${escapeHtml(n.title || 'Sem título')}</div>
        ${isList
          ? `<div style="margin-top:4px;">
              ${(n.items || []).slice(0, 5).map((it) => `
                <div style="display:flex;align-items:center;gap:6px;font-size:12.5px;padding:2px 0;">
                  <button type="button" class="checkbox sm ${it.done ? 'done' : ''}" data-note-id="${n.id}" data-item-toggle="${it.id}" style="width:16px;height:16px;flex-shrink:0;">${icons.check}</button>
                  <span style="${it.done ? 'text-decoration:line-through;opacity:.6;' : ''}">${escapeHtml(it.text)}</span>
                </div>`).join('')}
              ${itemsTotal > 5 ? `<div style="font-size:11px;color:var(--ink-soft);opacity:.7;">+${itemsTotal - 5} itens</div>` : ''}
            </div>`
          : (n.text ? `<div style="font-size:12px;color:var(--ink-soft);opacity:.75;margin-top:3px;">${escapeHtml(n.text.slice(0, 90))}</div>` : '')}
        <div class="item-meta">
          <span class="chip">${formatNoteDate(n.date)}</span>
          ${isList && itemsTotal ? `<span class="chip">${itemsDone}/${itemsTotal}</span>` : ''}
          ${n.areaId ? areaChipHtml(n.areaId) : ''}
          ${(n.tags || []).map((t) => `<span class="chip">#${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
      <div class="row-actions">
        <button class="icon-btn sm" data-pin="${n.id}" title="${n.pinned ? 'Desafixar' : 'Fixar'}">${icons.star}</button>
        <button class="icon-btn sm" data-archive="${n.id}" title="${n.archived ? 'Desarquivar' : 'Arquivar'}">${icons.book}</button>
        <button class="icon-btn sm" data-del="${n.id}">${icons.trash}</button>
      </div>
    </div>`;
}

function formatNoteDate(dateISO) {
  if (!dateISO) return '';
  const dt = new Date(dateISO + 'T00:00:00');
  const today = todayISO();
  if (dateISO === today) return 'Hoje';
  return dt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function uidLocal() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function openNoteModal(existing) {
  let items = (existing?.items || []).map((it) => ({ ...it }));
  const areas = store.get().areas;

  openModal({
    title: existing ? 'Editar nota' : 'Nova nota',
    bodyHtml: `
      <div class="field"><label>Título</label><input class="input" id="f-title" value="${existing ? escapeHtml(existing.title) : ''}" /></div>
      <div class="field"><label>Tipo</label>
        <div class="chip-select" id="f-type">
          <button type="button" class="chip-opt" data-type="text" aria-pressed="${!existing || existing.type !== 'checklist'}">${icons.notes} Texto</button>
          <button type="button" class="chip-opt" data-type="checklist" aria-pressed="${existing?.type === 'checklist'}">${icons.tasks} Lista</button>
        </div>
      </div>
      <div class="field" id="f-text-row" ${existing?.type === 'checklist' ? 'hidden' : ''}>
        <label>Conteúdo</label><textarea class="input" id="f-text" rows="5">${existing ? escapeHtml(existing.text || '') : ''}</textarea>
      </div>
      <div class="field" id="f-items-row" ${existing?.type === 'checklist' ? '' : 'hidden'}>
        <label>Itens da lista</label>
        <div class="subtask-list" id="f-items"></div>
        <button type="button" class="mini-btn" id="add-item" style="margin-top:6px;">${icons.plus} Adicionar item</button>
      </div>
      <div class="field"><label>Data</label><input class="input" type="date" id="f-date" value="${existing?.date || todayISO()}" /></div>
      <div class="field"><label>Tags (separadas por vírgula, opcional)</label><input class="input" id="f-tags" value="${existing ? escapeHtml((existing.tags || []).join(', ')) : ''}" placeholder="Ex.: faculdade, ideias" /></div>
      ${areas.length ? `
      <div class="field"><label>Área (opcional)</label>
        <select class="input" id="f-area">
          <option value="">Nenhuma</option>
          ${areas.map((a) => `<option value="${a.id}" ${existing?.areaId === a.id ? 'selected' : ''}>${escapeHtml(a.name)}</option>`).join('')}
        </select>
      </div>` : ''}
      <div class="modal-footer">
        <button class="btn ghost" id="cancel">Cancelar</button>
        <button class="btn" id="save">Salvar</button>
      </div>
    `,
    onMount: (body, close) => {
      let type = existing?.type === 'checklist' ? 'checklist' : 'text';
      body.querySelector('#f-title').focus();
      body.querySelector('#cancel').addEventListener('click', close);

      body.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
        type = b.dataset.type;
        body.querySelectorAll('[data-type]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.type === type));
        body.querySelector('#f-text-row').hidden = type !== 'text';
        body.querySelector('#f-items-row').hidden = type !== 'checklist';
      }));

      const itemsListEl = body.querySelector('#f-items');
      function drawItems() {
        itemsListEl.innerHTML = items.map((it, i) => `
          <div class="subtask-row" data-i="${i}">
            <button type="button" class="checkbox ${it.done ? 'done' : ''}" data-it-toggle="${i}">${icons.check}</button>
            <input class="input" data-it-text="${i}" value="${escapeHtml(it.text)}" placeholder="Item da lista" style="flex:1;" />
            <button type="button" class="icon-btn sm" data-it-del="${i}">${icons.trash}</button>
          </div>`).join('');
        itemsListEl.querySelectorAll('[data-it-toggle]').forEach((b) => b.addEventListener('click', () => {
          items[Number(b.dataset.itToggle)].done = !items[Number(b.dataset.itToggle)].done;
          drawItems();
        }));
        itemsListEl.querySelectorAll('[data-it-text]').forEach((inp) => inp.addEventListener('input', (e) => {
          items[Number(inp.dataset.itText)].text = e.target.value;
        }));
        itemsListEl.querySelectorAll('[data-it-del]').forEach((b) => b.addEventListener('click', () => {
          items.splice(Number(b.dataset.itDel), 1);
          drawItems();
        }));
      }
      drawItems();
      body.querySelector('#add-item').addEventListener('click', () => {
        items.push({ id: uidLocal(), text: '', done: false });
        drawItems();
        itemsListEl.querySelector(`[data-it-text="${items.length - 1}"]`)?.focus();
      });

      body.querySelector('#save').addEventListener('click', () => {
        const title = body.querySelector('#f-title').value.trim();
        const text = body.querySelector('#f-text').value.trim();
        const cleanItems = items.filter((it) => it.text.trim());
        if (!title && !text && !cleanItems.length) return;
        const tags = body.querySelector('#f-tags').value.split(',').map((t) => t.trim()).filter(Boolean);
        const payload = {
          title: title || 'Sem título',
          text: type === 'text' ? text : '',
          type,
          items: type === 'checklist' ? cleanItems : [],
          date: body.querySelector('#f-date').value || todayISO(),
          tags,
          areaId: body.querySelector('#f-area')?.value || null
        };
        if (existing) store.updateNote(existing.id, payload);
        else store.addNote(payload);
        toast(existing ? 'Nota atualizada.' : 'Nota adicionada.');
        close();
      });
    }
  });
}
