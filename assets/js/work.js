// One exhibit: the finished piece with its wall label, then the trail of how it was made.
import { t, pick, load, esc, onLang, param, imgTag, largest, disciplineName, wireZoom, icon, DISCIPLINES } from './site.js';

const root = document.getElementById('exhibit');
let works = [];

const zoomAttrs = (img, cap, named = true) => `data-zoom="${esc(largest(img))}" data-cap="${esc(cap || pick(img.cap) || '')}"${named ? ` aria-label="${esc(t(img.anim ? 'work.play' : 'work.zoom'))}"` : ''}`;
const PLAY = '<span class="frame__play" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 1.5l9 5.5-9 5.5z" fill="currentColor"/></svg></span>';
const badge = (img) => (img.anim ? PLAY : '');
const QUOTE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.5 5C6.1 6.1 3.5 9 3.5 12.9V19h7v-7H7.2c.2-1.8 1.4-3.2 3.1-3.9zm11 0c-3.4 1.1-6 4-6 7.9V19h7v-7h-3.3c.2-1.8 1.4-3.2 3.1-3.9z"/></svg>';

/** One "Where it went" line: text with an optional link, or a quote. A link to another site shows its domain; a page on this site needs a "label". */
function outcome(o) {
  if (o.quote) return `<li>${QUOTE}<figure><blockquote>${esc(pick(o.quote))}</blockquote>${o.by ? `<figcaption>${esc(pick(o.by))}</figcaption>` : ''}</figure></li>`;
  const external = /^https?:/.test(o.href || '');
  const name = pick(o.label) || (external ? new URL(o.href).hostname.replace('www.', '') : '');
  const link = o.href ? ` <a class="link" href="${esc(o.href)}"${external ? ' target="_blank" rel="noopener"' : ''}>${esc(name)}</a>` : '';
  return `<li>${icon.star}<span>${esc(pick(o.text))}${link}</span></li>`;
}

function label(w) {
  const rows = [
    ['work.label.medium', pick(w.medium) || w.tools],
    ['work.label.client', pick(w.client)],
    ['work.label.with', pick(w.partner)],
    ['work.label.role', pick(w.role)],
    ['work.label.cite', w.cite],
  ].filter(([, v]) => v);
  const links = (w.links || []).map((l) => `<a class="link" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(pick(l.label))}</a>`).join('');
  return `
    <aside class="wall-label" data-d="${esc(w.room)}">
      <h2>${esc(pick(w.title))}</h2>
      <p class="year">${esc([pick(w.kind), w.year].filter(Boolean).join(', '))}</p>
      <dl>${rows.map(([k, v]) => `<dt>${esc(t(k))}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      ${links ? `<div class="links">${links}</div>` : ''}
    </aside>`;
}

function video(v) {
  return `<div class="video-embed"><iframe src="${esc(v.src)}" title="${esc(v.title || '')}" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
}

function trail(w) {
  const steps = [...(w.trail || [])];
  if (!steps.length) return '';
  // The last step is the finished piece: the hero image, or, when the work has one, a video. `finalStep: false` leaves it out.
  const ends = w.finalStep !== false;
  if (ends && w.finalVideo) steps.push({ stage: { en: 'Final', ko: '완성' }, note: w.finalVideo.cap || w.kind, images: [], video: w.finalVideo, last: true });
  else if (ends && w.hero) steps.push({ stage: { en: 'Final', ko: '완성' }, note: w.kind, images: [w.hero], last: true });
  const items = steps.map((s, i) => {
    const stage = pick(s.stage);
    const [first, ...rest] = s.video ? [null, ...s.images] : s.images;
    const cap = (im) => [stage, pick(im.cap)].filter(Boolean).join(' — ');
    const thumbs = rest.slice(0, 3).map((im) => `<button type="button"${im.anim ? ' class="is-anim"' : ''} ${zoomAttrs(im, cap(im))}>${imgTag(im, { sizes: '4rem', alt: pick(im.cap) || stage })}</button>`).join('');
    const more = rest.length > 3
      ? `<button type="button" class="more" ${zoomAttrs(rest[3], cap(rest[3]), false)}>${esc(t('work.more', { n: rest.length - 3 }))}</button>` +
        rest.slice(4).map((im) => `<span hidden ${zoomAttrs(im, cap(im), false)}></span>`).join('')
      : '';
    return `
      <li class="step">
        <div class="step__rail"><span class="step__n">${i + 1}</span></div>
        <h3 class="step__stage">${esc(stage)}</h3>
        <div class="stack" style="--stack:.7rem">
          <div class="step__media">
            ${s.video
              ? `<div class="frame step__video">${s.video.embed
                  ? `<iframe src="${esc(s.video.embed)}" title="${esc(pick(s.video.cap) || stage)}" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe>`
                  : `<video controls preload="metadata" playsinline poster="${esc(s.video.poster || '')}" src="${esc(s.video.src)}"${s.video.w && s.video.h ? ` width="${s.video.w}" height="${s.video.h}"` : ''}></video>`}</div>`
              : `<button type="button" class="frame" ${zoomAttrs(first, cap(first))}>${imgTag(first, { sizes: '(min-width: 40rem) 19rem, 66vw', alt: pick(first.cap) || stage })}${badge(first)}</button>`}
            ${rest.length ? `<div class="step__thumbs">${thumbs}${more}</div>` : ''}
          </div>
          <p class="step__note">${esc(pick(s.note))}</p>
        </div>
      </li>`;
  }).join('');
  return `
    <section class="section section--tint">
      <div class="wrap">
        <div class="section__head"><h2 class="display">${esc(t('work.trail.h'))}</h2></div>
        <ol class="trail" data-zoom-group>${items}</ol>
        ${ends ? `<div class="trail-hint"><span>${esc(t('work.trail.from'))}</span><span>${esc(t('work.trail.to'))}</span></div>` : ''}
      </div>
    </section>`;
}

