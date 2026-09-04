import { store, todayISO } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast } from '../modal.js';
import { escapeHtml } from './home.js';
import { colorValue, colorSwatchesHtml, wireColorSwatches } from '../colors.js';

let unsub = null;

const HABIT_ICONS = ['flame', 'droplet', 'book', 'heart', 'star', 'sparkle', 'home', 'tag'];
const DOW_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const TYPE_LABELS = { yesno: 'Sim ou não', quantity: 'Quantidade', duration: 'Duração', count: 'Contagem' };
const FREQ_LABELS = {
  daily: 'Todo dia', weekdays: 'Dias úteis', weekends: 'Fim de semana',
  days: 'Dias específicos', timesPerWeek: 'X vezes por semana', timesPerMonth: 'X vezes por mês', custom: 'Personalizado'
};

function addDaysISO(dateISO, n) {
  const dt = new Date(dateISO + 'T00:00:00');
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

// A frequência configurada decide se um hábito "vale" num certo dia — usado
// pra não contar dias fora da frequência como falha na sequência.
export function habitAppliesOn(h, dateISO) {
  const f = h.frequency || { kind: 'daily' };
  const dow = new Date(dateISO + 'T00:00:00').getDay();
  switch (f.kind) {
    case 'weekdays': return dow >= 1 && dow <= 5;
    case 'weekends': return dow === 0 || dow === 6;
    case 'days': return (f.days || []).includes(dow);
    case 'custom': {
      const n = Math.max(1, Number(f.interval) || 1);
      const unit = f.unit || 'days';
      const anchor = new Date((h.createdAt ? new Date(h.createdAt).toISOString().slice(0, 10) : dateISO) + 'T00:00:00');
      const b = new Date(dateISO + 'T00:00:00');
      const diffDays = Math.round((b - anchor) / 86400000);
      if (unit === 'weeks') return diffDays >= 0 && diffDays % (n * 7) === 0;
      if (unit === 'months') {
        const monthsDiff = (b.getFullYear() - anchor.getFullYear()) * 12 + (b.getMonth() - anchor.getMonth());
        return monthsDiff >= 0 && b.getDate() === anchor.getDate() && monthsDiff % n === 0;
      }
      return diffDays >= 0 && diffDays % n === 0;
    }
    // timesPerWeek/timesPerMonth: sem dia fixo, pode ser feito em qualquer dia.
    case 'timesPerWeek':
    case 'timesPerMonth':
    default:
      return true;
  }
}

// Sequência real: anda pra trás a partir de hoje, pulando dias em que o
// hábito nem se aplicava (pela frequência), e para no primeiro dia que
// aplicava e não foi feito.
export function computeStreak(h, today) {
  let streak = 0;
  let date = today;
  for (let i = 0; i < 400; i++) {
    const applies = habitAppliesOn(h, date);
    if (applies) {
      const done = h.history.includes(date);
      if (!done) {
        if (date === today) { /* hoje ainda não acabou, não quebra a sequência */ }
        else break;
      } else {
        streak++;
      }
    }
    date = addDaysISO(date, -1);
  }
  return streak;
}

export function periodStats(h, today, days) {
  let applicable = 0;
  let done = 0;
  let date = today;
  for (let i = 0; i < days; i++) {
    if (habitAppliesOn(h, date)) {
      applicable++;
      if (h.history.includes(date)) done++;
    }
    date = addDaysISO(date, -1);
  }
  return { done, applicable, pct: applicable ? Math.round((done / applicable) * 100) : 0 };
}

export function renderHabits(page) {
  if (unsub) unsub();
  unsub = store.onChange(() => draw(page));
  draw(page);
}

function draw(page) {
  const d = store.get();
  const today = todayISO();

  page.innerHTML = `
    <div class="topbar" style="margin-bottom:8px;"><h1 style="font-size:22px;">Hábitos</h1><button class="mini-btn" id="add" style="margin-left:auto;">${icons.plus} Novo hábito</button></div>
    <div class="card"><div class="card-body" style="padding-top:12px;">
      ${d.habits.length ? d.habits.map((h) => rowHtml(h, today)).join('') : `<div class="empty">${icons.habits}<div>Nenhum hábito ainda. Comece com algo pequeno.</div></div>`}
    </div></div>
  `;

  page.querySelector('#add').addEventListener('click', () => openHabitModal());
  page.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => store.toggleHabitToday(b.dataset.toggle)));
  page.querySelectorAll('[data-progress]').forEach((inp) => inp.addEventListener('change', (e) => {
    store.setHabitProgress(inp.dataset.progress, today, Math.max(0, Number(e.target.value) || 0));
  }));
  page.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openHabitModal(d.habits.find((h) => h.id === b.dataset.edit))));
  page.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { store.deleteHabit(b.dataset.del); toast('Hábito excluído.'); }));
  page.querySelectorAll('[data-stats]').forEach((b) => b.addEventListener('click', () => {
    const box = b.closest('.item-row').querySelector('.habit-stats');
    if (box) box.hidden = !box.hidden;
  }));
}

