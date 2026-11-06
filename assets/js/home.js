import { t, pick, load, esc, onLang, imgTag, icon } from './site.js';

/* ── the landing page is the hero: one scene, four floors ──
   A label on the right, its ring on the model, or the floor itself opens that floor: the camera glides in and a
   card shows three selected pieces from it, with a link to that room of the gallery. Which pieces: `floors` in
   data/site.json. */
const FLOOR_IDS = ['anatomy', 'biology', 'medical', 'xr'];
const hero = document.getElementById('hero');
const stage = document.getElementById('hero-stage');
const callouts = document.getElementById('callouts');
const chips = document.getElementById('hero-chips');
const card = document.getElementById('floorcard');
const copy = document.getElementById('hero-copy');
const wideMQ = matchMedia('(min-width: 68rem)');
const LABELS_W = 240;                                   // the label column on the right

let api = null;          // the 3D scene, once it runs
let floors = [];         // [{ id, room, picks: [work, …] }]
let open = null;         // the open floor's id
let pickIndex = 0;       // which of its pieces the card shows
let closing = 0;

/* every control that stands for a floor: the labels, the rings, the chips */
const controls = () => document.querySelectorAll('.callout[data-floor], .marker[data-floor], .chip[data-floor]');
function labelControls() {
  controls().forEach((b) => {
    const name = t(`callout.${b.dataset.floor}.name`);
    const pressed = b.getAttribute('aria-pressed') === 'true';
    if (b.classList.contains('marker')) b.setAttribute('aria-label', pressed ? t('floor.close') : t('floor.zoom', { name }));
    else b.removeAttribute('aria-label');
  });
}
labelControls();

/* where the cake (or the open floor) should sit on the canvas, as fractions of it */
function framing(mode, W, H) {
  const wide = wideMQ.matches;
  const s = stage.getBoundingClientRect();
  if (mode === 'overview') {
    if (!wide) return { cx: 0.5, cy: 0.42, w: 0.92, h: 0.54 };
    // the copy on the left, the labels on the right, the cake between them
    const lede = copy.querySelector('.lede') || copy;
    const copyRight = (lede.getBoundingClientRect().right - s.left) + 24;
    const gutter = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 32;
    const right = W - gutter - LABELS_W - 16;
    return { cx: (copyRight + right) / 2 / W, cy: 0.53, w: Math.max(0.2, (right - copyRight) / W), h: Math.min(0.8, (H - 150) / H), labelX: right + 30 };
  }
  const r = card.hidden ? null : card.getBoundingClientRect();
  if (wide) {
    const left = (r ? r.right - s.left : W * 0.36) + 32;     // the card, plus its fanned backs
    const right = W - 24;
    return { cx: (left + right) / 2 / W, cy: 0.52, w: ((right - left) / W) * 0.9, h: 0.72 };
  }
  const top = 76, bottom = (r ? r.top - s.top : H * 0.48) - 8;   // between the header and the sheet
  return { cx: 0.5, cy: (top + bottom) / 2 / H, w: 0.9, h: ((bottom - top) / H) * 0.84 };
}

/* the card */
const ratioOf = (im) => (im?.w && im?.h ? Math.min(1.6, Math.max(0.9, im.w / im.h)).toFixed(3) : '1.333');   // the picture box follows the piece, within reason
function renderCard(f) {
  const name = t(`callout.${f.id}.name`);
  const w = f.picks[pickIndex] || f.picks[0];
  card.dataset.d = f.id;
  card.innerHTML = `
    <div class="floorcard__panel">
      <button class="floorcard__close" type="button" data-close aria-label="${esc(t('floor.close'))}">${icon.close}</button>
      <h2 class="floorcard__name">${esc(name)}</h2>
      <p class="floorcard__sub">${esc(t(`callout.${f.id}.sub`))}</p>
      ${w ? `
      <a class="floorcard__pic" href="work.html?id=${encodeURIComponent(w.id)}" aria-label="${esc(t('floor.open', { title: pick(w.title) }))}" style="--ratio:${ratioOf(w.cover || w.hero)}">${imgTag(w.cover || w.hero, { sizes: '(min-width: 68rem) 22rem, 100vw', alt: '', lazy: false })}</a>
      <p class="floorcard__cap"><b>${esc(pick(w.title))}</b><span>${esc([pick(w.kind), w.year].filter(Boolean).join(', '))}</span></p>` : ''}
      ${f.picks.length > 1 ? `
      <div class="floorcard__thumbs" role="tablist" aria-label="${esc(t('floor.picks'))}">
        ${f.picks.map((p, i) => `<button type="button" role="tab" aria-selected="${i === pickIndex}" data-pick="${i}" aria-label="${esc(pick(p.title))}">${imgTag(p.cover || p.hero, { sizes: '4rem', alt: '' })}</button>`).join('')}
      </div>` : ''}
      <a class="btn btn--butter" href="gallery.html?room=${encodeURIComponent(f.room)}" aria-label="${esc(t('floor.gallery.aria', { name }))}">${esc(t('floor.gallery'))}</a>
    </div>`;
}

function setPressed(id) {
  controls().forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.floor === id)));
  labelControls();
}

