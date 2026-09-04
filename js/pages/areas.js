// Áreas da vida — organização/filtro simples pra tarefas, eventos e notas
// (Pessoal, Trabalho, Saúde...). Totalmente personalizável: nome, cor e ícone.
import { store } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast } from '../modal.js';
import { escapeHtml } from './home.js';
import { colorValue, colorSwatchesHtml, wireColorSwatches } from '../colors.js';

const AREA_ICONS = ['star', 'heart', 'book', 'droplet', 'home', 'settings', 'tag', 'layers', 'flame', 'sparkle'];

let unsub = null;

export function renderAreas(page) {
  if (unsub) unsub();
  unsub = store.onChange(() => draw(page));
  draw(page);
}

function draw(page) {
  const d = store.get();
  page.innerHTML = `
    <div class="topbar" style="margin-bottom:8px;"><h1 style="font-size:22px;">Áreas</h1><button class="mini-btn" id="add" style="margin-left:auto;">${icons.plus} Nova área</button></div>
    <p style="font-size:12.5px;color:var(--ink-soft);opacity:.8;margin:0 0 12px;">Use as áreas pra organizar tarefas, eventos e notas por contexto da sua vida.</p>
    <div class="card"><div class="card-body" style="padding-top:12px;">
      ${d.areas.length ? d.areas.map(rowHtml).join('') : `<div class="empty">${icons.tag}<div>Nenhuma área ainda. Crie, por exemplo, Pessoal, Trabalho ou Saúde.</div></div>`}
    </div></div>
  `;

  page.querySelector('#add').addEventListener('click', () => openAreaModal());
  page.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openAreaModal(d.areas.find((a) => a.id === b.dataset.edit))));
  page.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
    const inUse = d.tasks.some((t) => t.areaId === b.dataset.del) || d.events.some((e) => e.areaId === b.dataset.del) || d.notes.some((n) => n.areaId === b.dataset.del);
    if (confirm(inUse ? 'Essa área está em uso. Excluir mesmo assim? Os itens ficam sem área.' : 'Excluir essa área?')) {
      store.deleteArea(b.dataset.del);
      toast('Área excluída.');
    }
  }));
}

function rowHtml(a) {
  const color = colorValue(a.color);
  return `
    <div class="item-row">
      <span class="area-ic" style="--sw-color:${color};">${icons[a.icon] || icons.star}</span>
      <div class="item-title" style="flex:1;">${escapeHtml(a.name)}</div>
      <div class="row-actions">
        <button class="icon-btn sm" data-edit="${a.id}">${icons.edit}</button>
        <button class="icon-btn sm" data-del="${a.id}">${icons.trash}</button>
      </div>
    </div>`;
}

export function openAreaModal(existing) {
  openModal({
    title: existing ? 'Editar área' : 'Nova área',
    bodyHtml: `
      <div class="field"><label>Nome</label><input class="input" id="f-name" placeholder="Ex.: Trabalho" value="${existing ? escapeHtml(existing.name) : ''}" /></div>
      <div class="field"><label>Cor</label>${colorSwatchesHtml(existing?.color || 'cocoa')}</div>
      <div class="field"><label>Ícone</label>
        <div class="icon-select" id="f-icon">
          ${AREA_ICONS.map((ic) => `<button type="button" class="icon-opt" data-icon="${ic}" aria-pressed="${(existing?.icon || 'star') === ic}">${icons[ic]}</button>`).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn ghost" id="cancel">Cancelar</button>
        <button class="btn" id="save">Salvar</button>
      </div>
    `,
    onMount: (body, close) => {
      let color = existing?.color || 'cocoa';
      let icon = existing?.icon || 'star';
      wireColorSwatches(body, (c) => { color = c; });
      body.querySelectorAll('[data-icon]').forEach((b) => b.addEventListener('click', () => {
        icon = b.dataset.icon;
        body.querySelectorAll('[data-icon]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.icon === icon));
      }));
      body.querySelector('#f-name').focus();
      body.querySelector('#cancel').addEventListener('click', close);
      body.querySelector('#save').addEventListener('click', () => {
        const name = body.querySelector('#f-name').value.trim();
        if (!name) return;
        if (existing) store.updateArea(existing.id, { name, color, icon });
        else store.addArea({ name, color, icon });
        toast(existing ? 'Área atualizada.' : 'Área criada.');
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
