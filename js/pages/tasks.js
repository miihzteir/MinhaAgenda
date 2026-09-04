import { store } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast } from '../modal.js';
import { escapeHtml } from './home.js';

let unsub = null;
let filter = 'todas';

export function renderTasks(page) {
  if (unsub) unsub();
  unsub = store.onChange(() => draw(page));
  draw(page);
}

function draw(page) {
  const d = store.get();
  let list = d.tasks.slice().sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  if (filter === 'pendentes') list = list.filter((t) => !t.done);
  if (filter === 'concluidas') list = list.filter((t) => t.done);

  page.innerHTML = `
    <div class="topbar" style="margin-bottom:8px;"><h1 style="font-size:22px;">Tarefas</h1><button class="mini-btn" id="add" style="margin-left:auto;">${icons.plus} Nova tarefa</button></div>
    <div style="display:flex;gap:8px;margin-bottom:14px;">
      ${['todas', 'pendentes', 'concluidas'].map((f) => `
        <button class="mini-btn" data-filter="${f}" style="${filter === f ? 'background:var(--accent);color:var(--cream);' : ''}">${f === 'todas' ? 'Todas' : f === 'pendentes' ? 'Pendentes' : 'Concluídas'}</button>
      `).join('')}
    </div>
    <div class="card"><div class="card-body" style="padding-top:12px;">
      ${list.length ? list.map(rowHtml).join('') : `<div class="empty">${icons.tasks}<div>Nenhuma tarefa por aqui.</div></div>`}
    </div></div>
  `;

  page.querySelector('#add').addEventListener('click', () => openTaskModal());
  page.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.filter; draw(page); }));
  page.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => store.updateTask(b.dataset.toggle, { done: !b.classList.contains('done') })));
  page.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openTaskModal(d.tasks.find((t) => t.id === b.dataset.edit))));
  page.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { store.deleteTask(b.dataset.del); toast('Tarefa excluída.'); }));
}

function rowHtml(t) {
  const d = store.get();
  const linkedEvent = t.eventId ? d.events.find((e) => e.id === t.eventId) : null;
  return `
    <div class="task-row">
      <button class="checkbox ${t.done ? 'done' : ''}" data-toggle="${t.id}">${icons.check}</button>
      <div style="flex:1;">
        <div class="item-title ${t.done ? 'done' : ''}">${escapeHtml(t.title)}</div>
        <div class="item-meta">
          ${t.dueDate ? `<span class="chip">${t.dueDate.split('-').reverse().join('/')}</span>` : ''}
          ${t.time ? `<span class="chip">${t.time}</span>` : ''}
          ${t.subject ? `<span class="chip">${escapeHtml(t.subject)}</span>` : ''}
          <span class="chip prio-${t.priority}">${t.priority === 'alta' ? 'Alta' : t.priority === 'baixa' ? 'Baixa' : 'Média'}</span>
          ${linkedEvent ? `<span class="chip">Evento: ${escapeHtml(linkedEvent.title)}</span>` : ''}
        </div>
      </div>
      <div class="row-actions">
        <button class="icon-btn sm" data-edit="${t.id}">${icons.edit}</button>
        <button class="icon-btn sm" data-del="${t.id}">${icons.trash}</button>
      </div>
    </div>`;
}

export function openTaskModal(existing) {
  const events = store.get().events.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  openModal({
    title: existing ? 'Editar tarefa' : 'Nova tarefa',
    bodyHtml: `
      <div class="field"><label>Título</label><input class="input" id="f-title" value="${existing ? escapeHtml(existing.title) : ''}" /></div>
      <div class="field-row">
        <div class="field"><label>Data</label><input class="input" type="date" id="f-date" value="${existing?.dueDate || ''}" /></div>
        <div class="field"><label>Hora</label><input class="input" type="time" id="f-time" value="${existing?.time || ''}" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Prioridade</label>
          <select class="input" id="f-prio">
            <option value="baixa" ${existing?.priority === 'baixa' ? 'selected' : ''}>Baixa</option>
            <option value="media" ${!existing || existing.priority === 'media' ? 'selected' : ''}>Média</option>
            <option value="alta" ${existing?.priority === 'alta' ? 'selected' : ''}>Alta</option>
          </select>
        </div>
        <div class="field"><label>Matéria (opcional)</label><input class="input" id="f-subject" value="${existing ? escapeHtml(existing.subject || '') : ''}" /></div>
      </div>
      ${events.length ? `
      <div class="field"><label>Ligar a um evento (opcional)</label>
        <select class="input" id="f-event">
          <option value="">Nenhum</option>
          ${events.map((e) => `<option value="${e.id}" ${existing?.eventId === e.id ? 'selected' : ''}>${escapeHtml(e.title)}${e.date ? ` — ${e.date.split('-').reverse().join('/')}` : ''}</option>`).join('')}
        </select>
      </div>` : ''}
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
        const payload = {
          title,
          dueDate: body.querySelector('#f-date').value || null,
          time: body.querySelector('#f-time').value || null,
          priority: body.querySelector('#f-prio').value,
          subject: body.querySelector('#f-subject').value.trim() || null,
          eventId: body.querySelector('#f-event')?.value || null
        };
        if (existing) store.updateTask(existing.id, payload);
        else store.addTask(payload);
        toast(existing ? 'Tarefa atualizada.' : 'Tarefa adicionada.');
        close();
      });
    }
  });
}
