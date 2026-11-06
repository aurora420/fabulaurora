import { t, load, esc, onLang, param, DISCIPLINES, pick } from './site.js';
import { workCard } from './cards.js';

const filters = document.getElementById('filters');
const wall = document.getElementById('wall');
const count = document.getElementById('count');
let works = [];
const ROOM_ALIAS = { interactive: 'xr' };                      // the interactive room was folded into XR
const asked = ROOM_ALIAS[param('room')] || param('room');
let room = DISCIPLINES.some((d) => d.id === asked) ? asked : 'all';

let shown = [];
let cols = 0;
const colsFor = () => (innerWidth >= 1080 ? 3 : innerWidth >= 620 ? 2 : 1);

// Hang the pieces in columns, always adding to the shortest one, so the reading order stays left to right.
function hang() {
  cols = colsFor();
  if (!shown.length) { wall.innerHTML = `<p class="empty">${esc(t('gallery.empty'))}</p>`; return; }
  const heights = Array(cols).fill(0);
  const columns = Array.from({ length: cols }, () => []);
  shown.forEach((w) => {
    const im = w.cover || w.hero;
    const k = heights.indexOf(Math.min(...heights));
    columns[k].push(workCard(w));
    heights[k] += (im?.w && im?.h ? im.h / im.w : 0.75) + 0.3;
  });
  wall.style.setProperty('--cols', cols);
  wall.innerHTML = columns.map((c) => `<div class="wallcol">${c.join('')}</div>`).join('');
}
addEventListener('resize', () => { if (colsFor() !== cols) hang(); });

function render() {
  const n = (id) => works.filter((w) => w.room === id).length;
  filters.innerHTML =
    `<button class="chip" type="button" data-room="all" aria-pressed="${room === 'all'}">${esc(t('gallery.all'))}<span class="chip__n">${works.length}</span></button>` +
    DISCIPLINES.filter((d) => n(d.id)).map((d) =>
      `<button class="chip" type="button" data-room="${d.id}" data-d="${d.id}" aria-pressed="${room === d.id}"><i class="dot"></i>${esc(pick(d))}<span class="chip__n">${n(d.id)}</span></button>`).join('');

  // "All work" opens with the featured pieces, then walks room by room
  const order = DISCIPLINES.map((d) => d.id);
  const list = room === 'all'
    ? [...works].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || order.indexOf(a.room) - order.indexOf(b.room))
    : works.filter((w) => w.room === room);
  shown = list;
  hang();
  count.textContent = list.length === 1 ? t('gallery.count.one') : t('gallery.count', { n: list.length });
  filters.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
}

filters.addEventListener('click', (e) => {
  const b = e.target.closest('[data-room]');
  if (!b) return;
  room = b.dataset.room;
  const url = new URL(location.href);
  if (room === 'all') url.searchParams.delete('room'); else url.searchParams.set('room', room);
  history.replaceState(null, '', url);
  render();
  const top = document.querySelector('.filterbar').getBoundingClientRect().top + scrollY - 72;
  if (scrollY > top) scrollTo({ top });
});

load('works').then((d) => { works = d.works || []; render(); }).catch((err) => {
  wall.innerHTML = `<p class="empty">The gallery could not load. Refresh the page to try again.</p>`;
  console.error(err);
});
onLang(render);
