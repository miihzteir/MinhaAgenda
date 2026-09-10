// Espaços — evolução das "Áreas da vida": cada espaço junta tarefas, notas
// e metas daquele contexto (Pessoal, Trabalho, Saúde...) numa visão só, com
// capa colorida e estatísticas. Continua sendo a mesma entidade "área" por
// baixo, só com uma tela mais rica.
import { store } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast } from '../modal.js';
import { escapeHtml } from './home.js';
import { colorValue } from '../colors.js';
import { openTaskModal } from './tasks.js';
import { openNoteModal } from './notes.js';
import { openGoalModal, goalRowHtml, wireGoalRows } from './goals.js';
import { categorySelectHtml, categoryChipHtml, catOf } from '../categories.js';

const AREA_ICONS = ['star', 'heart', 'book', 'droplet', 'home', 'settings', 'tag', 'layers', 'flame', 'sparkle'];

let unsub = null;
let openSpaceId = null;
let tab = 'geral';

export function renderAreas(page) {
  if (unsub) unsub();
  unsub = store.onChange(() => draw(page));
  draw(page);
}

function draw(page) {
  const d = store.get();
  const area = openSpaceId ? d.areas.find((a) => a.id === openSpaceId) : null;
  if (!area) { openSpaceId = null; drawList(page, d); }
  else drawDetail(page, d, area);
}

function drawList(page, d) {
  page.innerHTML = `
    <div class="topbar" style="margin-bottom:8px;"><h1 style="font-size:22px;">Espaços</h1><button class="mini-btn" id="add" style="margin-left:auto;">${icons.plus} Novo espaço</button></div>
    <p style="font-size:12.5px;color:var(--ink-soft);opacity:.8;margin:0 0 14px;">Um lugar pra cada área da sua vida — tarefas, notas e metas juntas.</p>
    ${d.areas.length ? `<div class="space-grid">${d.areas.map((a) => spaceCardHtml(a, d)).join('')}</div>` : `<div class="card"><div class="card-body"><div class="empty">${icons.tag}<div>Nenhum espaço ainda. Crie, por exemplo, Pessoal, Trabalho ou Saúde.</div></div></div></div>`}
  `;
  page.querySelector('#add').addEventListener('click', () => openAreaModal());
  page.querySelectorAll('[data-open-space]').forEach((el) => el.addEventListener('click', () => {
    if (el.dataset.justDragged) { delete el.dataset.justDragged; return; }
    openSpaceId = el.dataset.openSpace; tab = 'geral'; draw(page);
  }));
  wireSpaceReorder(page);
}

// Reordenar clicando e segurando, tipo Trello — funciona com mouse e toque
// (Pointer Events cobrem os dois). Só decide a ordem final quando solta;
// não escreve no store a cada milímetro de movimento.
function wireSpaceReorder(page) {
  const grid = page.querySelector('.space-grid');
  if (!grid) return;

  grid.querySelectorAll('.space-card').forEach((card) => {
    card.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const startX = e.clientX;
      const startY = e.clientY;
      let dragging = false;
      const longPressTimer = setTimeout(() => {
        dragging = true;
        card.classList.add('reorder-active');
        try { card.setPointerCapture(e.pointerId); } catch {}
      }, 380);

      const onMove = (ev) => {
        if (!dragging) {
          if (Math.abs(ev.clientX - startX) > 8 || Math.abs(ev.clientY - startY) > 8) clearTimeout(longPressTimer);
          return;
        }
        const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.space-card');
        if (target && target !== card && target.parentElement === grid) {
          const rect = target.getBoundingClientRect();
          const before = ev.clientX < rect.left + rect.width / 2;
          grid.insertBefore(card, before ? target : target.nextSibling);
        }
      };
      const onUp = () => {
        clearTimeout(longPressTimer);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (dragging) {
          card.classList.remove('reorder-active');
          card.dataset.justDragged = '1';
          const ids = Array.from(grid.querySelectorAll('.space-card')).map((c) => c.dataset.openSpace);
          store.reorderAreas(ids);
        }
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
    });
  });
}

