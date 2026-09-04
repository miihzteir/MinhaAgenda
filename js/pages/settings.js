import { store } from '../store.js';
import { icons } from '../icons.js';
import { toast } from '../modal.js';

let unsub = null;
let deferredPrompt = null;
let installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.dispatchEvent(new Event('install-available'));
});
window.addEventListener('appinstalled', () => {
  installed = true;
  deferredPrompt = null;
  document.dispatchEvent(new Event('install-available'));
});

export function renderSettings(page) {
  if (unsub) unsub();
  unsub = store.onChange(() => draw(page));
  document.addEventListener('install-available', () => draw(page));
  draw(page);
}

function draw(page) {
  const d = store.get();
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  page.innerHTML = `
    <h1 style="font-size:22px;margin-bottom:16px;">Configurações</h1>

    <div class="card">
      <div class="card-head"><span class="card-title">Perfil</span><span class="card-sub">Como a Minha Agenda te chama</span></div>
      <div class="card-body">
        <div class="field"><label>Nome</label><input class="input" id="f-name" value="${escAttr(d.profile.name)}" /></div>
        <div class="field"><label>Curso</label><input class="input" id="f-course" value="${escAttr(d.profile.course)}" /></div>
        <button class="btn" id="save-profile">Salvar perfil</button>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">Instalar app</span><span class="card-sub">Como um aplicativo, fora do navegador</span></div>
      <div class="card-body">
        ${installed ? `
          <div class="callout sage">${icons.check}<div>Já instalado — você está usando a Minha Agenda como aplicativo.</div></div>
        ` : deferredPrompt ? `
          <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;">Instale na tela inicial: abre em janela própria, funciona offline e sincroniza sozinha.</p>
          <button class="btn" id="install">${icons.download} Instalar app</button>
        ` : isIos ? `
          <div class="callout">${icons.heart}<div>No Safari, toque em compartilhar e depois em "Adicionar à Tela de Início".</div></div>
        ` : `
          <div class="callout">${icons.download}<div>Procure o ícone de instalação na barra de endereço, ou "Instalar app" no menu do navegador (⋮).</div></div>
        `}
      </div>
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">Aparência</span></div>
      <div class="card-body">
        <div class="field"><label>Tema</label>
          <div style="display:flex;gap:8px;">
            ${themeBtn('light', icons.sun, 'Claro', d.prefs.theme)}
            ${themeBtn('dark', icons.moon, 'Escuro', d.prefs.theme)}
            ${themeBtn('auto', icons.laptop, 'Automático', d.prefs.theme)}
          </div>
        </div>
        <div class="field"><label>Cor de destaque</label>
          <div style="display:flex;gap:9px;">
            ${['cocoa', 'blush', 'sage', 'mauve'].map((c) => `<button class="accent-swatch ${d.prefs.accent === c ? 'selected' : ''}" data-accent="${c}" style="background:${{ cocoa: '#a9785f', blush: '#cf8f7d', sage: '#8ba37c', mauve: '#a68fa6' }[c]}"></button>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">Backup</span></div>
      <div class="card-body" style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn ghost" id="export">${icons.download} Exportar backup</button>
        <label class="btn ghost" style="cursor:pointer;">${icons.download} Importar backup<input type="file" id="import" accept=".json" style="display:none;" /></label>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">Privacidade</span></div>
      <div class="card-body" style="font-size:12.5px;color:var(--ink-soft);">
        <p style="margin:0 0 6px;">Seus dados ficam só neste navegador, neste aparelho. Sem login, sem servidor, sem rastreamento.</p>
        <button class="btn danger" id="wipe" style="margin-top:6px;">${icons.trash} Excluir todos os dados</button>
      </div>
    </div>
  `;

  page.querySelector('#save-profile').addEventListener('click', () => {
    store.updateProfile({ name: page.querySelector('#f-name').value.trim() || 'Você', course: page.querySelector('#f-course').value.trim() });
    toast('Perfil atualizado.');
  });
  page.querySelector('#install')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') toast('Instalando a Minha Agenda...');
    deferredPrompt = null;
    draw(page);
  });
  page.querySelectorAll('[data-theme-opt]').forEach((b) => b.addEventListener('click', () => store.updatePrefs({ theme: b.dataset.themeOpt })));
  page.querySelectorAll('[data-accent]').forEach((b) => b.addEventListener('click', () => store.updatePrefs({ accent: b.dataset.accent })));
  page.querySelector('#export').addEventListener('click', () => {
    const blob = new Blob([store.exportBackup()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `minha-agenda-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  });
  page.querySelector('#import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        store.importBackup(reader.result);
        toast('Backup importado.');
      } catch {
        toast('Não foi possível ler este arquivo.');
      }
    };
    reader.readAsText(file);
  });
  page.querySelector('#wipe').addEventListener('click', () => {
    if (confirm('Excluir todos os seus dados? Não é possível desfazer.')) {
      store.wipeAll();
      toast('Todos os dados foram excluídos.');
    }
  });
}

function themeBtn(value, icon, label, current) {
  return `<button class="theme-opt" data-theme-opt="${value}" aria-pressed="${current === value}">${icon}${label}</button>`;
}
function escAttr(str) {
  return (str ?? '').replace(/"/g, '&quot;');
}