function openFloor(id, { instant = false } = {}) {
  const f = floors.find((x) => x.id === id);
  if (!f) return;
  if (open !== id) pickIndex = 0;
  open = id;
  clearTimeout(closing);
  if (hero.getBoundingClientRect().top < -8) scrollTo({ top: 0, behavior: instant ? 'auto' : 'smooth' });
  renderCard(f);
  card.hidden = false;
  card.getBoundingClientRect();                        // lay it out first, so it slides in (and the scene can measure it)
  card.classList.add('is-in');
  hero.classList.add('is-floor');
  setPressed(id);
  api?.open(id, { instant });
  if (location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
}

function closeFloor() {
  if (!open) return;
  open = null;
  card.classList.remove('is-in');
  hero.classList.remove('is-floor');
  setPressed(null);
  api?.close();
  closing = setTimeout(() => { if (!open) card.hidden = true; }, 450);
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
}

const toggleFloor = (e) => {
  const b = e.target.closest('[data-floor]');
  if (!b) return;
  if (b.getAttribute('aria-pressed') === 'true') closeFloor(); else openFloor(b.dataset.floor);
};
callouts.addEventListener('click', toggleFloor);
chips.addEventListener('click', toggleFloor);
card.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) { closeFloor(); return; }
  const tab = e.target.closest('[data-pick]');
  if (tab && open) {
    pickIndex = Number(tab.dataset.pick);
    renderCard(floors.find((x) => x.id === open));
    card.querySelector('.floorcard__pic')?.classList.add('is-swap');
    card.querySelector(`[data-pick="${pickIndex}"]`)?.focus();
  }
});
addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) closeFloor(); });
addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (FLOOR_IDS.includes(id)) { if (id !== open) openFloor(id); } else closeFloor();
});
onLang(() => { labelControls(); if (open) renderCard(floors.find((x) => x.id === open)); });

/* which pieces each floor shows: data/site.json first, then that room's featured pieces */
async function loadFloors() {
  const [site, works] = await Promise.all([load('site').catch(() => ({})), load('works').catch(() => ({ works: [] }))]);
  const all = works.works || [];
  const hasArt = (w) => !!(w && (w.cover || w.hero));
  floors = FLOOR_IDS.map((id) => {
    const cfg = (site.floors || []).find((f) => f.id === id) || {};
    const room = cfg.room || id;
    const chosen = (cfg.picks || []).map((pid) => all.find((w) => w.id === pid)).filter(hasArt);
    const rest = all.filter((w) => w.room === room && hasArt(w) && !chosen.includes(w)).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    return { id, room, picks: chosen.concat(rest).slice(0, 3) };
  });
  const id = location.hash.slice(1);
  if (FLOOR_IDS.includes(id)) openFloor(id, { instant: true });
}

/* the scene itself */
function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}
const still = () => hero.classList.add('is-still');           // fall back to the rendered still image
const giveUp = setTimeout(() => { if (!hero.classList.contains('is-ready')) still(); }, 12000);

const ready = loadFloors();
if (!webglOk()) still();
else {
  import('./hero.js')
    .then(({ mountHero }) => mountHero({
      hero, stage, callouts, framing,
      onPick: (id) => { if (id !== open) openFloor(id); },
    }))
    .then(async (a) => {
      clearTimeout(giveUp);
      api = a;
      hero.classList.remove('is-still');
      hero.querySelector('.hero__poster')?.setAttribute('aria-hidden', 'true');
      a.canvas.setAttribute('aria-label', t('hero.alt'));
      onLang(() => { a.canvas.setAttribute('aria-label', t('hero.alt')); a.relayout(); });
      window.__hero = a;
      await ready;
      if (open) a.open(open, { instant: true });              // a #floor link opened its card before the model arrived
    })
    .catch((err) => { still(); console.warn('Hero model did not load; showing the still image instead.', err); });
}

/* ── collaborators: a slow band of logos ── */
const band = document.getElementById('logos');
const toggle = document.getElementById('logos-toggle');
const ICON = {
  pause: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 2h3v10H3zM8 2h3v10H8z" fill="currentColor"/></svg>',
  play: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3.5 1.5l8.5 5.5-8.5 5.5z" fill="currentColor"/></svg>',
};
function setPaused(paused) {
  band.classList.toggle('is-paused', paused);
  toggle.setAttribute('aria-pressed', String(paused));
  toggle.dataset.i18nAttr = `aria-label:${paused ? 'logos.play' : 'logos.pause'}`;
  toggle.setAttribute('aria-label', t(paused ? 'logos.play' : 'logos.pause'));
  toggle.innerHTML = paused ? ICON.play : ICON.pause;
}
toggle.addEventListener('click', () => setPaused(!band.classList.contains('is-paused')));
setPaused(false);

function logoBand(list) {
  // A collaborator with a "logo" file shows the logo; without one, the name is set in type.
  const items = list.map((c) => `<li>${c.logo
    ? `<img src="${esc(c.logo)}" alt="${esc(pick(c.name))}" loading="lazy" decoding="async">`
    : `<span class="logos__name">${esc(pick(c.name))}</span>`}</li>`).join('');
  band.hidden = list.length === 0;
  // the second copy only exists so the band can loop without a seam
  document.getElementById('logos-viewport').innerHTML = `<ul class="logos__track">${items}</ul><ul class="logos__track" aria-hidden="true">${items}</ul>`;
}

async function render() {
  const site = await load('site').catch(() => ({}));
  logoBand(site.collaborators || []);
}
render();
onLang(render);