// Reduz a imagem antes de guardar (base64), pra não pesar o armazenamento
// local nem a sincronização — largura máxima ~640px, JPEG comprimido.
function resizeImageFile(file, maxW = 640, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    }; img.onerror = reject; img.src = reader.result; };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function spaceStats(a, d) {
  return {
    tasks: d.tasks.filter((t) => t.areaId === a.id && !t.done).length,
    notes: d.notes.filter((n) => n.areaId === a.id && !n.archived).length,
    goals: d.goals.filter((g) => g.areaId === a.id && !g.done).length
  };
}

function bannerHtml(a, size) {
  const color = colorValue(a.color);
  if (a.coverImage) return `<div class="space-banner${size ? ' ' + size : ''}" style="--sw-color:${color};background-image:url('${a.coverImage}');"></div>`;
  return `<div class="space-banner${size ? ' ' + size : ''}" style="--sw-color:${color};">${icons[a.icon] || icons.star}</div>`;
}

function spaceCardHtml(a, d) {
  const s = spaceStats(a, d);
  return `
    <div class="space-card" data-open-space="${a.id}">
      ${bannerHtml(a)}
      <div class="space-card-body">
        <div class="item-title">${escapeHtml(a.name)}</div>
        <div class="item-meta" style="margin-top:6px;">
          <span class="chip">${s.tasks} tarefa${s.tasks === 1 ? '' : 's'}</span>
          <span class="chip">${s.notes} nota${s.notes === 1 ? '' : 's'}</span>
          <span class="chip">${s.goals} meta${s.goals === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>`;
}

