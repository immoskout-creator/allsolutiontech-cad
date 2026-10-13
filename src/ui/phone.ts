/**
 * Pamja në telefon: gjithçka që në kompjuter është lart në rreshta (menyja, veglat, cilësimet) shkon në një panel
 * vertikal majtas; plani zë gjithë pjesën tjetër. Telefoni i shtrirë: paneli ~168 px me tekst dhe veglat në rrjetë
 * 4 kolona. Telefoni në këmbë: paneli vetëm me ikona (56 px), që hapet më i gjerë me një prekje.
 * Tableti dhe Windows-i mbeten si më parë. Butonat zhvendosen (jo kopjohen), që të ruajnë ngjarjet e tyre.
 */

/** Telefon: ekran me prekje me anën e shkurtër nën 600 px (tableti dhe kompjuteri jo). `?telefon` e detyron për provë. */
export function isPhone(): boolean {
  if (/[?&]telefon\b/.test(location.search)) return true;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return coarse && Math.min(screen.width, screen.height) < 600;
}

const LIBRARY_ICON = '<svg class="ic" viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect></svg>';
const PANELS_ICON = '<svg class="ic" viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"></path><circle cx="16" cy="7" r="2"></circle><circle cx="8" cy="17" r="2"></circle></svg>';
const MENU_ICON = '<svg class="ic" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>';

export function setupPhoneLayout(): void {
  const app = document.getElementById('app');
  if (!app || !isPhone()) return;
  const $ = (id: string) => document.getElementById(id);

  const panel = document.createElement('nav');
  panel.className = 'phone-panel';
  panel.id = 'phonePanel';
  const section = (cls: string) => {
    const s = document.createElement('div');
    s.className = `pp-section ${cls}`;
    panel.appendChild(s);
    return s;
  };

  const head = section('pp-head');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'pp-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'phonePanel');
  toggle.setAttribute('aria-label', 'Menu');
  toggle.innerHTML = MENU_ICON;
  head.appendChild(toggle);
  const brand = document.querySelector('.top .brand');
  if (brand) head.appendChild(brand);
  const trial = $('trialBar');
  if (trial) panel.appendChild(trial);

  const menu = section('pp-menu');
  for (const id of ['btnNew', 'btnOpen', 'btnSaveAs', 'btnReports']) {
    const b = $(id);
    if (b) menu.appendChild(b);
  }

  const tools = section('pp-tools');
  document.querySelectorAll('.toolbar .tool').forEach((b) => tools.appendChild(b));

  // Libraritë (simbolet) dhe Vetitë: në kompjuter janë panele anash; në telefon hapen me këta dy butona, që duhet
  // të duken gjithmonë (jo të fshehur te cilësimet), me ikonë dhe emër si veglat e tjera
  const panels = section('pp-tools pp-panels');
  for (const [id, icon] of [
    ['btnLibrary', LIBRARY_ICON],
    ['btnPanels', PANELS_ICON],
  ] as const) {
    const b = $(id);
    if (!b) continue;
    const key = b.dataset.i18n;
    b.removeAttribute('data-i18n');
    b.className = 'tool';
    b.innerHTML = `${icon}<span${key ? ` data-i18n="${key}"` : ''}>${b.textContent ?? ''}</span>`;
    panels.appendChild(b);
  }

  const settings = section('pp-settings');
  const group = document.querySelector('.toolbar .settings');
  if (group) settings.appendChild(group);

  // poshtë: gjuha, kontakti, përditësimi (shtohet më vonë pas kontaktit) dhe licenca
  const foot = section('pp-foot');
  const lang = document.querySelector('.top .lang');
  if (lang) foot.appendChild(lang);
  const contact = $('btnContact');
  if (contact) foot.appendChild(contact);
  document.querySelectorAll('.top .lic-badge').forEach((b) => foot.appendChild(b));

  app.prepend(panel);
  app.classList.add('phone');
  // dritaret e mëdha (Raportet / PDF) ndjekin të njëjtin rregull: veglat majtas, faqja djathtas
  document.body.classList.add('is-phone');

  const setOpen = (open: boolean) => {
    app.toggleAttribute('data-phone-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(!app.hasAttribute('data-phone-open')));
  // prekja te plani ose një vegël e mbyll panelin e hapur (telefoni në këmbë)
  document.querySelector('.main')?.addEventListener('pointerdown', () => setOpen(false));
  tools.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.tool')) setOpen(false);
  });

  const orient = () => {
    app.dataset.phone = window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';
    document.body.dataset.phone = app.dataset.phone;
    if (app.dataset.phone === 'landscape') setOpen(false);
  };
  orient();
  window.addEventListener('resize', orient);
}
