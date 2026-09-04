import { store, todayISO } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast } from '../modal.js';
import { escapeHtml } from './home.js';
import { colorValue, colorSwatchesHtml, wireColorSwatches } from '../colors.js';
import { areaChipHtml } from './areas.js';

let unsub = null;
let filter = 'todas';

const DURATION_PRESETS = [15, 30, 45, 60, 120];
function durationLabel(min) {
  if (!min) return '';
  if (min >= 60 && min % 60 === 0) return `${min / 60}h`;
  return `${min} min`;
}

const FILTER_LABELS = {
  todas: 'Todas', inbox: 'Caixa de entrada', hoje: 'Hoje', amanha: 'Amanhã',
  semana: 'Esta semana', 'algum-dia': 'Algum dia', concluidas: 'Concluídas'
};

export function renderTasks(page) {
  if (unsub) unsub();
  unsub = store.onChange(() => draw(page));
  document.addEventListener('click', closeMenusOnOutsideClick);
  draw(page);
}

function closeMenusOnOutsideClick(ev) {
  if (ev.target.closest('.qmenu-wrap')) return;
  document.querySelectorAll('.qmenu').forEach((m) => m.remove());
}

function matchesFilter(t, f, today, tomorrow, weekEnd) {
  if (f === 'todas') return true;
  if (f === 'concluidas') return t.done;
  if (t.done) return false;
  const dt = t.plannedDate || t.dueDate;
  if (f === 'inbox') return !t.plannedDate && !t.dueDate && !t.someday;
  if (f === 'hoje') return dt === today;
  if (f === 'amanha') return dt === tomorrow;
  if (f === 'semana') return !!dt && dt > tomorrow && dt <= weekEnd;
  if (f === 'algum-dia') return !!t.someday;
  return true;
}

function draw(page) {
  const d = store.get();
  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);
  const weekEnd = addDaysISO(today, 7);
  let list = d.tasks.slice().sort((a, b) => (a.plannedDate || a.dueDate || '9999').localeCompare(b.plannedDate || b.dueDate || '9999'));
  list = list.filter((t) => matchesFilter(t, filter, today, tomorrow, weekEnd));

  page.innerHTML = `
    <div class="topbar" style="margin-bottom:8px;"><h1 style="font-size:22px;">Tarefas</h1><button class="mini-btn" id="add" style="margin-left:auto;">${icons.plus} Nova tarefa</button></div>
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
      ${Object.keys(FILTER_LABELS).map((f) => `
        <button class="mini-btn" data-filter="${f}" style="${filter === f ? 'background:var(--accent);color:var(--cream);' : ''}">${FILTER_LABELS[f]}</button>
      `).join('')}
    </div>
    <div class="card"><div class="card-body" style="padding-top:12px;">
      ${list.length ? list.map(rowHtml).join('') : `<div class="empty">${icons.tasks}<div>${filter === 'inbox' ? 'Caixa de entrada vazia. Tudo já tem um lugar.' : 'Nenhuma tarefa por aqui.'}</div></div>`}
    </div></div>
  `;

  page.querySelector('#add').addEventListener('click', () => openTaskModal());
  page.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.filter; draw(page); }));
  page.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => store.updateTask(b.dataset.toggle, { done: !b.classList.contains('done') })));
  page.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openTaskModal(d.tasks.find((t) => t.id === b.dataset.edit))));
  wireQuickMenus(page, d);
}

function wireQuickMenus(scope, d) {
  scope.querySelectorAll('[data-qmenu]').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      document.querySelectorAll('.qmenu').forEach((m) => m.remove());
      const t = d.tasks.find((x) => x.id === btn.dataset.qmenu);
      if (!t) return;
      const menu = document.createElement('div');
      menu.className = 'qmenu';
      menu.innerHTML = `
        <button data-act="duplicate">${icons.copy} Duplicar</button>
        <button data-act="tomorrow">${icons.chevronRight} Adiar para amanhã</button>
        <button data-act="today">${icons.check} Planejar para hoje</button>
        <button data-act="unplan">${icons.x} Remover do dia</button>
        <button data-act="someday">${icons.sparkle} Mover para algum dia</button>
        <button data-act="event">${icons.agenda} Transformar em evento</button>
        <hr />
        <button data-act="delete" class="danger">${icons.trash} Excluir</button>
      `;
      btn.closest('.qmenu-wrap').appendChild(menu);
      menu.querySelector('[data-act="duplicate"]').addEventListener('click', () => { store.duplicateTask(t.id); toast('Tarefa duplicada.'); menu.remove(); });
      menu.querySelector('[data-act="tomorrow"]').addEventListener('click', () => {
        const tomorrow = addDaysISO(todayISO(), 1);
        const patch = { plannedDate: tomorrow };
        if (t.dueDate && t.dueDate <= todayISO()) patch.dueDate = tomorrow;
        store.updateTask(t.id, patch);
        toast('Adiada para amanhã.');
        menu.remove();
      });
      menu.querySelector('[data-act="today"]').addEventListener('click', () => { store.updateTask(t.id, { plannedDate: todayISO() }); toast('Planejada para hoje.'); menu.remove(); });
      menu.querySelector('[data-act="unplan"]').addEventListener('click', () => { store.updateTask(t.id, { plannedDate: null }); toast('Removida do dia.'); menu.remove(); });
      menu.querySelector('[data-act="someday"]').addEventListener('click', () => {
        store.updateTask(t.id, { plannedDate: null, dueDate: null, someday: true });
        toast('Movida para algum dia.');
        menu.remove();
      });
      menu.querySelector('[data-act="event"]').addEventListener('click', () => {
        const date = t.plannedDate || t.dueDate || todayISO();
        store.addEvent({ title: t.title, date, time: t.time || null });
        const newEv = store.get().events[store.get().events.length - 1];
        store.updateTask(t.id, { eventId: newEv.id });
        toast('Virou um evento na agenda.');
        menu.remove();
      });
      menu.querySelector('[data-act="delete"]').addEventListener('click', () => {
        if (confirm('Excluir esta tarefa?')) { store.deleteTask(t.id); toast('Tarefa excluída.'); }
        menu.remove();
      });
    });
  });
}

