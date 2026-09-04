import { store, todayISO } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast } from '../modal.js';
import { openTaskModal } from './tasks.js';
import { openEventModal, nextOccurrence, addDays, occursOn } from './agenda.js';
import { colorValue } from '../colors.js';
import { linkCardHtml, openLinkModal } from './links.js';
import { areaChipHtml } from './areas.js';
import { computeStreak, periodStats } from './habits.js';

let unsub = null;

const GREETINGS = [
  'Vamos cuidar do que importa hoje?',
  'Um passo de cada vez também é progresso.',
  'Seu dia não precisa ser perfeito para ser produtivo.',
  'Hoje, vamos começar pelo essencial.',
  'Vale mais terminar uma coisa do que começar cinco.',
  'Vá com calma — o que não couber hoje, cabe amanhã.'
];
function phraseOfDay() {
  const n = Math.floor(Date.now() / 86400000);
  return GREETINGS[n % GREETINGS.length];
}
function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function renderHome(page) {
  if (unsub) unsub();
  unsub = store.onChange(() => draw(page));
  draw(page);
}

function draw(page) {
  const d = store.get();
  const today = todayISO();
  const name = d.profile.name || 'Você';

  // "Fazer hoje" (plannedDate) é diferente de "vence hoje" (dueDate): uma
  // tarefa entra no dia se foi planejada pra hoje, ou (sem planejamento) se
  // vence hoje, ou (sem nenhuma data) sempre — igual sempre funcionou.
  const todayTasks = d.tasks.filter((t) => {
    if (t.plannedDate) return t.plannedDate === today;
    return !t.dueDate || t.dueDate === today;
  });
  const picked = todayTasks.filter((t) => t.priorityPick && !t.done).slice(0, 3);
  const priorities = picked.length ? picked : todayTasks.filter((t) => t.priority === 'alta' && !t.done).slice(0, 3);
  const others = todayTasks.filter((t) => !priorities.includes(t)).slice(0, 6);
  const doneCount = todayTasks.filter((t) => t.done).length;
  const pendingCount = todayTasks.filter((t) => !t.done).length;
  const habitsToday = d.habits;
  const habitsDone = habitsToday.filter((h) => h.history.includes(today)).length;
  const todaysEvents = d.events
    .filter((e) => occursOn(e, today))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const total = todayTasks.length || 1;
  const pct = Math.round((doneCount / total) * 100);
  const sc = d.prefs.statColors || {};
  const nowCard = nowCardHtml(d, today, todaysEvents);

  // Próximos 7 dias (a partir de amanhã) — tarefas com prazo e eventos, numa
  // lista só, em ordem cronológica.
  const upcomingDates = [...Array(7)].map((_, i) => addDays(today, i + 1));
  const upcomingEvents = upcomingDates.flatMap((dateISO) =>
    d.events.filter((e) => occursOn(e, dateISO)).map((e) => ({ kind: 'event', date: dateISO, time: e.time, title: e.title, id: e.id }))
  );
  const upcomingTasks = d.tasks
    .filter((t) => !t.done && (t.plannedDate || t.dueDate) && upcomingDates.includes(t.plannedDate || t.dueDate))
    .map((t) => ({ kind: 'task', date: t.plannedDate || t.dueDate, time: t.time || '', title: t.title, id: t.id, color: t.color }));
  const upcoming = [...upcomingEvents, ...upcomingTasks]
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    .slice(0, 10);

  page.innerHTML = `
    <div class="greeting-date">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
    <h1 class="greeting-h1">${greetingWord()}, ${escapeHtml(name)}!</h1>
    <div class="greeting-sub">${phraseOfDay()}</div>

    <div class="summary-card">
      <div class="summary-top"><span>Progresso do dia</span><strong style="color:var(--accent-strong)">${pct}%</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="stat-row">
        <div class="stat"><span class="stat-dot" style="background:${colorValue(sc.done)}"></span><div><div class="stat-num">${doneCount}</div><div class="stat-label">concluídas</div></div></div>
        <div class="stat"><span class="stat-dot" style="background:${colorValue(sc.pending)}"></span><div><div class="stat-num">${pendingCount}</div><div class="stat-label">pendentes</div></div></div>
        <div class="stat"><span class="stat-dot" style="background:${colorValue(sc.habits)}"></span><div><div class="stat-num">${habitsDone}/${habitsToday.length}</div><div class="stat-label">hábitos feitos</div></div></div>
        <div class="stat"><span class="stat-dot" style="background:${colorValue(sc.events)}"></span><div><div class="stat-num">${todaysEvents.length}</div><div class="stat-label">eventos hoje</div></div></div>
      </div>
    </div>

    ${nowCard}

    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
      <button class="mini-btn" id="plan-day">${icons.star} Planejar meu dia</button>
      <button class="mini-btn" id="weekly-review">${icons.clock} Revisão semanal</button>
    </div>

    <div class="capture">
      ${icons.pencil}
      <input id="quick-note" placeholder="Anote algo rápido, antes que esqueça…" />
    </div>

    ${d.links.length ? `
    <div class="card">
      <div class="card-head"><span class="card-title">Links rápidos</span><a href="#/links" class="mini-btn" style="text-decoration:none;">${icons.link} Ver todos</a></div>
      <div class="card-body">
        <div class="link-grid">${d.links.slice(0, 6).map(linkCardHtml).join('')}</div>
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-head"><span class="card-title">Hábitos de hoje</span></div>
      <div class="card-body">
        ${habitsToday.length ? habitsToday.map((h) => habitRowHtml(h, today)).join('') : emptyHtml('habits', 'Nenhum hábito cadastrado ainda.')}
      </div>
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">Agenda de hoje</span><button class="mini-btn" id="add-today">${icons.plus} Adicionar</button></div>
      <div class="card-body">
        ${priorities.length ? `
          <div class="priorities-box">
            <div class="priorities-label">${icons.star} Minhas 3 prioridades</div>
            ${priorities.map(taskRowHtml).join('')}
          </div>` : ''}
        ${others.length ? others.map(taskRowHtml).join('') : ''}
        ${!priorities.length && !others.length && !todaysEvents.length ? emptyHtml('tasks', 'Nada por aqui ainda. Adicione sua primeira tarefa ou evento.') : ''}
        ${todaysEvents.length ? `
          <div class="day-section-head" style="margin-top:${priorities.length || others.length ? '14px' : '0'};"><span>Eventos de hoje</span></div>
          ${todaysEvents.map((e) => `
            <div class="item-row">
              <div style="width:44px;flex-shrink:0;font-size:11.5px;color:var(--ink-soft);opacity:.7;padding-top:2px;">${e.time || ''}</div>
              <div><div class="item-title">${escapeHtml(e.title)}</div>${e.location ? `<div class="item-meta"><span class="chip">${escapeHtml(e.location)}</span></div>` : ''}</div>
            </div>`).join('')}
        ` : ''}
      </div>
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">Agenda dos próximos 7 dias</span></div>
      <div class="card-body">
        ${upcoming.length ? upcoming.map(upcomingRowHtml).join('') : emptyHtml('agenda', 'Nada agendado pros próximos 7 dias.')}
      </div>
    </div>
  `;

  page.querySelector('#add-today')?.addEventListener('click', () => openTodayAddMenu(today));
  page.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => store.updateTask(btn.dataset.toggle, { done: !btn.classList.contains('done') }));
  });
  page.querySelectorAll('[data-habit]').forEach((btn) => {
    btn.addEventListener('click', () => store.toggleHabitToday(btn.dataset.habit));
  });
  page.querySelectorAll('[data-habit-progress]').forEach((inp) => {
    inp.addEventListener('change', (e) => store.setHabitProgress(inp.dataset.habitProgress, today, Math.max(0, Number(e.target.value) || 0)));
  });
  page.querySelector('#now-card')?.addEventListener('click', () => { window.location.hash = '#/agenda'; });
  page.querySelector('#plan-day')?.addEventListener('click', () => openPlanDayModal(todayTasks, today));
  page.querySelector('#weekly-review')?.addEventListener('click', () => openWeeklyReview());
  page.querySelectorAll('[data-toggle-upcoming]').forEach((btn) => {
    btn.addEventListener('click', () => store.updateTask(btn.dataset.toggleUpcoming, { done: true }));
  });
  page.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); openLinkModal(d.links.find((l) => l.id === b.dataset.edit)); }));
  page.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); store.deleteLink(b.dataset.del); }));
  const noteInput = page.querySelector('#quick-note');
  noteInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && noteInput.value.trim()) {
      store.addNote({ title: noteInput.value.trim(), text: '' });
      noteInput.value = '';
    }
  });
}

function toMin(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function fmtMin(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
// Bloco "Agora": o que tá rolando (ou livre até quando), e o próximo
// compromisso — tudo numa carta só, sem repetir informação.
function nowCardHtml(d, today, todaysEvents) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const timed = todaysEvents
    .map((e) => ({ ...e, startMin: toMin(e.time), endMin: e.endTime ? toMin(e.endTime) : null }))
    .filter((e) => e.startMin != null)
    .sort((a, b) => a.startMin - b.startMin);

  const current = timed.find((e) => e.endMin != null && e.startMin <= nowMin && nowMin < e.endMin);
  const nextToday = timed.find((e) => e.startMin > nowMin);

  let label = 'Agora';
  let title, sub;

  if (current) {
    title = escapeHtml(current.title);
    sub = `${fmtMin(current.startMin)} – ${fmtMin(current.endMin)}${current.location ? ` · ${escapeHtml(current.location)}` : ''}`;
  } else if (nextToday) {
    title = `Livre até ${fmtMin(nextToday.startMin)}`;
    sub = `Próximo: ${escapeHtml(nextToday.title)} às ${fmtMin(nextToday.startMin)}${nextToday.location ? ` · ${escapeHtml(nextToday.location)}` : ''}`;
  } else {
    const next = nextOccurrence(d.events, addDays(today, 1));
    if (next) {
      const rel = next.daysAway === 0 ? 'amanhã' : formatShort(next.dateISO);
      title = 'Você não tem nenhum compromisso agora.';
      sub = `Próximo: ${escapeHtml(next.event.title)} — ${rel}${next.event.time ? ` às ${next.event.time}` : ''}`;
    } else {
      title = 'Você não tem nenhum compromisso agora.';
      sub = '';
    }
  }

  return `
    <div class="now-card" id="now-card" style="cursor:pointer;">
      <div class="now-label">${label}</div>
      <div class="now-title">${title}</div>
      ${sub ? `<div class="now-sub">${sub}</div>` : ''}
    </div>`;
}

function openPlanDayModal(todayTasks, today) {
  let picks = todayTasks.filter((t) => t.priorityPick && !t.done).map((t) => t.id);
  const times = {};
  todayTasks.forEach((t) => { times[t.id] = t.time || ''; });

  const close = openModal({
    title: 'Planejar meu dia',
    bodyHtml: `
      <p style="font-size:12px;color:var(--ink-soft);opacity:.8;margin:0 0 10px;">Escolha até 3 prioridades e, se quiser, um horário pra cada tarefa de hoje.</p>
      <div id="plan-list" style="display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow-y:auto;">
        ${todayTasks.length ? todayTasks.map((t) => `
          <div class="item-row" data-row="${t.id}">
            <button type="button" class="icon-btn sm" data-pick="${t.id}" title="Marcar como prioridade" style="color:${picks.includes(t.id) ? 'var(--accent-strong)' : 'var(--ink-soft)'};">${icons.star}</button>
            <div class="item-title" style="flex:1;">${escapeHtml(t.title)}</div>
            <input class="input" type="time" data-time="${t.id}" value="${times[t.id]}" style="max-width:110px;padding:6px 8px;font-size:12px;" />
          </div>`).join('') : `<div class="empty">${icons.tasks}<div>Nenhuma tarefa planejada pra hoje ainda.</div></div>`}
      </div>
      <div class="modal-footer">
        <button class="btn ghost" id="cancel">Fechar</button>
        <button class="btn" id="save">Salvar</button>
      </div>
    `,
    onMount: (body) => {
      body.querySelector('#cancel').addEventListener('click', () => close());
      body.querySelectorAll('[data-pick]').forEach((btn) => btn.addEventListener('click', () => {
        const id = btn.dataset.pick;
        if (picks.includes(id)) {
          picks = picks.filter((p) => p !== id);
        } else {
          if (picks.length >= 3) picks.shift();
          picks.push(id);
        }
        body.querySelectorAll('[data-pick]').forEach((b) => {
          b.style.color = picks.includes(b.dataset.pick) ? 'var(--accent-strong)' : 'var(--ink-soft)';
        });
      }));
      body.querySelectorAll('[data-time]').forEach((inp) => inp.addEventListener('input', (e) => {
        times[inp.dataset.time] = e.target.value;
      }));
      body.querySelector('#save').addEventListener('click', () => {
        todayTasks.forEach((t) => {
          store.updateTask(t.id, { priorityPick: picks.includes(t.id), time: times[t.id] || null });
        });
        toast('Dia planejado.');
        close();
      });
    }
  });
}

function openTodayAddMenu(today) {
  const OPTIONS = [
    { label: 'Tarefa', icon: 'tasks', fn: () => openTaskModal(null, today) },
    { label: 'Evento', icon: 'agenda', fn: () => openEventModal(null, today) }
  ];
  const close = openModal({
    title: 'Adicionar',
    bodyHtml: `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
      ${OPTIONS.map((o, i) => `<button class="theme-opt" data-i="${i}" style="padding:16px 8px;">${icons[o.icon]}<span>${o.label}</span></button>`).join('')}
    </div>`,
    onMount: (body) => {
      body.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
        close();
        OPTIONS[Number(b.dataset.i)].fn();
      }));
    }
  });
}

// Revisão semanal: um retrato gentil da semana — o que foi concluído, o que
// ficou pendente (com jeito fácil de reorganizar) e como andaram os hábitos.
// Nada de "você falhou" — só um convite pra reorganizar o que não coube.
function openWeeklyReview() {
  const d = store.get();
  const today = todayISO();
  const weekAgo = addDays(today, -6);

  const completedThisWeek = d.tasks.filter((t) => t.done && t.completedAt && t.completedAt >= new Date(weekAgo + 'T00:00:00').getTime());
  const stale = d.tasks
    .filter((t) => !t.done && (t.plannedDate || t.dueDate) && (t.plannedDate || t.dueDate) < today)
    .sort((a, b) => (a.plannedDate || a.dueDate).localeCompare(b.plannedDate || b.dueDate));
  const inboxCount = d.tasks.filter((t) => !t.done && !t.plannedDate && !t.dueDate && !t.someday).length;
  const nextWeekDates = [...Array(7)].map((_, i) => addDays(today, i + 1));
  const nextWeekEvents = nextWeekDates.reduce((n, dt) => n + d.events.filter((e) => occursOn(e, dt)).length, 0);

  const close = openModal({
    title: 'Revisão semanal',
    bodyHtml: `
      <p style="font-size:12.5px;color:var(--ink-soft);opacity:.8;margin:0 0 12px;">Um retrato gentil dos últimos 7 dias, pra reorganizar o que ainda não coube.</p>

      <div class="day-section-head"><span>Concluídas na semana</span></div>
      <p style="font-size:13px;margin:4px 0 12px;">${completedThisWeek.length ? `Você concluiu <strong>${completedThisWeek.length}</strong> tarefa(s). Bom trabalho.` : 'Nenhuma tarefa concluída ainda essa semana — tudo bem, ainda dá tempo.'}</p>

      <div class="day-section-head"><span>Ficaram pendentes</span></div>
      <div id="stale-list" style="display:flex;flex-direction:column;gap:6px;max-height:32vh;overflow-y:auto;margin:6px 0 12px;">
        ${stale.length ? stale.map((t) => `
          <div class="item-row" data-row="${t.id}">
            <div class="item-title" style="flex:1;">${escapeHtml(t.title)}</div>
            <button type="button" class="icon-btn sm" data-stale-done="${t.id}" title="Concluir">${icons.check}</button>
            <button type="button" class="icon-btn sm" data-stale-tomorrow="${t.id}" title="Adiar para amanhã">${icons.chevronRight}</button>
            <button type="button" class="icon-btn sm" data-stale-someday="${t.id}" title="Mover para algum dia">${icons.sparkle}</button>
          </div>`).join('') : `<p style="font-size:13px;color:var(--ink-soft);opacity:.8;">Esta tarefa ficou pendente? Nenhuma — está tudo em dia.</p>`}
      </div>
      ${inboxCount ? `<p style="font-size:13px;margin:0 0 12px;">Ainda há <strong>${inboxCount}</strong> ${inboxCount === 1 ? 'item' : 'itens'} na caixa de entrada esperando um lugar. Quer organizar?</p>` : ''}

      <div class="day-section-head"><span>Hábitos na semana</span></div>
      <div style="display:flex;flex-direction:column;gap:5px;margin:6px 0 12px;">
        ${d.habits.length ? d.habits.map((h) => {
          const s = periodStats(h, today, 7);
          return `<div style="display:flex;justify-content:space-between;font-size:12.5px;"><span>${escapeHtml(h.name)}</span><span style="color:var(--ink-soft);">${s.done}/${s.applicable} (${s.pct}%)</span></div>`;
        }).join('') : `<p style="font-size:13px;color:var(--ink-soft);opacity:.8;">Nenhum hábito cadastrado ainda.</p>`}
      </div>

      <div class="day-section-head"><span>Semana que vem</span></div>
      <p style="font-size:13px;margin:4px 0 0;">${nextWeekEvents ? `Você tem ${nextWeekEvents} compromisso(s) marcado(s).` : 'Nenhum compromisso marcado ainda — dá pra planejar com calma.'}</p>

      <div class="modal-footer">
        <button class="btn" id="close-review">Fechar</button>
      </div>
    `,
    onMount: (body) => {
      body.querySelector('#close-review').addEventListener('click', () => close());
      body.querySelectorAll('[data-stale-done]').forEach((b) => b.addEventListener('click', () => {
        store.updateTask(b.dataset.staleDone, { done: true });
        b.closest('[data-row]').remove();
      }));
      body.querySelectorAll('[data-stale-tomorrow]').forEach((b) => b.addEventListener('click', () => {
        store.updateTask(b.dataset.staleTomorrow, { plannedDate: addDays(today, 1), dueDate: null });
        b.closest('[data-row]').remove();
      }));
      body.querySelectorAll('[data-stale-someday]').forEach((b) => b.addEventListener('click', () => {
        store.updateTask(b.dataset.staleSomeday, { plannedDate: null, dueDate: null, someday: true });
        b.closest('[data-row]').remove();
      }));
    }
  });
}

function habitRowHtml(h, today) {
  const color = colorValue(h.color);
  const streak = computeStreak(h, today);
  const isYesNo = !h.type || h.type === 'yesno';
  if (isYesNo) {
    const done = h.history.includes(today);
    return `
      <div class="item-row">
        <button class="checkbox ${done ? 'done' : ''}" data-habit="${h.id}" style="${done ? `background:${color};border-color:${color};` : `border-color:${color};`}">${icons.check}</button>
        <div class="item-title">${escapeHtml(h.name)} ${streak ? `<span class="streak-badge">${icons.flame} ${streak}</span>` : ''}</div>
      </div>`;
  }
  const progress = (h.logs || {})[today] || 0;
  const goal = h.goal || 0;
  const pct = goal ? Math.min(100, Math.round((progress / goal) * 100)) : 0;
  return `
    <div class="item-row">
      <span class="area-ic" style="--sw-color:${color};flex-shrink:0;">${icons[h.icon] || icons.flame}</span>
      <div style="flex:1;">
        <div class="item-title">${escapeHtml(h.name)} ${streak ? `<span class="streak-badge">${icons.flame} ${streak}</span>` : ''}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
          <input class="input" type="number" min="0" step="any" data-habit-progress="${h.id}" value="${progress || ''}" placeholder="0" style="max-width:70px;padding:5px 8px;font-size:12px;" />
          <span style="font-size:11px;color:var(--ink-soft);">${h.unit || ''}${goal ? ` / ${goal} ${h.unit || ''} · ${pct}%` : ''}</span>
        </div>
      </div>
    </div>`;
}

function taskRowHtml(t) {
  return `
    <div class="task-row">
      <span class="item-dot" style="--sw-color:${colorValue(t.color)}"></span>
      <button class="checkbox ${t.done ? 'done' : ''}" data-toggle="${t.id}">${icons.check}</button>
      <div style="flex:1;">
        <div class="item-title ${t.done ? 'done' : ''}">${escapeHtml(t.title)}</div>
        <div class="item-meta">
          ${t.time ? `<span class="chip">${t.time}</span>` : ''}
          <span class="chip prio-${t.priority}">${t.priority === 'alta' ? 'Alta' : t.priority === 'baixa' ? 'Baixa' : 'Média'}</span>
          ${t.subtasks && t.subtasks.length ? `<span class="chip">${t.subtasks.filter((s) => s.done).length}/${t.subtasks.length}</span>` : ''}
          ${t.areaId ? areaChipHtml(t.areaId) : ''}
        </div>
      </div>
    </div>`;
}

function upcomingDateLabel(dateISO) {
  const tomorrow = addDays(todayISO(), 1);
  if (dateISO === tomorrow) return 'Amanhã';
  const dt = new Date(dateISO + 'T00:00:00');
  return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function upcomingRowHtml(it) {
  if (it.kind === 'task') {
    return `
      <div class="task-row">
        <span class="item-dot" style="--sw-color:${colorValue(it.color)}"></span>
        <button class="checkbox" data-toggle-upcoming="${it.id}">${icons.check}</button>
        <div style="flex:1;">
          <div class="item-title">${escapeHtml(it.title)}</div>
          <div class="item-meta"><span class="chip">${upcomingDateLabel(it.date)}</span>${it.time ? `<span class="chip">${it.time}</span>` : ''}</div>
        </div>
      </div>`;
  }
  return `
    <div class="item-row">
      <div style="width:78px;flex-shrink:0;font-size:11px;color:var(--ink-soft);opacity:.7;padding-top:2px;">${upcomingDateLabel(it.date)}${it.time ? ` · ${it.time}` : ''}</div>
      <div class="item-title">${escapeHtml(it.title)}</div>
    </div>`;
}

function emptyHtml(icon, text) {
  return `<div class="empty">${icons[icon] || ''}<div>${text}</div></div>`;
}

function formatShort(dateISO) {
  const dt = new Date(dateISO + 'T00:00:00');
  return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
