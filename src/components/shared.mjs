import { messages } from '../data/content.mjs';
export const escape = (value = '') => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
export const text = (value, lang) => escape(typeof value === 'object' && value !== null ? value[lang] : value);
export const arrow = (direction = 'right') => `<span aria-hidden="true" class="arrow">${direction === 'external' ? '↗' : direction === 'back' ? '←' : '→'}</span>`;
export const route = (lang, page = '') => `/${lang}/${page ? `${page}/` : ''}`;
export const ui = messages;
