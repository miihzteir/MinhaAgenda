// Paleta de cores compartilhada — usada pra marcar tarefas, hábitos e
// eventos com uma cor à sua escolha (mesmos tons da identidade do app).
export const COLORS = {
  cocoa: { label: 'Marrom', value: 'var(--cocoa-500)' },
  blush: { label: 'Rosa', value: 'var(--blush-500)' },
  sage: { label: 'Verde', value: 'var(--sage-500)' },
  mauve: { label: 'Roxo', value: 'var(--mauve-500)' }
};

export function colorValue(key) {
  return (COLORS[key] || COLORS.cocoa).value;
}

export function colorSwatchesHtml(selectedKey) {
  return `
    <div class="color-select">
      ${Object.entries(COLORS).map(([key, c]) => `
        <button type="button" class="color-swatch" data-color="${key}" style="--sw-color:${c.value}" aria-pressed="${(selectedKey || 'cocoa') === key}" title="${c.label}"></button>
      `).join('')}
    </div>`;
}

// Liga os cliques nos círculos de cor dentro de `scope`. `onChange(key)` é
// chamado a cada seleção; `getCurrent`/os atributos aria-pressed cuidam do
// estado visual.
export function wireColorSwatches(scope, onChange) {
  scope.querySelectorAll('.color-swatch').forEach((b) => b.addEventListener('click', () => {
    onChange(b.dataset.color);
    scope.querySelectorAll('.color-swatch').forEach((x) => x.setAttribute('aria-pressed', x === b));
  }));
}
