import { t, load, esc, onLang, param, pick } from './site.js';
import { postCard, blockText } from './cards.js';

const CATS = ['biomedical', 'technology', 'art'];
const q = document.getElementById('q');
const state = { cat: CATS.includes(param('cat')) ? param('cat') : 'all', tag: param('tag') || '', q: param('q') || '' };
let posts = [];
q.value = state.q;

const text = (p) => [pick(p.title), pick(p.excerpt), pick(p.lead), (p.tags || []).join(' '), (p.content || []).map(blockText).join(' ')]
  .join(' ').replace(/<[^>]+>/g, ' ').toLowerCase();

function sync() {
  const url = new URL(location.href);
  for (const [k, v] of [['cat', state.cat === 'all' ? '' : state.cat], ['tag', state.tag], ['q', state.q]]) {
    if (v) url.searchParams.set(k, v); else url.searchParams.delete(k);
  }
  history.replaceState(null, '', url);
}

function render() {
  const live = posts.filter((p) => !p.hidden);
  document.getElementById('cats').innerHTML = ['all', ...CATS].map((c) =>
    `<button class="chip" type="button" data-cat="${c}" aria-pressed="${state.cat === c}">${esc(t(`blog.cat.${c}`))}</button>`).join('');

  const counts = new Map();
  live.forEach((p) => (p.tags || []).forEach((g) => counts.set(g, (counts.get(g) || 0) + 1)));
  const tags = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  document.getElementById('tags').innerHTML = tags.map(([g]) =>
    `<button type="button" data-tag="${esc(g)}" aria-pressed="${state.tag === g}">#${esc(g)}</button>`).join('');

  const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = live
    .filter((p) => state.cat === 'all' || p.category === state.cat)
    .filter((p) => !state.tag || (p.tags || []).includes(state.tag))
    .filter((p) => { const hay = text(p); return words.every((w) => hay.includes(w)); })
    .sort((a, b) => (b.sort || '').localeCompare(a.sort || ''));

  const filtering = state.cat !== 'all' || state.tag || state.q;
  document.getElementById('count').textContent = filtering ? `${shown.length} / ${live.length}` : '';
  document.getElementById('posts').innerHTML = shown.length
    ? shown.map((p, i) => postCard(p, { lead: i === 0 && !filtering })).join('')
    : `<div class="empty" style="grid-column:1/-1"><p>${esc(t('blog.empty'))}</p><p style="margin-top:1rem"><button class="btn btn--ghost btn--small" type="button" id="clear">${esc(t('blog.clear'))}</button></p></div>`;
}

document.getElementById('cats').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  state.cat = b.dataset.cat; sync(); render();
});
document.getElementById('tags').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tag]');
  if (!b) return;
  state.tag = state.tag === b.dataset.tag ? '' : b.dataset.tag; sync(); render();
});
document.getElementById('posts').addEventListener('click', (e) => {
  if (!e.target.closest('#clear')) return;
  state.cat = 'all'; state.tag = ''; state.q = ''; q.value = ''; sync(); render(); q.focus();
});
q.addEventListener('input', () => { state.q = q.value.trim(); sync(); render(); });

load('posts').then((d) => { posts = d.posts || []; render(); }).catch((err) => {
  document.getElementById('posts').innerHTML = '<p class="empty">The notes could not load. Refresh the page to try again.</p>';
  console.error(err);
});
onLang(render);
