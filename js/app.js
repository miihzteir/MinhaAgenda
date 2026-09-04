import { icons } from './icons.js';
import { store } from './store.js';
import { renderHome } from './pages/home.js';
import { renderAgenda } from './pages/agenda.js';
import { renderTasks } from './pages/tasks.js';
import { renderHabits } from './pages/habits.js';
import { renderReminders } from './pages/reminders.js';
import { renderNotes } from './pages/notes.js';
import { renderSettings } from './pages/settings.js';
import { openQuickAdd } from './quickadd.js';
import { openSearch } from './search.js';
import { authState } from './firebase.js';

const NAV = [
  { to: '#/', label: 'Início', icon: 'home', page: renderHome },
  { to: '#/agenda', label: 'Agenda', icon: 'agenda', page: renderAgenda },
  { to: '#/tarefas', label: 'Tarefas', icon: 'tasks', page: renderTasks },
  { to: '#/habitos', label: 'Hábitos', icon: 'habits', page: renderHabits },
  { to: '#/lembretes', label: 'Lembretes', icon: 'reminders', page: renderReminders },
  { to: '#/notas', label: 'Notas', icon: 'notes', page: renderNotes },
  { to: '#/configuracoes', label: 'Configurações', icon: 'settings', page: renderSettings }
];
const MOBILE_PRIMARY = ['#/', '#/agenda', '#/tarefas'];

function applyTheme() {
  const { theme, accent } = store.get().prefs;
  const root = document.documentElement;
  if (theme === 'dark') root.setAttribute('data-theme', 'dark');
  else if (theme === 'light') root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme'); // auto: segue o sistema (ver prefers-color-scheme no CSS, aplicado abaixo)

  if (theme === 'auto') {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    if (mql.matches) root.setAttribute('data-theme', 'dark');
  }

  const accents = {
    cocoa: '#a9785f', blush: '#cf8f7d', sage: '#8ba37c', mauve: '#a68fa6'
  };
  const strong = { cocoa: '#8f6249', blush: '#b8735f', sage: '#71895f', mauve: '#8a738a' };
  root.style.setProperty('--accent', accents[accent] || accents.cocoa);
  root.style.setProperty('--accent-strong', strong[accent] || strong.cocoa);
}

function currentRoute() {
  return window.location.hash || '#/';
}

function shell() {
  const root = document.getElementById('root');
  const route = currentRoute();
  const active = NAV.find((n) => n.to === route) || NAV[0];
  const user = authState.user;

  root.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark"><img src="favicon.svg" alt="" /></div>
          <span class="brand-name">Minha Agenda</span>
        </div>
        <nav>
          ${NAV.map((n) => navItemHtml(n, n.to === active.to)).join('')}
        </nav>
      </aside>
      <div class="main-wrap" style="flex:1;min-width:0;">
        <header class="topbar" style="padding:14px 20px 0;">
          <div class="mobile-brand">
            <div class="brand-mark" style="width:30px;height:30px;"><img src="favicon.svg" alt="" /></div>
            <span class="brand-name" style="font-size:15px;">Minha Agenda</span>
          </div>
          <button class="icon-btn" id="btn-search" aria-label="Buscar">${icons.search}</button>
          <button class="pill-btn" id="btn-add">${icons.plus} Adicionar</button>
          <button class="avatar" id="btn-profile" title="${user ? user.email : 'Perfil'}">${user?.photoURL ? `<img src="${user.photoURL}" alt="" style="width:100%;height:100%;border-radius:999px;object-fit:cover;">` : (store.get().profile.name || '?').charAt(0).toUpperCase()}</button>
        </header>
        <main class="main" id="page"></main>
      </div>
      <nav class="bottom-nav">
        ${MOBILE_PRIMARY.slice(0, 2).map((to) => navItemHtml(NAV.find((n) => n.to === to), to === active.to)).join('')}
        <button class="fab" id="btn-fab" aria-label="Adicionar">${icons.plus}</button>
        ${MOBILE_PRIMARY.slice(2).map((to) => navItemHtml(NAV.find((n) => n.to === to), to === active.to)).join('')}
        <a href="#/mais" class="nav-item ${route === '#/mais' ? 'active' : ''}">${icons.moreH}<span>Mais</span></a>
      </nav>
    </div>
  `;

  root.querySelector('#btn-add').addEventListener('click', () => openQuickAdd());
  root.querySelector('#btn-fab').addEventListener('click', () => openQuickAdd());
  root.querySelector('#btn-search').addEventListener('click', () => openSearch());
  root.querySelector('#btn-profile').addEventListener('click', () => { window.location.hash = '#/configuracoes'; });

  const page = document.getElementById('page');
  if (route === '#/mais') {
    renderMore(page);
  } else {
    active.page(page);
  }
}

function navItemHtml(item, isActive) {
  return `<a href="${item.to}" class="nav-item ${isActive ? 'active' : ''}">${icons[item.icon]}<span>${item.label}</span></a>`;
}

function renderMore(page) {
  const rest = NAV.filter((n) => !MOBILE_PRIMARY.includes(n.to));
  page.innerHTML = `
    <h1 style="font-size:22px;margin-bottom:14px;">Mais</h1>
    <div class="card"><div class="card-body" style="padding-top:14px;">
      ${rest.map((n) => `<a href="${n.to}" class="nav-item" style="padding:12px;">${icons[n.icon]}<span>${n.label}</span></a>`).join('')}
    </div></div>
  `;
}

window.addEventListener('hashchange', shell);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
store.onChange(() => { applyTheme(); });
document.addEventListener('auth-changed', shell);

applyTheme();
shell();

// Registra o service worker (funciona offline e permite instalar o app).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
