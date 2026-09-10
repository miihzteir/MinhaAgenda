// Paleta de cores compartilhada — usada pra marcar tarefas, hábitos, notas e
// os indicadores da tela inicial. Além dos tons prontos da identidade do
// app, tem um seletor de cor livre: qualquer cor, sem limite.
export const COLORS = {
  cocoa: { label: 'Marrom', value: '#a9785f' },
  blush: { label: 'Rosa', value: '#cf8f7d' },
  sage: { label: 'Verde', value: '#8ba37c' },
  mauve: { label: 'Roxo', value: '#a68fa6' }
};

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

// Aceita tanto uma chave da paleta (cocoa/blush/sage/mauve, dados antigos)
// quanto uma cor livre em hex escolhida no seletor.
export function colorValue(key) {
  if (key && COLORS[key]) return COLORS[key].value;
  if (key && HEX_RE.test(key)) return key;
  return COLORS.cocoa.value;
}

function isPresetKey(key) {
  return Boolean(key && COLORS[key]);
}

export function colorSwatchesHtml(selected) {
  const preset = isPresetKey(selected);
  const customHex = !preset && selected && HEX_RE.test(selected) ? selected : colorValue(selected);
  return `
    <div class="color-select">
      ${Object.entries(COLORS).map(([key, c]) => `
        <button type="button" class="color-swatch" data-color="${key}" style="--sw-color:${c.value}" aria-pressed="${preset && selected === key}" title="${c.label}"></button>
      `).join('')}
      <label class="color-swatch color-swatch-custom" style="--sw-color:${customHex};" title="Qualquer cor" aria-pressed="${!preset}">
        <input type="color" class="color-custom-input" value="${customHex}" />
      </label>
    </div>`;
}

// Liga os cliques nos círculos de cor dentro de `scope`. `onChange(key)` é
// chamado a cada seleção, tanto pros tons prontos (chave) quanto pra cor
// livre (hex) — os atributos aria-pressed cuidam do estado visual.
export function wireColorSwatches(scope, onChange) {
  const presetBtns = () => scope.querySelectorAll('.color-swatch[data-color]');
  const customLabel = scope.querySelector('.color-swatch-custom');
  const customInput = scope.querySelector('.color-custom-input');

  presetBtns().forEach((b) => b.addEventListener('click', () => {
    onChange(b.dataset.color);
    presetBtns().forEach((x) => x.setAttribute('aria-pressed', x === b));
    customLabel?.setAttribute('aria-pressed', 'false');
  }));

  customInput?.addEventListener('input', () => {
    const hex = customInput.value;
    customLabel.style.setProperty('--sw-color', hex);
    onChange(hex);
    presetBtns().forEach((x) => x.setAttribute('aria-pressed', 'false'));
    customLabel.setAttribute('aria-pressed', 'true');
  });
}