function addDaysISO(dateISO, n) {
  const dt = new Date(dateISO + 'T00:00:00');
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

function rowHtml(t) {
  const d = store.get();
  const linkedEvent = t.eventId ? d.events.find((e) => e.id === t.eventId) : null;
  const subDone = (t.subtasks || []).filter((s) => s.done).length;
  const subTotal = (t.subtasks || []).length;
  const isDueOnly = t.dueDate && !t.plannedDate;
  return `
    <div class="task-row">
      <span class="item-dot" style="--sw-color:${colorValue(t.color)}"></span>
      <button class="checkbox ${t.done ? 'done' : ''}" data-toggle="${t.id}">${icons.check}</button>
      <div style="flex:1;min-width:0;">
        <div class="item-title ${t.done ? 'done' : ''}">${escapeHtml(t.title)}</div>
        <div class="item-meta">
          ${t.someday && !t.plannedDate && !t.dueDate ? `<span class="chip">${icons.sparkle} Algum dia</span>` : ''}
          ${t.plannedDate ? `<span class="chip">Hoje: ${t.plannedDate.split('-').reverse().join('/')}</span>` : ''}
          ${t.dueDate ? `<span class="chip">${isDueOnly ? '' : 'Prazo: '}${t.dueDate.split('-').reverse().join('/')}</span>` : ''}
          ${t.time ? `<span class="chip">${t.time}</span>` : ''}
          ${t.estimatedDuration ? `<span class="chip">${durationLabel(t.estimatedDuration)}</span>` : ''}
          <span class="chip prio-${t.priority}">${t.priority === 'alta' ? 'Alta' : t.priority === 'baixa' ? 'Baixa' : 'Média'}</span>
          ${t.areaId ? areaChipHtml(t.areaId) : ''}
          ${subTotal ? `<span class="chip">${subDone}/${subTotal} subtarefas</span>` : ''}
          ${linkedEvent ? `<span class="chip">Evento: ${escapeHtml(linkedEvent.title)}</span>` : ''}
        </div>
      </div>
      <div class="row-actions">
        <button class="icon-btn sm" data-edit="${t.id}">${icons.edit}</button>
        <div class="qmenu-wrap"><button class="icon-btn sm" data-qmenu="${t.id}">${icons.moreH}</button></div>
      </div>
    </div>`;
}

export function openTaskModal(existing, defaultDate) {
  const events = store.get().events.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const areas = store.get().areas;
  let subtasks = (existing?.subtasks || []).map((s) => ({ ...s }));

  openModal({
    title: existing ? 'Editar tarefa' : 'Nova tarefa',
    bodyHtml: `
      <div class="field"><label>Título</label><input class="input" id="f-title" value="${existing ? escapeHtml(existing.title) : ''}" /></div>
      <div class="field"><label>Descrição (opcional)</label><textarea class="input" id="f-desc" rows="2">${existing ? escapeHtml(existing.description || '') : ''}</textarea></div>
      <div class="field-row">
        <div class="field"><label>Planejada para</label><input class="input" type="date" id="f-planned" value="${existing?.plannedDate || defaultDate || ''}" /></div>
        <div class="field"><label>Prazo (opcional)</label><input class="input" type="date" id="f-due" value="${existing?.dueDate || ''}" /></div>
      </div>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin:-4px 0 4px;">
        <input type="checkbox" id="f-someday" ${existing?.someday ? 'checked' : ''} style="width:16px;height:16px;" />
        Algum dia (sem data definida ainda)
      </label>
      <div class="field-row">
        <div class="field"><label>Horário (opcional)</label><input class="input" type="time" id="f-time" value="${existing?.time || ''}" /></div>
        <div class="field"><label>Duração estimada</label>
          <div class="chip-select" id="f-duration">
            ${DURATION_PRESETS.map((m) => `<button type="button" class="chip-opt" data-min="${m}" aria-pressed="${existing?.estimatedDuration === m}">${durationLabel(m)}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="field"><label>Prioridade</label>
        <select class="input" id="f-prio">
          <option value="baixa" ${existing?.priority === 'baixa' ? 'selected' : ''}>Baixa</option>
          <option value="media" ${!existing || existing.priority === 'media' ? 'selected' : ''}>Média</option>
          <option value="alta" ${existing?.priority === 'alta' ? 'selected' : ''}>Alta</option>
        </select>
      </div>
      <div class="field"><label>Cor</label>${colorSwatchesHtml(existing?.color)}</div>
      ${areas.length ? `
      <div class="field"><label>Área (opcional)</label>
        <select class="input" id="f-area">
          <option value="">Nenhuma</option>
          ${areas.map((a) => `<option value="${a.id}" ${existing?.areaId === a.id ? 'selected' : ''}>${escapeHtml(a.name)}</option>`).join('')}
        </select>
      </div>` : ''}
      ${events.length ? `
      <div class="field"><label>Ligar a um evento (opcional)</label>
        <select class="input" id="f-event">
          <option value="">Nenhum</option>
          ${events.map((e) => `<option value="${e.id}" ${existing?.eventId === e.id ? 'selected' : ''}>${escapeHtml(e.title)}${e.date ? ` — ${e.date.split('-').reverse().join('/')}` : ''}</option>`).join('')}
        </select>
      </div>` : ''}
      <div class="field">
        <label>Subtarefas (opcional)</label>
        <div class="subtask-list" id="f-subtasks"></div>
        <button type="button" class="mini-btn" id="add-subtask" style="margin-top:6px;">${icons.plus} Adicionar item</button>
      </div>
      <div class="modal-footer">
        <button class="btn ghost" id="cancel">Cancelar</button>
        <button class="btn" id="save">Salvar</button>
      </div>
    `,
    onMount: (body, close) => {
      let color = existing?.color || 'cocoa';
      let duration = existing?.estimatedDuration || null;
      wireColorSwatches(body, (c) => { color = c; });
      body.querySelector('#f-title').focus();
      body.querySelector('#cancel').addEventListener('click', close);

      body.querySelectorAll('#f-duration [data-min]').forEach((b) => b.addEventListener('click', () => {
        const min = Number(b.dataset.min);
        duration = duration === min ? null : min;
        body.querySelectorAll('#f-duration [data-min]').forEach((x) => x.setAttribute('aria-pressed', Number(x.dataset.min) === duration));
      }));

      const subtaskListEl = body.querySelector('#f-subtasks');
      function drawSubtasks() {
        subtaskListEl.innerHTML = subtasks.map((s, i) => `
          <div class="subtask-row" data-i="${i}">
            <button type="button" class="checkbox ${s.done ? 'done' : ''}" data-sub-toggle="${i}">${icons.check}</button>
            <input class="input" data-sub-title="${i}" value="${escapeHtml(s.title)}" placeholder="Item da checklist" style="flex:1;" />
            <button type="button" class="icon-btn sm" data-sub-del="${i}">${icons.trash}</button>
          </div>`).join('');
        subtaskListEl.querySelectorAll('[data-sub-toggle]').forEach((b) => b.addEventListener('click', () => {
          const i = Number(b.dataset.subToggle);
          subtasks[i].done = !subtasks[i].done;
          drawSubtasks();
        }));
        subtaskListEl.querySelectorAll('[data-sub-title]').forEach((inp) => inp.addEventListener('input', (e) => {
          subtasks[Number(inp.dataset.subTitle)].title = e.target.value;
        }));
        subtaskListEl.querySelectorAll('[data-sub-del]').forEach((b) => b.addEventListener('click', () => {
          subtasks.splice(Number(b.dataset.subDel), 1);
          drawSubtasks();
        }));
      }
      drawSubtasks();
      body.querySelector('#add-subtask').addEventListener('click', () => {
        subtasks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: '', done: false });
        drawSubtasks();
        subtaskListEl.querySelector(`[data-sub-title="${subtasks.length - 1}"]`)?.focus();
      });

      body.querySelector('#save').addEventListener('click', () => {
        const title = body.querySelector('#f-title').value.trim();
        if (!title) return;
        const payload = {
          title,
          description: body.querySelector('#f-desc').value.trim(),
          plannedDate: body.querySelector('#f-planned').value || null,
          dueDate: body.querySelector('#f-due').value || null,
          someday: body.querySelector('#f-someday').checked,
          time: body.querySelector('#f-time').value || null,
          estimatedDuration: duration,
          priority: body.querySelector('#f-prio').value,
          color,
          areaId: body.querySelector('#f-area')?.value || null,
          eventId: body.querySelector('#f-event')?.value || null,
          subtasks: subtasks.filter((s) => s.title.trim())
        };
        if (existing) store.updateTask(existing.id, payload);
        else store.addTask(payload);
        toast(existing ? 'Tarefa atualizada.' : 'Tarefa adicionada.');
        close();
      });
    }
  });
}
