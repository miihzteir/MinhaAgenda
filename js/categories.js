// Categorias compartilhadas — usadas por eventos, tarefas, hábitos e metas.
// Cada categoria tem uma cor padrão (ver Ajustes); ao escolher uma categoria
// num item, ele herda essa cor automaticamente, mas a cor continua podendo
// ser trocada individualmente depois — igual calendários do Google.
import { store } from './store.js';
import { colorValue } from './colors.js';
import { icons } from './icons.js';

function esc(s) {
  const el = document.createElement('div');
  el.textContent = s || '';
  return el.innerHTML;
}

export function getCategories() {
  return store.get().categories;
}

export function catOf(catId) {
  const cats = getCategories();
  return cats.find((c) => c.id === catId) || cats[0];
}

export function catColor(catId) {
  return colorValue(catOf(catId).color);
}

// Cada categoria mostra um emoji personalizado (se a pessoa escolheu um) ou
// um dos ícones prontos — nunca os dois juntos.
export function categoryIconHtml(c) {
  if (c.emoji) return `<span class="cat-emoji" aria-hidden="true">${esc(c.emoji)}</span>`;
  return icons[c.icon] || icons.tag;
}

export function categoryChipHtml(catId) {
  if (!catId) return '';
  const cats = getCategories();
  const c = cats.find((x) => x.id === catId);
  if (!c) return '';
  return `<span class="chip area-chip" style="--sw-color:${colorValue(c.color)};">${categoryIconHtml(c)}${esc(c.name)}</span>`;
}

export function categorySelectHtml(selectedId, id = 'f-category') {
  const cats = getCategories();
  return `
    <select class="input" id="${id}">
      <option value="">Sem categoria</option>
      ${cats.map((c) => `<option value="${c.id}" ${selectedId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
    </select>`;
}
