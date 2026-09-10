// Metas — objetivos com prazo e progresso. Progresso simples de 0 a 100%,
// sem gamificação forçada.
import { store, todayISO } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast, celebrateToast } from '../modal.js';
import { escapeHtml } from './home.js';
import { colorValue, colorSwatchesHtml, wireColorSwatches } from '../colors.js';
import { categorySelectHtml, categoryChipHtml, catOf } from '../categories.js';
import { areaChipHtml } from './areas.js';

let unsub = null;
let filter = 'andamento';

export function renderGoals(page) {
  if (unsub) unsub();
  unsub = store.onChange(() => draw(page));
  draw(page);
}

function draw(page) {
  const d = store.get();
  let list = d.goals.slice().sort((a, b) => (a.targetDate || '9999').localeCompare(b.targetDate || '9999'));
  if (filter === 'andamento') list = list.filter((g) => !g.done);
  if (filter === 'concluidas') list = list.filter((g) => g.done);

  page.innerHTML = `
    <div class="topbar" style="margin-bottom:8px;"><h1 style="font-size:22px;">Metas</h1><button class="mini-btn" id="add" style="margin-left:auto;">${icons.plus} Nova meta</button></div>
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
      ${['andamento', 'concluidas', 'todas'].map((f) => `
        <button class="mini-btn" data-filter="${f}" style="${filter === f ? 'background:var(--accent);color:var(--cream);' : ''}">${f === 'andamento' ? 'Em andamento' : f === 'concluidas' ? 'Concluídas' : 'Todas'}</button>
      `).join('')}
    </div>
    <div class="card"><div class="card-body" style="padding-top:12px;">
      ${list.length ? list.map(goalRowHtml).join('') : `<div class="empty">${icons.target}<div>Nenhuma meta por aqui ainda.</div></div>`}
    </div></div>
  `;

  page.querySelector('#add').addEventListener('click', () => openGoalModal());
  page.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.filter; draw(page); }));
  wireGoalRows(page, d);
}

export function wireGoalRows(scope, d) {
  scope.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openGoalModal(d.goals.find((g) => g.id === b.dataset.edit))));
  scope.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); if (confirm('Excluir esta meta?')) { store.deleteGoal(b.dataset.del); toast('Meta excluída.'); } }));
  scope.querySelectorAll('[data-goal-done]').forEach((b) => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const willBeDone = !b.classList.contains('done');
    store.updateGoal(b.dataset.goalDone, { done: willBeDone });
    if (willBeDone) {
      const g = d.goals.find((x) => x.id === b.dataset.goalDone);
      celebrateToast(`Meta concluída: ${g ? g.title : 'sem título'}. Você chegou lá.`);
    }
  }));
}

function targetLabel(dateISO) {
  if (!dateISO) return '';
  const dt = new Date(dateISO + 'T00:00:00');
  const today = todayISO();
  const diffDays = Math.round((dt - new Date(today + 'T00:00:00')) / 86400000);
  const formatted = dt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  if (diffDays < 0) return `${formatted} (atrasada)`;
  if (diffDays === 0) return `${formatted} (hoje)`;
  return formatted;
}

export function goalRowHtml(g) {
  const color = colorValue(g.color || 'mauve');
  return `
    <div class="item-row" style="align-items:flex-start;">
      <button class="checkbox ${g.done ? 'done' : ''}" data-goal-done="${g.id}" style="${g.done ? `background:${color};border-color:${color};` : `border-color:${color};`}">${icons.check}</button>
      <div style="flex:1;min-width:0;cursor:pointer;" data-edit="${g.id}">
        <div class="item-title ${g.done ? 'done' : ''}">${escapeHtml(g.title)}</div>
        ${g.description ? `<div style="font-size:11.5px;color:var(--ink-soft);opacity:.75;margin-top:2px;">${escapeHtml(g.description)}</div>` : ''}
        <div class="bar-track" style="height:6px;margin-top:7px;"><div class="bar-fill" style="width:${g.progress}%;background:${color};"></div></div>
        <div class="item-meta" style="margin-top:5px;">
          <span class="chip">${g.progress}%</span>
          ${g.targetDate ? `<span class="chip">${icons.clock} ${targetLabel(g.targetDate)}</span>` : ''}
          ${g.categoryId ? categoryChipHtml(g.categoryId) : ''}
          ${g.areaId ? areaChipHtml(g.areaId) : ''}
        </div>
      </div>
      <div class="row-actions">
        <button class="icon-btn sm" data-edit="${g.id}">${icons.edit}</button>
        <button class="icon-btn sm" data-del="${g.id}">${icons.trash}</button>
      </div>
    </div>`;
}