function drawDetail(page, d, a) {
  const s = spaceStats(a, d);
  const areaTasks = d.tasks.filter((t) => t.areaId === a.id);
  const areaNotes = d.notes.filter((n) => n.areaId === a.id && !n.archived);
  const areaGoals = d.goals.filter((g) => g.areaId === a.id);

  page.innerHTML = `
    <button class="mini-btn" id="back" style="margin-bottom:10px;">${icons.chevronLeft} Todos os espaços</button>
    ${bannerHtml(a, 'large')}
    <div class="topbar" style="margin:12px 0 8px;">
      <h1 style="font-size:22px;">${escapeHtml(a.name)}</h1>
      <div class="row-actions" style="opacity:1;">
        <button class="icon-btn sm" id="edit-space">${icons.edit}</button>
        <button class="icon-btn sm" id="del-space">${icons.trash}</button>
      </div>
    </div>
    ${a.description ? `<p style="font-size:13px;color:var(--ink-soft);opacity:.85;margin:-6px 0 10px;">${escapeHtml(a.description)}</p>` : ''}
    ${a.categoryId ? `<div style="margin:-4px 0 10px;">${categoryChipHtml(a.categoryId)}</div>` : ''}
    <div class="space-stats-grid">
      <div class="stat"><div><div class="stat-num">${s.tasks}</div><div class="stat-label">tarefas</div></div></div>
      <div class="stat"><div><div class="stat-num">${s.notes}</div><div class="stat-label">notas</div></div></div>
      <div class="stat"><div><div class="stat-num">${s.goals}</div><div class="stat-label">metas</div></div></div>
    </div>
    <div class="view-toggle" style="margin:14px 0 10px;">
      ${['geral', 'tarefas', 'notas', 'metas'].map((t) => `<button data-tab="${t}" class="${tab === t ? 'active' : ''}">${t === 'geral' ? 'Visão geral' : t.charAt(0).toUpperCase() + t.slice(1)}</button>`).join('')}
    </div>
    <div id="space-tab-body"></div>
  `;

  page.querySelector('#back').addEventListener('click', () => { openSpaceId = null; draw(page); });
  page.querySelector('#edit-space').addEventListener('click', () => openAreaModal(a));
  page.querySelector('#del-space').addEventListener('click', () => {
    const inUse = d.tasks.some((t) => t.areaId === a.id) || d.events.some((e) => e.areaId === a.id) || d.notes.some((n) => n.areaId === a.id) || d.goals.some((g) => g.areaId === a.id);
    if (confirm(inUse ? 'Esse espaço está em uso. Excluir mesmo assim? Os itens ficam sem espaço.' : 'Excluir esse espaço?')) {
      store.deleteArea(a.id);
      toast('Espaço excluído.');
      openSpaceId = null;
    }
  });
  page.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; draw(page); }));

  const body = page.querySelector('#space-tab-body');

  if (tab === 'geral') {
    body.innerHTML = `
      <div class="card"><div class="card-head"><span class="card-title">Próximas tarefas</span><button class="mini-btn" data-add="tarefa">${icons.plus} Nova</button></div>
        <div class="card-body">${areaTasks.filter((t) => !t.done).slice(0, 5).map((t) => spaceTaskRowHtml(t)).join('') || emptyMini('Nenhuma tarefa neste espaço.')}</div></div>
      <div class="card"><div class="card-head"><span class="card-title">Notas recentes</span><button class="mini-btn" data-add="nota">${icons.plus} Nova</button></div>
        <div class="card-body">${areaNotes.slice(0, 5).map((n) => `<div class="item-row" style="cursor:pointer;" data-space-note-edit="${n.id}"><div class="item-title" style="flex:1;">${escapeHtml(n.title)}</div></div>`).join('') || emptyMini('Nenhuma nota neste espaço.')}</div></div>
      <div class="card"><div class="card-head"><span class="card-title">Metas</span><button class="mini-btn" data-add="meta">${icons.plus} Nova</button></div>
        <div class="card-body">${areaGoals.slice(0, 5).map(goalRowHtml).join('') || emptyMini('Nenhuma meta neste espaço.')}</div></div>
    `;
    wireGoalRows(body, d);
    body.querySelectorAll('[data-space-task-toggle]').forEach((b) => b.addEventListener('click', () => store.updateTask(b.dataset.spaceTaskToggle, { done: !b.classList.contains('done') })));
    body.querySelectorAll('[data-space-task-edit]').forEach((b) => b.addEventListener('click', () => openTaskModal(areaTasks.find((t) => t.id === b.dataset.spaceTaskEdit))));
    body.querySelectorAll('[data-space-note-edit]').forEach((b) => b.addEventListener('click', () => openNoteModal(areaNotes.find((n) => n.id === b.dataset.spaceNoteEdit))));
  } else if (tab === 'tarefas') {
    body.innerHTML = `<div class="card"><div class="card-head"><span class="card-title">Tarefas</span><button class="mini-btn" data-add="tarefa">${icons.plus} Nova</button></div>
      <div class="card-body">${areaTasks.map((t) => spaceTaskRowHtml(t)).join('') || emptyMini('Nenhuma tarefa neste espaço.')}</div></div>`;
    body.querySelectorAll('[data-space-task-toggle]').forEach((b) => b.addEventListener('click', () => store.updateTask(b.dataset.spaceTaskToggle, { done: !b.classList.contains('done') })));
    body.querySelectorAll('[data-space-task-edit]').forEach((b) => b.addEventListener('click', () => openTaskModal(areaTasks.find((t) => t.id === b.dataset.spaceTaskEdit))));
  } else if (tab === 'notas') {
    body.innerHTML = `<div class="card"><div class="card-head"><span class="card-title">Notas</span><button class="mini-btn" data-add="nota">${icons.plus} Nova</button></div>
      <div class="card-body">${areaNotes.map((n) => `<div class="item-row" style="cursor:pointer;" data-space-note-edit="${n.id}"><div class="item-title" style="flex:1;">${escapeHtml(n.title)}</div></div>`).join('') || emptyMini('Nenhuma nota neste espaço.')}</div></div>`;
    body.querySelectorAll('[data-space-note-edit]').forEach((b) => b.addEventListener('click', () => openNoteModal(areaNotes.find((n) => n.id === b.dataset.spaceNoteEdit))));
  } else if (tab === 'metas') {
    body.innerHTML = `<div class="card"><div class="card-head"><span class="card-title">Metas</span><button class="mini-btn" data-add="meta">${icons.plus} Nova</button></div>
      <div class="card-body">${areaGoals.map(goalRowHtml).join('') || emptyMini('Nenhuma meta neste espaço.')}</div></div>`;
    wireGoalRows(body, d);
  }

  body.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.add === 'tarefa') return openTaskModal(null, null, a.id);
    if (b.dataset.add === 'nota') return openNoteModal(null, a.id);
    if (b.dataset.add === 'meta') return openGoalModal(null, a.id);
  }));
}

function spaceTaskRowHtml(t) {
  return `
    <div class="task-row">
      <span class="item-dot" style="--sw-color:${colorValue(t.color)}"></span>
      <button class="checkbox ${t.done ? 'done' : ''}" data-space-task-toggle="${t.id}">${icons.check}</button>
      <div style="flex:1;">
        <div class="item-title ${t.done ? 'done' : ''}" data-space-task-edit="${t.id}" style="cursor:pointer;">${escapeHtml(t.title)}</div>
      </div>
    </div>`;
}

