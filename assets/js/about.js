import { t, pick, load, esc, onLang } from './site.js';

const root = document.getElementById('about');
let about = null;
let site = {};

const item = (x) => {
  const href = x.work ? `work.html?id=${x.work}` : x.post ? `post.html?slug=${x.post}` : '';
  const title = esc(pick(x.role));
  return `
    <div class="cv__item">
      <div><h3>${href ? `<a href="${href}">${title}</a>` : title}</h3><p class="where">${esc(pick(x.where))}</p></div>
      ${pick(x.when) ? `<p class="when">${esc(pick(x.when))}</p>` : '<span></span>'}
      ${x.points?.length ? `<ul>${x.points.map((p) => `<li>${esc(pick(p))}</li>`).join('')}</ul>` : ''}
    </div>`;
};
const group = (key, items) => `<h2>${esc(t(key))}</h2><div class="cv__items">${items.map(item).join('')}</div>`;

function render() {
  if (!about) return;
  root.innerHTML = `
    <section class="page-head">
      <div class="wrap about-top">
        <div>
          <h1 class="display">${esc(t('about.h1'))}</h1>
          <p class="lede" style="margin-top:1.2rem">${esc(pick(about.intro))}</p>
          <p class="muted" style="margin-top:.9rem">${esc(about.name)}, ${esc(about.credentials)}</p>
          <div class="row" style="margin-top:1.75rem">
            <a class="btn btn--primary" href="contact.html">${esc(t('hero.cta2'))}</a>
            ${site.resume ? `<a class="btn btn--ghost" href="${esc(site.resume)}" download>${esc(t('about.resume'))}</a>` : ''}
          </div>
        </div>
        <div class="about-top__art"><img src="assets/img/avatars/About.webp" alt="" width="812" height="900"></div>
      </div>
    </section>

    <section class="section section--tint">
      <div class="wrap">
        <div class="section__head"><h2 class="display">${esc(t('about.focus.h'))}</h2></div>
        <ol class="directions">${about.directions.map((d) => `<li data-d="${esc(d.room)}"><h3>${esc(pick(d.title))}</h3><p>${esc(pick(d.text))}</p></li>`).join('')}</ol>
      </div>
    </section>

    <section class="section">
      <div class="wrap cv">
        ${group('about.cv.experience', about.experience)}
        ${group('about.cv.projects', about.projects)}
        ${group('about.cv.recognition', about.recognition)}
        ${group('about.cv.education', about.education)}
        <h2>${esc(t('about.cv.tools'))}</h2>
        <div class="cv__items" style="padding-top:1.4rem"><ul class="toolset">${about.tools.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      </div>
    </section>

    <section class="section cta-band">
      <div class="wrap">
        <div>
          <h2 class="display">${esc(t('about.cta.h'))}</h2>
          <p>${esc(t('about.cta.p'))}</p>
          <div class="row" style="margin-top:1.75rem">
            <a class="btn btn--butter" href="contact.html">${esc(t('hero.cta2'))}</a>
            ${site.resume ? `<a class="btn btn--ghost-light" href="${esc(site.resume)}" download>${esc(t('about.resume'))}</a>` : ''}
          </div>
        </div>
        <img class="cta-band__sticker" src="assets/img/avatars/sticker-medical.webp" alt="" loading="lazy">
      </div>
    </section>`;
}

Promise.all([load('about'), load('site').catch(() => ({}))]).then(([a, s]) => { about = a; site = s; render(); }).catch((err) => {
  root.innerHTML = '<section class="page-head"><div class="wrap"><p class="lede">This page could not load. Refresh to try again.</p></div></section>';
  console.error(err);
});
onLang(render);
