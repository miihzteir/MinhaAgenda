import { store } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast } from '../modal.js';
import { authState, signInWithGoogle, signOutUser } from '../firebase.js';
import { colorValue, colorSwatchesHtml, wireColorSwatches } from '../colors.js';
import { escapeHtml } from './home.js';

const CATEGORY_ICONS = ['book', 'layers', 'heart', 'tag', 'star', 'sparkle', 'droplet', 'home'];

const STAT_COLOR_FIELDS = [
  { key: 'done', label: 'Concluídas' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'habits', label: 'Hábitos feitos' },
  { key: 'events', label: 'Eventos hoje' }
];

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
  document.addEventListener('auth-changed', () => draw(page));
  draw(page);
}

function draw(page) {
  const d = store.get();
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  page.innerHTML = `
    <h1 style="font-size:22px;margin-bottom:16px;">Configurações</h1>

    <div class="card">
      <div class="card-head"><span class="card-title">Conta</span><span class="card-sub">${accountSubtitle()}</span></div>
      <div class="card-body">${accountBodyHtml(d)}</div>
    </div>

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
        <div class="field"><label>Cores do resumo (tela inicial)</label>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${STAT_COLOR_FIELDS.map((f) => `
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:12.5px;color:var(--ink-soft);width:110px;flex-shrink:0;">${f.label}</span>
                ${colorSwatchesHtml((d.prefs.statColors || {})[f.key]).replace('class="color-select"', `class="color-select" data-stat-field="${f.key}"`)}
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">Categorias de eventos</span><button class="mini-btn" id="add-cat">${icons.plus} Nova</button></div>
      <div class="card-body">
        ${d.categories.map((c) => `
          <div class="item-row">
            <span class="area-ic" style="--sw-color:${colorValue(c.color)};">${icons[c.icon] || icons.tag}</span>
            <div class="item-title" style="flex:1;">${escapeHtml(c.name)}</div>
            <div class="row-actions">
              <button class="icon-btn sm" data-cat-edit="${c.id}">${icons.edit}</button>
              ${d.categories.length > 1 ? `<button class="icon-btn sm" data-cat-del="${c.id}">${icons.trash}</button>` : ''}
            </div>
          </div>`).join('')}
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
        <p style="margin:0 0 6px;">${authState.user ? 'Seus dados ficam na sua conta, e sincronizados neste e em outros aparelhos.' : 'Seus dados ficam só neste navegador, neste aparelho.'} Sem rastreamento, sem publicidade.</p>
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
  page.querySelectorAll('[data-stat-field]').forEach((scope) => {
    const field = scope.dataset.statField;
    wireColorSwatches(scope, (color) => {
      store.updatePrefs({ statColors: { ...(store.get().prefs.statColors || {}), [field]: color } });
    });
  });
  page.querySelector('#add-cat').addEventListener('click', () => openCategoryModal());
  page.querySelectorAll('[data-cat-edit]').forEach((b) => b.addEventListener('click', () => openCategoryModal(d.categories.find((c) => c.id === b.dataset.catEdit))));
  page.querySelectorAll('[data-cat-del]').forEach((b) => b.addEventListener('click', () => {
    const inUse = d.events.some((e) => e.category === b.dataset.catDel);
    if (confirm(inUse ? 'Essa categoria está em uso. Excluir mesmo assim? Os eventos passam pra outra categoria.' : 'Excluir essa categoria?')) {
      store.deleteCategory(b.dataset.catDel);
      toast('Categoria excluída.');
    }
  }));
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

  wireAccount(page);
}

function accountSubtitle() {
  if (!authState.configured) return 'Firebase não configurado ainda';
  if (authState.user) return authState.user.email;
  return 'Entre pra sincronizar entre aparelhos';
}

function syncBadgeHtml() {
  const map = {
    local: { cls: 'local', label: 'Só neste aparelho' },
    syncing: { cls: 'syncing', label: 'Sincronizando...' },
    synced: { cls: 'synced', label: 'Sincronizado' }
  };
  const s = map[authState.syncStatus] || map.local;
  return `<span class="sync-badge ${s.cls}">${icons.cloud} ${s.label}</span>`;
}

function accountBodyHtml() {
  if (!authState.configured) {
    return `<div class="callout">${icons.cloud}<div>Sem Firebase configurado, seus dados ficam só neste navegador. Configure em <code>js/firebase-config.js</code> pra ativar login e sincronizar entre aparelhos.</div></div>`;
  }
  if (authState.user) {
    return `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <span class="avatar" style="width:40px;height:40px;">${authState.user.photoURL ? `<img src="${authState.user.photoURL}" style="width:100%;height:100%;border-radius:999px;object-fit:cover;">` : (authState.user.email || '?').charAt(0).toUpperCase()}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${authState.user.email || authState.user.displayName || 'Conectada'}</div>
          ${syncBadgeHtml()}
        </div>
      </div>
      <button class="btn ghost" id="signout">Sair</button>
    `;
  }
  return `
    <button class="btn" id="google-signin">${icons.cloud} Entrar com Google</button>
  `;
}

function wireAccount(page) {
  page.querySelector('#google-signin')?.addEventListener('click', async () => {
    try { await signInWithGoogle(); toast('Login feito.'); }
    catch { toast('Não foi possível entrar com Google agora.'); }
  });
  page.querySelector('#signout')?.addEventListener('click', async () => {
    await signOutUser();
    toast('Você saiu.');
  });
}

function openCategoryModal(existing) {
  openModal({
    title: existing ? 'Editar categoria' : 'Nova categoria',
    bodyHtml: `
      <div class="field"><label>Nome</label><input class="input" id="f-name" placeholder="Ex.: Terapia" value="${existing ? escapeHtml(existing.name) : ''}" /></div>
      <div class="field"><label>Cor</label>${colorSwatchesHtml(existing?.color || 'cocoa')}</div>
      <div class="field"><label>Ícone</label>
        <div class="icon-select" id="f-icon">
          ${CATEGORY_ICONS.map((ic) => `<button type="button" class="icon-opt" data-icon="${ic}" aria-pressed="${(existing?.icon || 'tag') === ic}">${icons[ic]}</button>`).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn ghost" id="cancel">Cancelar</button>
        <button class="btn" id="save">Salvar</button>
      </div>
    `,
    onMount: (body, close) => {
      let color = existing?.color || 'cocoa';
      let icon = existing?.icon || 'tag';
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
        if (existing) store.updateCategory(existing.id, { name, color, icon });
        else store.addCategory({ name, color, icon });
        toast(existing ? 'Categoria atualizada.' : 'Categoria criada.');
        close();
      });
    }
  });
}

function themeBtn(value, icon, label, current) {
  return `<button class="theme-opt" data-theme-opt="${value}" aria-pressed="${current === value}">${icon}${label}</button>`;
}
function escAttr(str) {
  return (str ?? '').replace(/"/g, '&quot;');
}
