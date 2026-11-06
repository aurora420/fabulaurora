// Contact form. With no "formEndpoint" in data/site.json it opens the visitor's email app with the message written out;
// add a Formspree (or similar) endpoint there and it sends in place instead.
import { t, load, esc, onLang, param, pick, icon } from './site.js';

const NEEDS = ['figure', 'illustration', 'model', 'animation', 'xr', 'brand', 'general', 'other'];
const form = document.getElementById('form');
const send = document.getElementById('send');
const status = document.getElementById('status');
let site = {};
let works = [];
let chosen = NEEDS.includes(param('need')) ? param('need') : '';

function render() {
  document.getElementById('needs').innerHTML = NEEDS.map((n) =>
    `<label><input type="radio" name="need" value="${n}"${n === chosen ? ' checked' : ''}><span>${esc(t(`need.${n}`))}</span></label>`).join('');
  send.textContent = t(site.contact?.formEndpoint ? 'contact.send' : 'contact.send.mail');

  const email = site.email || '';
  document.getElementById('reach').innerHTML = `
    <div><h2>${esc(t('contact.direct.h'))}</h2><a class="big" href="mailto:${esc(email)}">${esc(email)}</a></div>
    <div><h2>${esc(t('contact.social.h'))}</h2>
      <div class="socials">
        ${site.social?.linkedin ? `<a href="${esc(site.social.linkedin)}" target="_blank" rel="noopener" aria-label="LinkedIn">${icon.linkedin}</a>` : ''}
        ${site.social?.instagram ? `<a href="${esc(site.social.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${icon.instagram}</a>` : ''}
        <a href="mailto:${esc(email)}" aria-label="Email">${icon.mail}</a>
      </div>
    </div>
    <div><h2>${esc(t('contact.include.h'))}</h2>
      <ul class="checks">${[1, 2, 3, 4].map((n) => `<li>${icon.check}<span>${esc(t(`contact.include.${n}`))}</span></li>`).join('')}</ul>
    </div>
    <img class="reach__art" src="assets/img/brand/chat-bubble.webp" width="960" height="840" alt="${esc(t('footer.art'))}" loading="lazy" decoding="async">`;

  // arriving from an exhibit: mention it in the message
  const about = works.find((w) => w.id === param('about'));
  const box = form.elements.message;
  if (about && !box.value) box.value = `${pick(about.title)} — `;
}

form.addEventListener('change', (e) => { if (e.target.name === 'need') chosen = e.target.value; });

function check() {
  const rules = [
    ['name', (v) => v.trim().length > 0, 'contact.err.name'],
    ['email', (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), 'contact.err.email'],
    ['message', (v) => v.trim().length > 0, 'contact.err.message'],
  ];
  let first = null;
  for (const [name, ok, key] of rules) {
    const input = form.elements[name];
    const field = input.closest('.field');
    const err = field.querySelector('.error');
    const good = ok(input.value);
    field.classList.toggle('has-error', !good);
    input.setAttribute('aria-invalid', String(!good));
    err.hidden = good;
    err.textContent = good ? '' : t(key);
    if (!good && !first) first = input;
  }
  first?.focus();
  return !first;
}

function say(key, kind) {
  status.hidden = false;
  status.className = `notice${kind === 'ok' ? ' notice--ok' : ''}`;
  status.textContent = t(key, { email: kind === 'ok' && key === 'contact.sent' ? form.elements.email.value.trim() : site.email || '' });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!check()) return;
  const data = Object.fromEntries(new FormData(form).entries());
  if (data._gotcha) return;                       // filled only by bots
  delete data._gotcha;
  const need = data.need ? t(`need.${data.need}`) : '';
  const endpoint = site.contact?.formEndpoint;

  if (!endpoint) {
    const lines = [data.message.trim(), '', `— ${data.name.trim()}`, data.organisation?.trim(), data.email.trim(), need && `${t('contact.need')} ${need}`, data.deadline?.trim() && `${t('contact.deadline')}: ${data.deadline.trim()}`].filter((x) => x !== undefined && x !== false && x !== null);
    const subject = `${need || 'Project enquiry'} — ${data.name.trim()}`;
    location.href = `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.filter((l, i) => l !== '' || i === 1).join('\n'))}`;
    say('contact.mail.opened', 'ok');
    return;
  }

  send.disabled = true;
  send.textContent = t('contact.sending');
  try {
    const res = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, need }) });
    if (!res.ok) throw new Error(String(res.status));
    say('contact.sent', 'ok');
    form.reset();
    chosen = '';
  } catch (err) {
    say('contact.failed');
  } finally {
    send.disabled = false;
    send.textContent = t('contact.send');
  }
});

Promise.all([load('site').catch(() => ({})), load('works').catch(() => ({ works: [] }))]).then(([s, w]) => { site = s; works = w.works || []; render(); });
onLang(render);
