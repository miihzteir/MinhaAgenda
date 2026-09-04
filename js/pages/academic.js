import { store } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast } from '../modal.js';
import { escapeHtml } from './home.js';

let unsub = null;

export function renderAcademic(page) {
  if (unsub) unsub();
  unsub = store.onChange(() => draw(page));
  draw(page);
}

function draw(page) {
  const d = store.get();
  page.innerHTML = `
    <div class="topbar" style="margin-bottom:8px;"><h1 style="font-size:22px;">Faculdade</h1><button class="mini-btn" id="add" style="margin-left:auto;">${icons.plus} Nova matéria</button></div>
    <div class="card"><div class="card-body" style="padding-top:12px;">
      ${d.subjects.length ? d.subjects.map(rowHtml).join('') : `<div class="empty">${icons.academic}<div>Cadastre suas matérias e professores aqui.</div></div>`}
    </div></div>
  `;
  page.querySelector('#add').addEventListener('click', () => openSubjectModal());
  page.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { store.deleteSubject(b.dataset.del); toast('Matéria excluída.'); }));
}

function rowHtml(s) {
  return `
    <div class="item-row">
      <span style="color:var(--accent-strong);">${icons.book}</span>
      <div style="flex:1;">
        <div class="item-title">${escapeHtml(s.name)}</div>
        <div class="item-meta">
          ${s.professor ? `<span class="chip">${escapeHtml(s.professor)}</span>` : ''}
          ${s.schedule ? `<span class="chip">${escapeHtml(s.schedule)}</span>` : ''}
        </div>
      </div>
      <div class="row-actions"><button class="icon-btn sm" data-del="${s.id}">${icons.trash}</button></div>
    </div>`;
}

export function openSubjectModal() {
  openModal({
    title: 'Nova matéria',
    bodyHtml: `
      <div class="field"><label>Nome da matéria</label><input class="input" id="f-name" /></div>
      <div class="field"><label>Professor (opcional)</label><input class="input" id="f-prof" /></div>
      <div class="field"><label>Horário (opcional)</label><input class="input" id="f-sched" placeholder="Ex.: Seg e Qua, 19h-21h" /></div>
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
        store.addSubject({ name, professor: body.querySelector('#f-prof').value.trim(), schedule: body.querySelector('#f-sched').value.trim() });
        toast('Matéria adicionada.');
        close();
      });
    }
  });
}
