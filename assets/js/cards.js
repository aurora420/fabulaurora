// Card renderers shared by the gallery and the blog.
import { t, pick, esc, imgTag, disciplineName } from './site.js';

/* ── gallery ── */
export function workCard(w, { sizes = '(min-width: 67.5rem) 24rem, (min-width: 38.75rem) 45vw, 60vw' } = {}) {
  const meta = [pick(w.kind), w.year].filter(Boolean).join(', ');
  return `
    <a class="hang" href="work.html?id=${encodeURIComponent(w.id)}" data-d="${esc(w.room)}">
      ${w.cover || w.hero
        ? `<span class="frame">${imgTag(w.cover || w.hero, { sizes, alt: pick(w.title) })}</span>`
        : `<span class="frame"><span class="frame__film"><svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="21" fill="#fff"/><path d="M18 14l13 8-13 8z" fill="currentColor"/></svg></span></span>`}
      <span class="placard">
        <span class="tag"><i class="dot"></i>${esc(disciplineName(w.room))}</span>
        <span class="placard__title">${esc(pick(w.title))}</span>
        <span class="placard__meta">${esc(meta)}</span>
      </span>
    </a>`;
}

/* ── blog ── */
/** The text of a post's body block, a string or { en, ko }. Pictures and other blocks have none. */
export const blockText = (b) => (typeof b === 'string' || b?.en ? pick(b) : null);

export const readMinutes = (post) => {
  const words = (post.content || []).map(blockText).join(' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length + (pick(post.lead) || '').split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
};

/** A post's picture is either a file path or an image object ({ src, srcset, w, h }). */
export function postImage(p, opts = {}) {
  const im = p.image || p.hero;
  if (im && typeof im === 'object') return imgTag(im, { alt: pick(p.imageAlt), ...opts });
  return `<img src="${esc(im || '')}" alt="${esc(pick(p.imageAlt))}"${opts.lazy === false ? '' : ' loading="lazy" decoding="async"'}>`;
}

export function postCard(p, { lead = false } = {}) {
  const cat = p.category ? t(`blog.cat.${String(p.category).toLowerCase()}`) : '';
  return `
    <a class="post-card${lead ? ' post-card--lead' : ''}" href="post.html?slug=${encodeURIComponent(p.slug)}">
      <span class="frame">${postImage(p, { sizes: lead ? '(min-width: 48rem) 55vw, 100vw' : '(min-width: 60rem) 24rem, 60vw' })}</span>
      <span class="stack" style="--stack:.55rem">
        <span class="post-meta"><span class="tag">${esc(cat)}</span><span>${esc(p.date || '')}</span><span>${t('blog.min', { n: readMinutes(p) })}</span></span>
        <h3>${esc(pick(p.title))}</h3>
        <p>${esc(pick(p.excerpt))}</p>
      </span>
    </a>`;
}