function render() {
  const id = param('id');
  const i = works.findIndex((w) => w.id === id);
  if (i < 0) {
    document.title = `${t('work.notfound.h')} — Fabulaurora`;
    root.innerHTML = `
      <section class="page-head"><div class="wrap stack">
        <h1 class="display">${esc(t('work.notfound.h'))}</h1>
        <p class="lede">${esc(t('work.notfound.p'))}</p>
        <p><a class="btn btn--primary" href="gallery.html">${esc(t('hero.cta1'))}</a></p>
      </div></section>`;
    return;
  }
  const w = works[i];
  document.title = `${pick(w.title)} — Fabulaurora`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', pick(w.statement));

  const brief = Object.entries(w.brief || {}).map(([k, v]) => `<div><h3>${esc(t(`work.brief.${k}`))}</h3><p>${esc(pick(v))}</p></div>`).join('');
  const main = w.hero
    ? `<button type="button" class="frame" ${zoomAttrs(w.hero, pick(w.title))}>${imgTag(w.hero, { sizes: '(min-width: 56rem) 60vw, 100vw', lazy: false, alt: pick(w.title) })}${badge(w.hero)}</button>`
    : (w.videos?.length ? video(w.videos[0]) : '');
  const videos = (w.hero ? w.videos || [] : (w.videos || []).slice(1));
  const details = w.details || [];
  const outcomes = w.outcomes || [];

  // previous / next walk the gallery in room order
  const order = DISCIPLINES.map((d) => d.id);
  const seq = [...works].sort((a, b) => order.indexOf(a.room) - order.indexOf(b.room));
  const at = seq.indexOf(w);
  const prev = seq[(at - 1 + seq.length) % seq.length];
  const next = seq[(at + 1) % seq.length];

  root.innerHTML = `
    <article>
      <header class="exhibit-head wrap">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="gallery.html">‹ ${esc(t('work.back'))}</a>
          <a class="tag" data-d="${esc(w.room)}" href="gallery.html?room=${esc(w.room)}"><i class="dot"></i>${esc(disciplineName(w.room))}</a>
        </nav>
        <h1 class="display">${esc(pick(w.title))}</h1>
        <p class="lede">${esc(pick(w.statement))}</p>
      </header>

      <div class="wrap exhibit-main" data-zoom-group>
        <div>${main}</div>
        ${label(w)}
      </div>

      ${brief ? `<section class="section section--tight"><div class="wrap brief">${brief}</div></section>` : '<div style="height:clamp(2.5rem,5vw,4rem)"></div>'}

      ${trail(w)}

      ${videos.length ? `<section class="section section--tight"><div class="wrap">
        <div class="section__head"><h2 class="display">${esc(pick(w.videosTitle) || t('work.watch.h'))}</h2>${w.videosNote ? `<p>${esc(pick(w.videosNote))}</p>` : ''}</div>
        <div class="detail-grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,26rem),1fr))">${videos.map(video).join('')}</div>
      </div></section>` : ''}

      ${details.length ? `<section class="section section--tight"><div class="wrap">
        <div class="section__head"><h2 class="display">${esc(pick(w.detailsTitle) || t('work.details.h'))}</h2>${w.detailsNote ? `<p>${esc(pick(w.detailsNote))}</p>` : ''}</div>
        <div class="detail-grid" data-zoom-group>${details.map((im) => `
          <figure>
            <button type="button" class="frame" ${zoomAttrs(im)}>${imgTag(im, { sizes: '(min-width: 40rem) 16rem, 45vw' })}${badge(im)}</button>
            ${pick(im.cap) ? `<figcaption>${esc(pick(im.cap))}</figcaption>` : ''}
          </figure>`).join('')}</div>
      </div></section>` : ''}

      ${outcomes.length ? `<section class="section section--tight"><div class="wrap">
        <div class="section__head"><h2 class="display">${esc(t('work.outcome.h'))}</h2></div>
        <ul class="outcomes" style="max-width:46rem">${outcomes.map(outcome).join('')}</ul>
      </div></section>` : ''}

      <section class="section section--tight"><div class="wrap">
        <div class="wall-label" style="--d:var(--peri);display:flex;flex-wrap:wrap;gap:1rem 2rem;align-items:center;justify-content:space-between;padding:1.5rem 1.75rem">
          <div><h2 style="font-size:1.25rem">${esc(t('work.commission.h'))}</h2><p class="muted">${esc(t('work.commission.p'))}</p></div>
          <a class="btn btn--primary" href="contact.html?about=${encodeURIComponent(w.id)}">${esc(t('hero.cta2'))}</a>
        </div>
      </div></section>

      <div class="wrap section section--tight" style="padding-top:0">
        <nav class="pager" aria-label="More exhibits">
          <a href="work.html?id=${encodeURIComponent(prev.id)}"><span>‹ ${esc(t('work.prev'))}</span><b>${esc(pick(prev.title))}</b></a>
          <a href="work.html?id=${encodeURIComponent(next.id)}"><span>${esc(t('work.next'))} ›</span><b>${esc(pick(next.title))}</b></a>
        </nav>
      </div>
    </article>`;
}

wireZoom(root);
load('works').then((d) => { works = d.works || []; render(); }).catch((err) => {
  root.innerHTML = `<section class="page-head"><div class="wrap"><p class="lede">This exhibit could not load. Refresh the page to try again.</p></div></section>`;
  console.error(err);
});
onLang(render);