function rowHtml(h, today) {
  const color = colorValue(h.color);
  const done = h.history.includes(today);
  const streak = computeStreak(h, today);
  const week = periodStats(h, today, 7);
  const month = periodStats(h, today, 30);
  const last7 = [...Array(7)].map((_, i) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - (6 - i));
    const iso = dt.toISOString().slice(0, 10);
    return { iso, on: h.history.includes(iso), applies: habitAppliesOn(h, iso) };
  });

  const isYesNo = !h.type || h.type === 'yesno';
  const progress = (h.logs || {})[today] || 0;
  const goal = h.goal || 0;
  const pct = goal ? Math.min(100, Math.round((progress / goal) * 100)) : 0;

  return `
    <div class="item-row" style="align-items:flex-start;">
      <span class="area-ic" style="--sw-color:${color};flex-shrink:0;">${icons[h.icon] || icons.flame}</span>
      <div style="flex:1;min-width:0;">
        <div class="item-title">${escapeHtml(h.name)} ${streak ? `<span class="streak-badge">${icons.flame} ${streak}</span>` : ''}</div>
        ${h.description ? `<div style="font-size:11.5px;color:var(--ink-soft);opacity:.75;margin-top:2px;">${escapeHtml(h.description)}</div>` : ''}
        ${isYesNo ? `
          <div style="display:flex;gap:3px;margin-top:8px;">
            ${last7.map((x) => `<span style="width:16px;height:16px;border-radius:5px;background:${x.on ? color : x.applies ? 'var(--cocoa-50)' : 'transparent'};display:inline-block;${!x.applies ? `box-shadow:inset 0 0 0 1px var(--border);` : ''}"></span>`).join('')}
          </div>
        ` : `
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
            <input class="input" type="number" min="0" step="any" data-progress="${h.id}" value="${progress || ''}" placeholder="0" style="max-width:80px;padding:6px 8px;font-size:12.5px;" />
            <span style="font-size:11.5px;color:var(--ink-soft);">${h.unit || ''} ${goal ? `/ ${goal} ${h.unit || ''} · ${pct}%` : ''}</span>
          </div>
          ${goal ? `<div class="bar-track" style="height:6px;margin-top:6px;"><div class="bar-fill" style="width:${pct}%;background:${color};"></div></div>` : ''}
        `}
        <button type="button" class="mini-btn" data-stats style="margin-top:8px;padding:4px 9px;font-size:10.5px;">${icons.clock} Histórico</button>
        <div class="habit-stats" hidden style="margin-top:6px;font-size:11.5px;color:var(--ink-soft);display:flex;gap:14px;">
          <span>Semana: ${week.done}/${week.applicable} (${week.pct}%)</span>
          <span>Mês: ${month.done}/${month.applicable} (${month.pct}%)</span>
          <span>${FREQ_LABELS[(h.frequency || {}).kind || 'daily']}</span>
        </div>
      </div>
      ${isYesNo ? `<button class="checkbox ${done ? 'done' : ''}" data-toggle="${h.id}" style="${done ? `background:${color};border-color:${color};` : `border-color:${color};`}">${icons.check}</button>` : ''}
      <div class="row-actions">
        <button class="icon-btn sm" data-edit="${h.id}">${icons.edit}</button>
        <button class="icon-btn sm" data-del="${h.id}">${icons.trash}</button>
      </div>
    </div>`;
}