export function openGoalModal(existing, defaultAreaId) {
  const areas = store.get().areas;
  openModal({
    title: existing ? 'Editar meta' : 'Nova meta',
    bodyHtml: `
      <div class="field"><label>Título</label><input class="input" id="f-title" value="${existing ? escapeHtml(existing.title) : ''}" /></div>
      <div class="field"><label>Descrição (opcional)</label><textarea class="input" id="f-desc" rows="2">${existing ? escapeHtml(existing.description || '') : ''}</textarea></div>
      <div class="field"><label>Prazo (opcional)</label><input class="input" type="date" id="f-target" value="${existing?.targetDate || ''}" /></div>
      <div class="field"><label>Progresso: <span id="f-progress-val">${existing?.progress || 0}%</span></label>
        <input type="range" id="f-progress" min="0" max="100" step="5" value="${existing?.progress || 0}" style="width:100%;" />
      </div>
      <div class="field"><label>Categoria (opcional)</label>${categorySelectHtml(existing?.categoryId)}</div>
      <div class="field"><label>Cor</label><div id="f-color-wrap">${colorSwatchesHtml(existing?.color || 'mauve')}</div></div>
      ${areas.length ? `
      <div class="field"><label>Espaço (opcional)</label>
        <select class="input" id="f-area">
          <option value="">Nenhum</option>
          ${areas.map((a) => `<option value="${a.id}" ${(existing?.areaId || defaultAreaId) === a.id ? 'selected' : ''}>${escapeHtml(a.name)}</option>`).join('')}
        </select>
      </div>` : ''}
      <div class="modal-footer">
        <button class="btn ghost" id="cancel">Cancelar</button>
        <button class="btn" id="save">Salvar</button>
      </div>
    `,
    onMount: (body, close) => {
      let color = existing?.color || 'mauve';
      const colorWrap = body.querySelector('#f-color-wrap');
      wireColorSwatches(colorWrap, (c) => { color = c; });
      body.querySelector('#f-category').addEventListener('change', (e) => {
        if (!e.target.value) return;
        color = catOf(e.target.value).color;
        colorWrap.innerHTML = colorSwatchesHtml(color);
        wireColorSwatches(colorWrap, (c) => { color = c; });
      });
      body.querySelector('#f-title').focus();
      body.querySelector('#cancel').addEventListener('click', close);
      body.querySelector('#f-progress').addEventListener('input', (e) => {
        body.querySelector('#f-progress-val').textContent = `${e.target.value}%`;
      });
      body.querySelector('#save').addEventListener('click', () => {
        const title = body.querySelector('#f-title').value.trim();
        if (!title) return;
        const progress = Number(body.querySelector('#f-progress').value) || 0;
        const payload = {
          title,
          description: body.querySelector('#f-desc').value.trim(),
          targetDate: body.querySelector('#f-target').value || null,
          progress,
          done: progress >= 100,
          color,
          categoryId: body.querySelector('#f-category').value || null,
          areaId: body.querySelector('#f-area')?.value || defaultAreaId || null
        };
        const justCompleted = payload.done && !(existing && existing.done);
        if (existing) store.updateGoal(existing.id, payload);
        else store.addGoal(payload);
        if (justCompleted) celebrateToast(`Meta concluída: ${title}. Você chegou lá.`);
        else toast(existing ? 'Meta atualizada.' : 'Meta adicionada.');
        close();
      });
    }
  });
}
