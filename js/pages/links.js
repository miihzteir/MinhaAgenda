import { store } from '../store.js';
import { icons } from '../icons.js';
import { openModal, toast } from '../modal.js';
import { escapeHtml } from './home.js';

let unsub = null;

export function withProtocol(url) {
  if (!/^https?:\/\//i.test(url)) return `https://${url}`;
  return url;
}
export function hostOf(url) {
  try { return new URL(withProtocol(url)).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

export function renderLinks(page) {
  if (unsub) unsub();
  unsub = store.onChange(() => draw(page));
  draw(page);
}

function draw(page) {
  const d = store.get();
  page.innerHTML = `
    <div class="topbar" style="margin-bottom:8px;"><h1 style="font-size:22px;">Links rápidos</h1><button class="mini-btn" id="add" style="margin-left:auto;">${icons.plus} Novo link</button></div>
    <div class="card"><div class="card-body" style="padding-top:12px;">
      ${d.links.length ? `<div class="link-grid">${d.links.map(linkCardHtml).join('')}</div>` : `<div class="empty">${icons.link}<div>Nenhum link ainda. Adicione atalhos pra sites que você usa sempre.</div></div>`}
    </div></div>
  `;

  page.querySelector('#add').addEventListener('click', () => openLinkModal());
  page.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); openLinkModal(d.links.find((l) => l.id === b.dataset.edit)); }));
  page.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); store.deleteLink(b.dataset.del); toast('Link excluído.'); }));
}

export function linkCardHtml(l) {
  const href = escapeHtml(withProtocol(l.url));
  return `
    <a class="link-card" href="${href}" target="_blank" rel="noopener">
      <span class="link-card-ic">${icons.link}</span>
      <div style="flex:1;min-width:0;">
        <div class="item-title" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(l.title || hostOf(l.url))}</div>
        <div style="font-size:11px;color:var(--ink-soft);opacity:.65;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(hostOf(l.url))}</div>
      </div>
      <div class="row-actions">
        <button class="icon-btn sm" data-edit="${l.id}">${icons.edit}</button>
        <button class="icon-btn sm" data-del="${l.id}">${icons.trash}</button>
      </div>
    </a>`;
}

export function openLinkModal(existing) {
  openModal({
    title: existing ? 'Editar link' : 'Novo link',
    bodyHtml: `
      <div class="field"><label>Nome</label><input class="input" id="f-title" placeholder="Ex.: Portal da faculdade" value="${existing ? escapeHtml(existing.title) : ''}" /></div>
      <div class="field"><label>Endereço</label><input class="input" id="f-url" placeholder="ex.: meusite.com" value="${existing ? escapeHtml(existing.url) : ''}" /></div>
      <div class="modal-footer">
        <button class="btn ghost" id="cancel">Cancelar</button>
        <button class="btn" id="save">Salvar</button>
      </div>
    `,
    onMount: (body, close) => {
      body.querySelector('#f-title').focus();
      body.querySelector('#cancel').addEventListener('click', close);
      body.querySelector('#save').addEventListener('click', () => {
        const url = body.querySelector('#f-url').value.trim();
        if (!url) return;
        const title = body.querySelector('#f-title').value.trim();
        const payload = { title: title || hostOf(url), url };
        if (existing) store.updateLink(existing.id, payload);
        else store.addLink(payload);
        toast(existing ? 'Link atualizado.' : 'Link adicionado.');
        close();
      });
    }
  });
}
