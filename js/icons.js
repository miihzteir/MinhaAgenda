// Ícones em SVG puro (sem biblioteca), no mesmo estilo linha fina usado no
// resto do app. Cada função devolve uma string HTML pronta pra usar.
const s = (path, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${path}</svg>${extra}`;

export const icons = {
  home: s('<path d="M3 9.5 12 3l9 6.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>'),
  agenda: s('<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18"/><path d="M8 3v3M16 3v3"/>'),
  tasks: s('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.3 2.3L16 9.5"/>'),
  habits: s('<path d="M12 21c-4.4 0-7-2.7-7-6.3 0-3 2-5 3.3-7.3.4 1.3 1.3 2 2.2 2-.3-2.6.6-5 3-6.9 1 2.6 2 3.9 3.6 5.4C18.7 9.6 19 11.5 19 13c0 4.3-2.6 8-7 8Z"/>'),
  reminders: s('<path d="M6 8a6 6 0 1 1 12 0c0 4.5 1.5 6 2 7H4c.5-1 2-2.5 2-7Z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  notes: s('<path d="M8 3h8l3 5v10a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18V8Z"/><path d="M16 3v5h5"/><path d="M8.5 12h7M8.5 15.5h5"/>'),
  settings: s('<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.4 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2.6 1.5L10 22h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.4Z"/>'),
  plus: s('<path d="M12 5v14M5 12h14"/>'),
  search: s('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  check: s('<path d="M20 6 9 17l-5-5"/>'),
  trash: s('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
  edit: s('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  chevronLeft: s('<path d="m15 18-6-6 6-6"/>'),
  chevronRight: s('<path d="m9 18 6-6-6-6"/>'),
  flame: s('<path d="M12 21c-4.4 0-7-2.7-7-6.3 0-3 2-5 3.3-7.3.4 1.3 1.3 2 2.2 2-.3-2.6.6-5 3-6.9 1 2.6 2 3.9 3.6 5.4C18.7 9.6 19 11.5 19 13c0 4.3-2.6 8-7 8Z"/>'),
  bell: s('<path d="M6 8a6 6 0 1 1 12 0c0 4.5 1.5 6 2 7H4c.5-1 2-2.5 2-7Z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  clock: s('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'),
  book: s('<path d="M4 19.5V5.5A2.5 2.5 0 0 1 6.5 3H20v15.5"/><path d="M6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5V5.5A2.5 2.5 0 0 1 6.5 3Z"/>'),
  star: s('<path d="M12 2 9.3 8.9 2 9.4l5.7 4.6L5.8 21 12 16.9 18.2 21l-1.9-7 5.7-4.6-7.3-.5Z"/>'),
  moreH: s('<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>'),
  sun: s('<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: s('<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>'),
  laptop: s('<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M2 20h20"/>'),
  download: s('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>'),
  cloud: s('<path d="M7 18a4.5 4.5 0 0 1-1-8.9A5.5 5.5 0 0 1 16.9 7 4 4 0 0 1 17 15H7Z"/>'),
  x: s('<path d="M18 6 6 18M6 6l12 12"/>'),
  heart: s('<path d="M12 20.5s-7.5-4.6-9.8-9.3C.7 8 2 4.8 5 3.8c2-.6 3.9.1 5 1.8 1.1-1.7 3-2.4 5-1.8 3 1 4.3 4.2 2.8 7.4-2.3 4.7-9.8 9.3-9.8 9.3Z"/>'),
  pencil: s('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  droplet: s('<path d="M12 2.5s6.5 7 6.5 12A6.5 6.5 0 0 1 5.5 14.5C5.5 9.5 12 2.5 12 2.5Z"/>')
};
