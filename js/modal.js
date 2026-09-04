import { icons } from './icons.js';

export function openModal({ title, bodyHtml, onMount, onClose }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2>${title}</h2>
        <button class="icon-btn" id="modal-close">${icons.x}</button>
      </div>
      <div id="modal-body">${bodyHtml}</div>
    </div>
  `;
  document.body.appendChild(backdrop);
  document.body.style.overflow = 'hidden';

  function close() {
    backdrop.remove();
    document.body.style.overflow = '';
    onClose?.();
  }

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector('#modal-close').addEventListener('click', close);

  onMount?.(backdrop.querySelector('#modal-body'), close);
  return close;
}

export function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
