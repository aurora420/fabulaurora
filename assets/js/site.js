// Shared chrome and helpers for every page: language switch, header/footer, data loading, lightbox.
import { UI } from './i18n.js';

/* ───────── language ───────── */
export const LANGS = ['en', 'ko'];

function initialLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(q)) return q;
  try {
    const saved = localStorage.getItem('fab_lang');
    if (LANGS.includes(saved)) return saved;
  } catch (e) { /* private mode */ }
  return (navigator.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

let lang = initialLang();
export const getLang = () => lang;

/** UI string by key, e.g. t('nav.gallery'). Falls back to English, then to the key. */
export function t(key, vars) {
  let s = (UI[lang] && UI[lang][key]) ?? UI.en[key] ?? key;
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, vars[k]);
  return s;
}

/** Content value that is either a plain string or {en, ko}. */
export function pick(v) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  return v[lang] ?? v.en ?? Object.values(v)[0] ?? '';
}

export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':');
      if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
    });
  });
}

export function setLang(next) {
  if (!LANGS.includes(next) || next === lang) return;
  lang = next;
  try { localStorage.setItem('fab_lang', lang); } catch (e) { /* ignore */ }
  const url = new URL(location.href);                   // a ?lang= in the address would otherwise win on the next reload
  if (url.searchParams.has('lang')) { url.searchParams.delete('lang'); history.replaceState(null, '', url); }
  document.documentElement.lang = lang;
  applyStatic();
  document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

/** Re-run a page's render function whenever the language changes. */
export function onLang(fn) {
  document.addEventListener('langchange', () => fn(lang));
}

/* ───────── data ───────── */
const cache = new Map();
export function load(name) {
  if (!cache.has(name)) {
    cache.set(name, fetch(`data/${name}.json`).then((r) => {
      if (!r.ok) throw new Error(`Could not load data/${name}.json (${r.status})`);
      return r.json();
    }));
  }
  return cache.get(name);
}

/* ───────── small DOM helpers ───────── */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const param = (k) => new URLSearchParams(location.search).get(k);

export const DISCIPLINES = [
  { id: 'biology', en: 'Biology', ko: '생명과학' },
  { id: 'medical', en: 'Medical science', ko: '의학' },
  { id: 'anatomy', en: 'Anatomy', ko: '해부학' },
  { id: 'journal', en: 'Journal figures', ko: '논문 그림' },
  { id: 'xr', en: 'XR & interactive', ko: 'XR · 인터랙티브' },
  { id: 'promo', en: 'Promotional design', ko: '홍보 디자인' },
  { id: 'fun', en: 'Fun experiments', ko: '기타' },
];
export const disciplineName = (id) => pick(DISCIPLINES.find((d) => d.id === id) || { en: id });

export const icon = {
  menu: '<svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 8h18M4 13h18M4 18h18"/></svg>',
  close: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l12 12M17 5L5 17"/></svg>',
  prev: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 4.5L7 11l6.5 6.5"/></svg>',
  next: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 4.5L15 11l-6.5 6.5"/></svg>',
  check: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 9.5l3.5 3.5 7.5-8"/></svg>',
  star: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 1.8l2.4 5.2 5.7.6-4.3 3.8 1.2 5.6L10 14.1 5 17l1.2-5.6L1.9 7.6l5.7-.6z"/></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="5.2"/><path d="M12 12l4 4"/></svg>',
  mail: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4" width="15" height="12" rx="2"/><path d="M3 5.5l7 5.5 7-5.5"/></svg>',
  linkedin: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M4.6 7.4H2V18h2.6V7.4zM3.3 2a1.6 1.6 0 100 3.2 1.6 1.6 0 000-3.2zM18 11.7c0-3-1.6-4.5-3.8-4.5-1.5 0-2.4.8-2.8 1.5V7.4H8.9V18h2.6v-5.6c0-1.3.6-2.3 1.9-2.3 1.2 0 1.9.8 1.9 2.3V18H18v-6.3z"/></svg>',
  instagram: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="2.5" y="2.5" width="15" height="15" rx="4.2"/><circle cx="10" cy="10" r="3.4"/><circle cx="14.6" cy="5.4" r="0.6" fill="currentColor"/></svg>',
};

/* ───────── responsive images ───────── */
/** img = { src, srcset?: {600: url, 1200: url, …}, w?, h?, alt?, cap? } */
export function imgTag(img, { sizes = '100vw', lazy = true, cls = '', alt } = {}) {
  if (!img) return '';
  const set = img.srcset ? Object.entries(img.srcset).map(([w, u]) => `${esc(u)} ${w}w`).join(', ') : '';
  const a = alt ?? pick(img.alt) ?? pick(img.cap) ?? '';
  const dims = img.w && img.h ? ` width="${img.w}" height="${img.h}"` : '';
  return `<img src="${esc(img.src)}"${set ? ` srcset="${set}" sizes="${esc(sizes)}"` : ''}${dims} alt="${esc(a)}"${lazy ? ' loading="lazy" decoding="async"' : ''}${cls ? ` class="${cls}"` : ''}>`;
}
export const largest = (img) => {
  if (!img) return '';
  if (img.anim) return img.anim;                        // animated pieces: the page shows a still, the enlarged view plays
  if (!img.srcset) return img.src;
  const keys = Object.keys(img.srcset).map(Number).sort((a, b) => a - b);
  const want = keys.find((k) => k >= 1900) ?? keys[keys.length - 1];
  return img.srcset[want];
};

/* ───────── header + footer ───────── */
const NAV = [
  ['about.html', 'nav.about'],
  ['gallery.html', 'nav.gallery'],
  ['blog.html', 'nav.blog'],
  ['contact.html', 'nav.contact'],
];

function currentPage() {
  const f = location.pathname.split('/').pop() || 'index.html';
  if (f === 'work.html') return 'gallery.html';
  if (f === 'post.html' || f === 'article.html') return 'blog.html';
  return f;
}

function mountHeader() {
  const dark = document.body.dataset.header === 'dark';
  const here = currentPage();
  const el = document.createElement('header');
  el.className = `site-header${dark ? ' on-dark' : ''}`;
  el.innerHTML = `
    <div class="wrap site-header__inner">
      <a class="brand" href="index.html" aria-label="Fabulaurora — home">
        <span class="brand__mark" aria-hidden="true"></span><span class="brand__name">Fabulaurora</span>
      </a>
      <nav class="nav" aria-label="Main">
        <ul class="nav__links" id="nav-links">
          ${NAV.map(([href, key]) => `<li><a href="${href}" data-i18n="${key}"${href === here ? ' aria-current="page"' : ''}>${t(key)}</a></li>`).join('')}
        </ul>
        <div class="lang" role="group" data-i18n-attr="aria-label:lang.label" aria-label="${t('lang.label')}">
          <button type="button" data-lang="en" aria-pressed="${lang === 'en'}" lang="en">EN</button>
          <button type="button" data-lang="ko" aria-pressed="${lang === 'ko'}" lang="ko">한국어</button>
        </div>
        <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav-links" data-i18n-attr="aria-label:nav.menu" aria-label="${t('nav.menu')}">${icon.menu}</button>
      </nav>
    </div>`;
  document.body.prepend(el);

  // keyboard users can jump straight past the navigation
  const main = document.querySelector('main');
  if (main) {
    if (!main.id) main.id = 'main';
    main.setAttribute('tabindex', '-1');
    const skip = document.createElement('a');
    skip.className = 'skip';
    skip.href = `#${main.id}`;
    skip.dataset.i18n = 'nav.skip';
    skip.textContent = t('nav.skip');
    document.body.prepend(skip);
  }

  el.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  const btn = el.querySelector('.menu-btn');
  const setMenu = (open) => {
    document.documentElement.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.innerHTML = open ? icon.close : icon.menu;
  };
  btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true'));
  el.querySelectorAll('.nav__links a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  const solid = () => el.classList.toggle('is-solid', scrollY > 24);
  addEventListener('scroll', solid, { passive: true });
  solid();
}

async function mountFooter() {
  const el = document.createElement('footer');
  el.className = 'site-footer';
  document.body.append(el);
  let site = {};
  try { site = await load('site'); } catch (e) { /* footer still renders */ }
  const render = () => {
    el.innerHTML = `
      <div class="wrap">
        <div class="site-footer__top">
          <div class="site-footer__who">
            <a class="brand" href="index.html"><span class="brand__mark" aria-hidden="true"></span><span class="brand__name">Fabulaurora</span></a>
            <p>${t('footer.line')}</p>
          </div>
          <div class="site-footer__reach">
            <h2>${t('footer.reach')}</h2>
            <ul>
              ${site.email ? `<li><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>` : ''}
              ${site.social?.linkedin ? `<li><a href="${esc(site.social.linkedin)}" rel="noopener" target="_blank">LinkedIn</a></li>` : ''}
              ${site.social?.instagram ? `<li><a href="${esc(site.social.instagram)}" rel="noopener" target="_blank">Instagram</a></li>` : ''}
            </ul>
          </div>
          <!-- Jeah in their speech bubble: rendered by 3d/build_chat_bubble.py -->
          <img class="site-footer__art" src="assets/img/brand/chat-bubble.webp" width="960" height="840" alt="${esc(t('footer.art'))}" loading="lazy" decoding="async">
        </div>
        <div class="site-footer__base">
          <span>© ${new Date().getFullYear()} Jeah Aurora Kim. ${t('footer.rights')}</span>
          <span>${t('footer.reuse')}</span>
        </div>
      </div>`;
  };
  render();
  onLang(render);
}

/* ───────── lightbox ───────── */
/** items: [{ src, cap }] */
export function lightbox(items, start = 0) {
  if (!items.length) return;
  let i = start;
  const opener = document.activeElement;
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', t('lightbox.label'));
  box.innerHTML = `
    <div class="lightbox__bar"><span class="small" data-count></span><button type="button" data-close aria-label="${t('lightbox.close')}">${icon.close}</button></div>
    <div class="lightbox__stage"><img alt="">
      <div class="lightbox__nav"><button type="button" data-prev aria-label="${t('lightbox.prev')}">${icon.prev}</button><button type="button" data-next aria-label="${t('lightbox.next')}">${icon.next}</button></div>
    </div>
    <p class="lightbox__cap"></p>`;
  const imgEl = box.querySelector('img');
  const show = () => {
    const it = items[i];
    imgEl.src = it.src;
    imgEl.alt = it.cap || '';
    box.querySelector('.lightbox__cap').textContent = it.cap || '';
    box.querySelector('[data-count]').textContent = items.length > 1 ? `${i + 1} / ${items.length}` : '';
    box.querySelector('.lightbox__nav').hidden = items.length < 2;
  };
  const go = (d) => { i = (i + d + items.length) % items.length; show(); };
  const close = () => {
    box.remove();
    document.documentElement.style.overflow = '';
    removeEventListener('keydown', onKey);
    opener?.focus?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'Tab') {
      const f = $$('button:not([hidden])', box).filter((b) => b.offsetParent);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  box.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target === box || e.target.classList.contains('lightbox__stage')) close();
    else if (e.target.closest('[data-prev]')) go(-1);
    else if (e.target.closest('[data-next]')) go(1);
  });
  addEventListener('keydown', onKey);
  document.documentElement.style.overflow = 'hidden';
  document.body.append(box);
  show();
  box.querySelector('[data-close]').focus();
}

/** Wire every [data-zoom] inside root to open the lightbox; siblings in the same [data-zoom-group] page together. */
export function wireZoom(root = document) {
  root.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-zoom]');
    if (!trigger || !root.contains(trigger)) return;
    e.preventDefault();
    const group = trigger.closest('[data-zoom-group]') || root;
    const all = $$('[data-zoom]', group);
    lightbox(all.map((el) => ({ src: el.dataset.zoom, cap: el.dataset.cap || '' })), Math.max(0, all.indexOf(trigger)));
  });
}

/* ───────── boot ───────── */
document.documentElement.lang = lang;
if (!document.querySelector('.site-header')) mountHeader();
applyStatic();
if (!document.querySelector('.site-footer')) mountFooter();
