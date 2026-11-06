import { t, load, esc, onLang, param, pick, imgTag, largest, wireZoom } from './site.js';
import { postCard, postImage, readMinutes, blockText } from './cards.js';

/** The byline avatar follows the note's category: Jeah in the outfit of that kind of work. */
const AVATAR = { biomedical: 'sticker-medical', technology: 'sticker-xr', art: 'sticker-anatomy' };

const root = document.getElementById('post');
let posts = [];

/** Body blocks: "## Heading", "- list item", "1. list item", a plain paragraph (HTML allowed), any of those as { en, ko }, { figure }, { gallery }, { video }, { quote, by }. */
function body(content = []) {
  const out = [];
  let list = null;
  const close = () => { if (list) { out.push(`<${list.tag}>${list.items.map((i) => `<li>${i}</li>`).join('')}</${list.tag}>`); list = null; } };
  const fig = (im, cap) => `<figure><button type="button" class="frame" style="padding:.45rem;cursor:zoom-in" data-zoom="${esc(largest(im))}" data-cap="${esc(cap || pick(im.cap) || '')}" aria-label="${esc(t('work.zoom'))}">${imgTag(im, { sizes: '(min-width: 46rem) 43rem, 100vw' })}</button>${cap || pick(im.cap) ? `<figcaption>${esc(cap || pick(im.cap))}</figcaption>` : ''}</figure>`;
  for (const block of content) {
    const text = blockText(block);
    if (text != null) {
      const s = text.trim();
      const ul = s.match(/^[-*]\s+(.*)$/);
      const ol = s.match(/^\d+\.\s+(.*)$/);
      if (ul || ol) {
        const tag = ul ? 'ul' : 'ol';
        if (!list || list.tag !== tag) { close(); list = { tag, items: [] }; }
        list.items.push((ul || ol)[1]);
        continue;
      }
      close();
      if (s.startsWith('### ')) out.push(`<h3>${s.slice(4)}</h3>`);
      else if (s.startsWith('## ')) out.push(`<h2>${s.slice(3)}</h2>`);
      else if (s) out.push(`<p>${s}</p>`);
    } else if (block?.figure) {
      close();
      out.push(fig(block.figure, pick(block.caption)));
    } else if (block?.gallery) {
      close();
      out.push(`<div class="detail-grid" style="margin-block:2em;grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr))">${block.gallery.map((im) => fig(im)).join('')}</div>`);
    } else if (block?.video) {
      close();
      const v = block.video;
      const cap = pick(block.caption);
      out.push(`<figure><div class="frame" style="padding:.45rem"><video controls playsinline preload="metadata" poster="${esc(v.poster || '')}" width="${esc(v.w || '')}" height="${esc(v.h || '')}" aria-label="${esc(cap)}"><source src="${esc(v.src)}" type="video/mp4"></video></div>${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure>`);
    } else if (block?.quote) {
      close();
      out.push(`<figure class="pull"><blockquote>${esc(pick(block.quote))}</blockquote>${block.by ? `<figcaption>${esc(pick(block.by))}</figcaption>` : ''}</figure>`);
    }
  }
  close();
  return out.join('\n');
}

function related(post) {
  const mine = new Set(post.tags || []);
  return posts
    .filter((p) => p.slug !== post.slug && !p.hidden)
    .map((p) => ({ p, score: (p.tags || []).filter((g) => mine.has(g)).length * 2 + (p.category === post.category ? 1 : 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.p.sort || '').localeCompare(a.p.sort || ''))
    .slice(0, 3)
    .map((x) => x.p);
}

function render() {
  const key = param('slug');
  const post = posts.find((p) => p.slug === key) || posts.find((p) => p.id === param('id'));
  if (!post) {
    document.title = `${t('post.notfound.h')} — Fabulaurora`;
    root.innerHTML = `<section class="page-head"><div class="wrap stack">
      <h1 class="display">${esc(t('post.notfound.h'))}</h1><p class="lede">${esc(t('post.notfound.p'))}</p>
      <p><a class="btn btn--primary" href="blog.html">${esc(t('post.back'))}</a></p></div></section>`;
    return;
  }
  document.title = `${pick(post.title)} — Fabulaurora`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', pick(post.excerpt) || pick(post.lead));
  const cat = post.category ? t(`blog.cat.${String(post.category).toLowerCase()}`) : '';
  const meta = [post.date, pick(post.location), t('blog.min', { n: readMinutes(post) })].filter((x) => x && String(x).trim());
  const more = related(post);
  const firstIsFigure = post.content?.[0] != null && blockText(post.content[0]) == null;

  root.innerHTML = `
    <article>
      <header class="article article__head wrap">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="blog.html">‹ ${esc(t('post.back'))}</a>
          ${cat ? `<a class="tag" href="blog.html?cat=${esc(post.category)}">${esc(cat)}</a>` : ''}</nav>
        <h1 class="display">${esc(pick(post.title))}</h1>
        ${pick(post.lead) ? `<p class="article__lead" style="margin-top:1.1rem">${esc(pick(post.lead))}</p>` : ''}
        <p class="post-meta" style="margin-top:1rem">${meta.map((m) => `<span>${esc(m)}</span>`).join('')}</p>
      </header>
      ${post.image && !firstIsFigure ? `<div class="article wrap article__hero"><div class="frame" style="padding:.6rem">${postImage(post, { sizes: '(min-width: 46rem) 43rem, 100vw', lazy: false })}</div></div>` : '<div style="height:2rem"></div>'}
      <div class="article wrap article__body" data-zoom-group>${post.html || body(post.content)}</div>
      <footer class="article wrap">
        ${(post.tags || []).length ? `<p class="row" style="margin-top:2.5rem;gap:.4rem .9rem">${post.tags.map((g) => `<a class="hash" href="blog.html?tag=${encodeURIComponent(g)}">#${esc(g)}</a>`).join('')}</p>` : ''}
        <div class="byline">
          <img src="assets/img/avatars/${AVATAR[post.category] || AVATAR.technology}.webp" alt="">
          <div><div style="font-weight:600">${esc(post.author || 'Jeah Kim')}</div><div class="muted small">${esc(pick(post.authorRole) || '')}</div></div>
        </div>
      </footer>
    </article>
    ${more.length ? `<section class="section section--tint" style="margin-top:clamp(3rem,7vw,5rem)"><div class="wrap">
      <div class="section__head"><h2 class="display">${esc(t('post.related.h'))}</h2></div>
      <div class="post-list">${more.map((p) => postCard(p)).join('')}</div></div></section>` : '<div style="height:clamp(3rem,7vw,5rem)"></div>'}`;
}

wireZoom(root);
load('posts').then((d) => { posts = d.posts || []; render(); }).catch((err) => {
  root.innerHTML = '<section class="page-head"><div class="wrap"><p class="lede">This note could not load. Refresh the page to try again.</p></div></section>';
  console.error(err);
});
onLang(render);