function emptyMini(text) {
  return `<div style="font-size:11.5px;color:var(--ink-soft);opacity:.6;padding:6px 4px;">${text}</div>`;
}

export function openAreaModal(existing) {
  openModal({
    title: existing ? 'Editar espaço' : 'Novo espaço',
    bodyHtml: `
      <div class="field"><label>Nome</label><input class="input" id="f-name" placeholder="Ex.: Trabalho" value="${existing ? escapeHtml(existing.name) : ''}" /></div>
      <div class="field"><label>Descrição (opcional)</label><textarea class="input" id="f-desc" rows="2" placeholder="Uma frase sobre esse espaço">${existing ? escapeHtml(existing.description || '') : ''}</textarea></div>
      <div class="field"><label>Categoria (opcional)</label>${categorySelectHtml(existing?.categoryId)}
        <p style="font-size:11px;color:var(--ink-soft);opacity:.7;margin:4px 0 0;">A cor do espaço segue a da categoria escolhida.</p>
      </div>
      <div class="field"><label>Ícone</label>
        <div class="icon-select" id="f-icon">
          ${AREA_ICONS.map((ic) => `<button type="button" class="icon-opt" data-icon="${ic}" aria-pressed="${(existing?.icon || 'star') === ic}">${icons[ic]}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <label>Imagem de capa (opcional)</label>
        <div id="f-cover-preview" class="cover-preview" style="${existing?.coverImage ? `background-image:url('${existing.coverImage}');` : ''}">${existing?.coverImage ? '' : 'Sem imagem'}</div>
        <div style="display:flex;gap:8px;margin-top:7px;">
          <input type="file" accept="image/*" id="f-cover-input" style="display:none;" />
          <button type="button" class="mini-btn" id="f-cover-pick">${icons.download} Escolher imagem</button>
          <button type="button" class="mini-btn" id="f-cover-remove" ${existing?.coverImage ? '' : 'hidden'}>${icons.x} Remover</button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn ghost" id="cancel">Cancelar</button>
        <button class="btn" id="save">Salvar</button>
      </div>
    `,
    onMount: (body, close) => {
      let icon = existing?.icon || 'star';
      let coverImage = existing?.coverImage || null;
      body.querySelectorAll('[data-icon]').forEach((b) => b.addEventListener('click', () => {
        icon = b.dataset.icon;
        body.querySelectorAll('[data-icon]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.icon === icon));
      }));
      body.querySelector('#f-name').focus();
      body.querySelector('#cancel').addEventListener('click', close);

      const preview = body.querySelector('#f-cover-preview');
      const removeBtn = body.querySelector('#f-cover-remove');
      body.querySelector('#f-cover-pick').addEventListener('click', () => body.querySelector('#f-cover-input').click());
      body.querySelector('#f-cover-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          coverImage = await resizeImageFile(file);
          preview.style.backgroundImage = `url('${coverImage}')`;
          preview.textContent = '';
          removeBtn.hidden = false;
        } catch {
          toast('Não consegui ler essa imagem. Tenta outra?');
        }
      });
      removeBtn.addEventListener('click', () => {
        coverImage = null;
        preview.style.backgroundImage = '';
        preview.textContent = 'Sem imagem';
        removeBtn.hidden = true;
      });

      body.querySelector('#save').addEventListener('click', () => {
        const name = body.querySelector('#f-name').value.trim();
        if (!name) return;
        const description = body.querySelector('#f-desc').value.trim();
        const categoryId = body.querySelector('#f-category').value || null;
        const color = categoryId ? catOf(categoryId).color : 'cocoa';
        if (existing) store.updateArea(existing.id, { name, description, color, icon, coverImage, categoryId });
        else store.addArea({ name, description, color, icon, coverImage, categoryId });
        toast(existing ? 'Espaço atualizado.' : 'Espaço criado.');
        close();
      });
    }
  });
}

export function areaChipHtml(areaId) {
  const a = store.get().areas.find((x) => x.id === areaId);
  if (!a) return '';
  return `<span class="chip area-chip" style="--sw-color:${colorValue(a.color)};">${icons[a.icon] || icons.star}${escapeHtml(a.name)}</span>`;
}