export function openHabitModal(existing) {
  openModal({
    title: existing ? 'Editar hábito' : 'Novo hábito',
    bodyHtml: `
      <div class="field"><label>Nome</label><input class="input" id="f-name" placeholder="Ex.: Beber água" value="${existing ? escapeHtml(existing.name) : ''}" /></div>
      <div class="field"><label>Descrição (opcional)</label><input class="input" id="f-desc" value="${existing ? escapeHtml(existing.description || '') : ''}" /></div>
      <div class="field"><label>Cor</label>${colorSwatchesHtml(existing?.color || 'sage')}</div>
      <div class="field"><label>Ícone</label>
        <div class="icon-select" id="f-icon">
          ${HABIT_ICONS.map((ic) => `<button type="button" class="icon-opt" data-icon="${ic}" aria-pressed="${(existing?.icon || 'flame') === ic}">${icons[ic]}</button>`).join('')}
        </div>
      </div>
      <div class="field"><label>Tipo</label>
        <select class="input" id="f-type">
          ${Object.entries(TYPE_LABELS).map(([k, l]) => `<option value="${k}" ${(existing?.type || 'yesno') === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="field-row" id="f-goal-row" ${(!existing || !existing.type || existing.type === 'yesno') ? 'hidden' : ''}>
        <div class="field"><label>Meta</label><input class="input" type="number" min="0" step="any" id="f-goal" value="${existing?.goal || ''}" /></div>
        <div class="field"><label>Unidade</label><input class="input" id="f-unit" placeholder="Ex.: L, min, páginas" value="${existing ? escapeHtml(existing.unit || '') : ''}" /></div>
      </div>
      <div class="field"><label>Frequência</label>
        <select class="input" id="f-freq">
          ${Object.entries(FREQ_LABELS).map(([k, l]) => `<option value="${k}" ${((existing?.frequency || {}).kind || 'daily') === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="field" id="f-days-row" ${((existing?.frequency || {}).kind !== 'days') ? 'hidden' : ''}>
        <label>Dias da semana</label>
        <div class="chip-select">
          ${DOW_LETTERS.map((l, i) => `<button type="button" class="chip-opt" data-dow="${i}" aria-pressed="${((existing?.frequency || {}).days || []).includes(i)}">${l}</button>`).join('')}
        </div>
      </div>
      <div class="field-row" id="f-custom-row" ${((existing?.frequency || {}).kind !== 'custom') ? 'hidden' : ''}>
        <div class="field"><label>A cada</label><input class="input" type="number" min="1" id="f-freq-n" value="${(existing?.frequency || {}).interval || 1}" /></div>
        <div class="field"><label>&nbsp;</label>
          <select class="input" id="f-freq-unit">
            <option value="days" ${(existing?.frequency || {}).unit === 'days' ? 'selected' : ''}>dias</option>
            <option value="weeks" ${!existing || !(existing.frequency || {}).unit || (existing.frequency || {}).unit === 'weeks' ? 'selected' : ''}>semanas</option>
            <option value="months" ${(existing?.frequency || {}).unit === 'months' ? 'selected' : ''}>meses</option>
          </select>
        </div>
      </div>
      <div class="field"><label>Horário preferencial (opcional)</label><input class="input" type="time" id="f-time" value="${existing?.preferredTime || ''}" /></div>
      <div class="modal-footer">
        <button class="btn ghost" id="cancel">Cancelar</button>
        <button class="btn" id="save">Salvar</button>
      </div>
    `,
    onMount: (body, close) => {
      let color = existing?.color || 'sage';
      let icon = existing?.icon || 'flame';
      let days = (existing?.frequency || {}).days || [];
      wireColorSwatches(body, (c) => { color = c; });
      body.querySelectorAll('[data-icon]').forEach((b) => b.addEventListener('click', () => {
        icon = b.dataset.icon;
        body.querySelectorAll('[data-icon]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.icon === icon));
      }));
      body.querySelector('#f-name').focus();
      body.querySelector('#cancel').addEventListener('click', () => close());

      body.querySelector('#f-type').addEventListener('change', (e) => {
        body.querySelector('#f-goal-row').hidden = e.target.value === 'yesno';
      });
      body.querySelector('#f-freq').addEventListener('change', (e) => {
        body.querySelector('#f-days-row').hidden = e.target.value !== 'days';
        body.querySelector('#f-custom-row').hidden = e.target.value !== 'custom';
      });
      body.querySelectorAll('[data-dow]').forEach((b) => b.addEventListener('click', () => {
        const i = Number(b.dataset.dow);
        days = days.includes(i) ? days.filter((x) => x !== i) : [...days, i];
        b.setAttribute('aria-pressed', days.includes(i));
      }));

      body.querySelector('#save').addEventListener('click', () => {
        const name = body.querySelector('#f-name').value.trim();
        if (!name) return;
        const type = body.querySelector('#f-type').value;
        const freqKind = body.querySelector('#f-freq').value;
        const frequency = { kind: freqKind };
        if (freqKind === 'days') frequency.days = days;
        if (freqKind === 'custom') {
          frequency.interval = Math.max(1, Number(body.querySelector('#f-freq-n').value) || 1);
          frequency.unit = body.querySelector('#f-freq-unit').value;
        }
        const payload = {
          name,
          description: body.querySelector('#f-desc').value.trim(),
          color, icon, type,
          goal: type === 'yesno' ? null : (Number(body.querySelector('#f-goal').value) || null),
          unit: type === 'yesno' ? '' : body.querySelector('#f-unit').value.trim(),
          frequency,
          preferredTime: body.querySelector('#f-time').value || null
        };
        if (existing) store.updateHabit(existing.id, payload);
        else store.addHabit(payload);
        toast(existing ? 'Hábito atualizado.' : 'Hábito adicionado.');
        close();
      });
    }
  });
}
