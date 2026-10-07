import { Store } from './core/store';
import { emptyDoc, isSymbol, isWall, type SymbolEntity, type Wall } from './core/types';
import { add, dist, formatMeters, len, scale, sub } from './core/geometry';
import { sampleDoc } from './core/sample';
import { Viewport } from './view/viewport';
import { render } from './view/renderer';
import { Editor, type ToolId } from './tools/editor';
import { loadAutosave, readFile, saveFile, writeAutosave } from './io/files';
import { applyStatic, getLang, isLang, LANGS, layerName, setLang, t, type Lang } from './i18n/strings';
import { CATEGORIES, SYMBOLS, symbolDef, symbolSvg, type SymbolDef } from './symbols/library';
import { normAngle } from './symbols/place';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const canvas = $<HTMLCanvasElement>('canvas');
const ctx = canvas.getContext('2d')!;
const app = $<HTMLDivElement>('app');

const store = new Store(loadAutosave() ?? sampleDoc());
const vp = new Viewport();
const editor = new Editor(
  store,
  vp,
  { snap: true, grid: true, ortho: false, gridStep: 100, wallThickness: 250 },
  () => scheduleRender(),
);

// ---- gjuha ----

const LANG_KEY = 'astcad.lang';
function storedLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (isLang(v)) return v;
  } catch {
    // pa ruajtje lokale: përdor gjuhën standarde
  }
  return 'sq';
}

const langSelect = $<HTMLSelectElement>('langSelect');
langSelect.innerHTML = LANGS.map((l) => `<option value="${l.id}">${l.label}</option>`).join('');

function applyLang(lang: Lang): void {
  setLang(lang);
  langSelect.value = lang;
  document.documentElement.lang = lang;
  applyStatic(document);
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // s'ka rëndësi nëse nuk ruhet
  }
  renderLibrary();
  propsKey = '';
  layersKey = '';
  summaryKey = '';
  syncUi();
}
langSelect.addEventListener('change', () => isLang(langSelect.value) && applyLang(langSelect.value));

const symName = (def: SymbolDef) => def.names[getLang()];

// ---- vizatimi në canvas ----

let frame = 0;
function scheduleRender(): void {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    draw();
  });
}

function draw(): void {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render(ctx, vp, {
    doc: store.doc,
    selection: store.selection,
    showGrid: editor.settings.grid,
    overlay: editor.overlay,
  });
  updateStatus();
}

function resize(): void {
  const r = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const first = vp.width <= 1;
  vp.width = Math.max(1, r.width);
  vp.height = Math.max(1, r.height);
  canvas.width = Math.round(vp.width * dpr);
  canvas.height = Math.round(vp.height * dpr);
  if (first) fitAll();
  draw();
}

function fitAll(): void {
  const pts = store.doc.entities.flatMap((e) => (isWall(e) ? [e.a, e.b] : [e.pos]));
  if (pts.length === 0) {
    vp.fit({ minX: 0, minY: 0, maxX: 12000, maxY: 8000 });
  } else {
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    vp.fit({ minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) });
  }
  scheduleRender();
}

new ResizeObserver(resize).observe(canvas);

// ---- miu ----

const screenPt = (e: PointerEvent | WheelEvent | MouseEvent) => {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};

canvas.addEventListener('pointerdown', (e) => {
  canvas.focus();
  canvas.setPointerCapture(e.pointerId);
  editor.pointerDown(screenPt(e), e.button, e.shiftKey);
  if (e.button === 1 || editor.tool === 'pan') canvas.classList.add('panning');
  syncUi();
  e.preventDefault();
});
canvas.addEventListener('pointermove', (e) => editor.pointerMove(screenPt(e), e.shiftKey));
canvas.addEventListener('pointerup', (e) => {
  canvas.classList.remove('panning');
  editor.pointerUp(screenPt(e));
});
canvas.addEventListener('pointerleave', () => editor.pointerLeave());
canvas.addEventListener('dblclick', () => editor.doubleClick());
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
    editor.wheel(screenPt(e), e.ctrlKey ? dy * 3 : dy);
  },
  { passive: false },
);

// ---- veglat dhe butonat ----

const toolButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-tool]')];
function setTool(tool: ToolId): void {
  editor.setTool(tool);
  syncUi();
}
toolButtons.forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool as ToolId)));

$('btnUndo').addEventListener('click', () => store.undo());
$('btnRedo').addEventListener('click', () => store.redo());
$('btnDelete').addEventListener('click', () => editor.deleteSelection());
$('btnFit').addEventListener('click', fitAll);
$('btnZoomIn').addEventListener('click', () => {
  vp.zoomAt({ x: vp.width / 2, y: vp.height / 2 }, 1.25);
  scheduleRender();
});
$('btnZoomOut').addEventListener('click', () => {
  vp.zoomAt({ x: vp.width / 2, y: vp.height / 2 }, 0.8);
  scheduleRender();
});

const thicknessSelect = $<HTMLSelectElement>('wallThickness');
thicknessSelect.addEventListener('change', () => {
  editor.settings.wallThickness = Number(thicknessSelect.value);
  scheduleRender();
});

function toggleChip(id: string, key: 'snap' | 'grid' | 'ortho'): void {
  editor.settings[key] = !editor.settings[key];
  $(id).setAttribute('aria-pressed', String(editor.settings[key]));
  scheduleRender();
}
$('chipSnap').addEventListener('click', () => toggleChip('chipSnap', 'snap'));
$('chipGrid').addEventListener('click', () => toggleChip('chipGrid', 'grid'));
$('chipOrtho').addEventListener('click', () => toggleChip('chipOrtho', 'ortho'));

function togglePanel(button: string, key: 'panels' | 'library', force?: boolean): void {
  const open = force ?? app.dataset[key] !== 'open';
  app.dataset[key] = open ? 'open' : '';
  $(button).setAttribute('aria-expanded', String(open));
}
$('btnPanels').addEventListener('click', () => togglePanel('btnPanels', 'panels'));
$('btnLibrary').addEventListener('click', () => togglePanel('btnLibrary', 'library'));

// ---- libraria e simboleve ----

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const layerColor = (id: string) => store.layer(id)?.color ?? '#9CC5FF';
/** Ngjyrat e shtresave janë për fletën e bardhë; në panelin e errët i çelim pak. */
const TILE_COLORS: Record<string, string> = { prizat: '#7FB0FF', ndricimi: '#FDBA74', pajisje: '#C4B5FD' };

const searchInput = $<HTMLInputElement>('symbolSearch');
searchInput.addEventListener('input', renderLibrary);

function renderLibrary(): void {
  const q = searchInput.value.trim().toLowerCase();
  const matches = (d: SymbolDef) =>
    !q || d.code.toLowerCase().includes(q) || Object.values(d.names).some((n) => n.toLowerCase().includes(q));
  const html = CATEGORIES.map((cat) => {
    const defs = SYMBOLS.filter((d) => d.category === cat.id && matches(d));
    if (defs.length === 0) return '';
    const tiles = defs
      .map(
        (d) => `<button class="tile" type="button" data-symbol="${d.id}" aria-pressed="${editor.activeSymbol === d.id}"
          title="${esc(`${d.code} · ${symName(d)}`)}" style="--tile-color:${TILE_COLORS[d.layer] ?? '#9CC5FF'}">
          ${symbolSvg(d)}<span class="tile-name">${esc(symName(d))}</span><span class="tile-code">${d.code}</span></button>`,
      )
      .join('');
    return `<section><h3 class="sym-cat">${esc(cat.names[getLang()])}</h3><div class="tiles">${tiles}</div></section>`;
  }).join('');
  $('symbolGroups').innerHTML = html || `<p class="muted small">${esc(t('noResults'))}</p>`;
}

$('symbolGroups').addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-symbol]');
  if (!btn) return;
  const id = btn.dataset.symbol!;
  if (editor.tool === 'symbol' && editor.activeSymbol === id) setTool('select');
  else {
    editor.pickSymbol(id);
    // në ekrane të vogla libraria mbulon planin: mbylle pasi zgjidhet simboli
    togglePanel('btnLibrary', 'library', false);
    syncUi();
    canvas.focus();
  }
});

function syncLibraryPressed(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-symbol]').forEach((b) => {
    b.setAttribute('aria-pressed', String(editor.tool === 'symbol' && editor.activeSymbol === b.dataset.symbol));
  });
}

// ---- skedarët ----

const fileInput = $<HTMLInputElement>('fileInput');
$('btnOpen').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  const f = fileInput.files?.[0];
  fileInput.value = '';
  if (!f) return;
  try {
    const doc = await readFile(f);
    store.replace(doc);
    fitAll();
    toast(t('toastOpened', { v: doc.name }));
  } catch (err) {
    toast((err as Error).message, true);
  }
});

let lastSaved = '';
async function save(): Promise<void> {
  try {
    const result = await saveFile(store.doc);
    if (result === 'saved') {
      lastSaved = JSON.stringify(store.doc);
      toast(t('toastSaved'));
      syncUi();
    }
  } catch (err) {
    toast((err as Error).message, true);
  }
}
$('btnSave').addEventListener('click', save);

const modal = $<HTMLDivElement>('confirmNew');
const newName = $<HTMLInputElement>('newName');
$('btnNew').addEventListener('click', () => {
  modal.hidden = false;
  newName.value = t('newDefault');
  newName.select();
  newName.focus();
});
$('confirmCancel').addEventListener('click', () => (modal.hidden = true));
$('confirmOk').addEventListener('click', () => {
  modal.hidden = true;
  store.replace(emptyDoc(newName.value.trim() || t('newDefault')));
  fitAll();
  setTool('wall');
  toast(t('toastNew'));
});
newName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('confirmOk').click();
  if (e.key === 'Escape') $('confirmCancel').click();
});

// ---- tastiera ----

const typing = (target: EventTarget | null) =>
  target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;

window.addEventListener('keydown', (e) => {
  if (!modal.hidden || typing(e.target)) return;
  const ctrl = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  if (ctrl && k === 'z' && !e.shiftKey) return void (e.preventDefault(), store.undo());
  if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) return void (e.preventDefault(), store.redo());
  if (ctrl && k === 's') return void (e.preventDefault(), save());
  if (ctrl && k === 'o') return void (e.preventDefault(), fileInput.click());
  if (ctrl && k === 'a') {
    e.preventDefault();
    store.setSelection(store.editable().map((x) => x.id));
    return;
  }
  if (e.key === 'F7') return void (e.preventDefault(), toggleChip('chipGrid', 'grid'));
  if (e.key === 'F8') return void (e.preventDefault(), toggleChip('chipOrtho', 'ortho'));
  if (e.key === 'F9') return void (e.preventDefault(), toggleChip('chipSnap', 'snap'));
  if (editor.keyDown(e)) {
    e.preventDefault();
    syncUi();
    return;
  }
  if (ctrl || e.altKey) return;
  if (k === 'w') setTool('wall');
  else if (k === 'v') setTool('select');
  else if (k === 'h') setTool('pan');
  else if (k === 'f') fitAll();
});
window.addEventListener('keyup', (e) => editor.keyUp(e));

// ---- vetitë ----

const WALL_ICON =
  '<svg viewBox="0 0 24 24" class="ic" style="color:#9CC5FF;width:30px;height:30px"><rect x="3" y="9" width="18" height="6"></rect><path d="M7 9v6M11 9v6M15 9v6M19 9v6"></path></svg>';
const THICKNESSES = [100, 120, 150, 200, 250, 300];

function thicknessOptions(current: number | null): string {
  const opts = THICKNESSES.map((v) => `<option value="${v}"${v === current ? ' selected' : ''}>${v / 10} cm</option>`);
  if (current === null) opts.unshift(`<option value="" selected>${esc(t('mixed'))}</option>`);
  else if (!THICKNESSES.includes(current)) opts.unshift(`<option value="${current}" selected>${current / 10} cm</option>`);
  return opts.join('');
}

function update<T extends Wall | SymbolEntity>(id: string, fn: (x: T) => void): void {
  store.commit((d) => {
    const x = d.entities.find((e) => e.id === id);
    if (x) fn(x as T);
  });
}

const numField = (id: string, label: string, value: number | string, step = '1') =>
  `<label class="field" for="${id}">${esc(label)}<input id="${id}" class="num" type="number" step="${step}" value="${value}"></label>`;

let propsKey = '';
function renderProps(): void {
  const sel = store.selected();
  const key = JSON.stringify([getLang(), store.doc.name, sel, store.doc.entities.length]);
  if (key === propsKey) return;
  propsKey = key;
  const el = $('props');

  if (sel.length === 0) {
    const walls = store.doc.entities.filter(isWall);
    const total = walls.reduce((s, w) => s + dist(w.a, w.b), 0);
    const symbols = store.doc.entities.length - walls.length;
    el.innerHTML = `
      <label class="field" for="propName">${esc(t('projectName'))}
        <input id="propName" type="text" value="${esc(store.doc.name)}">
      </label>
      <div class="stats">
        <div class="stat"><span>${esc(t('walls'))}</span><b>${walls.length}</b></div>
        <div class="stat"><span>${esc(t('symbolsCount'))}</span><b>${symbols}</b></div>
        <div class="stat wide"><span>${esc(t('wallLength'))}</span><b>${(total / 1000).toFixed(1)} m</b></div>
      </div>
      <p class="muted small">${esc(t('pickHint'))}</p>`;
    const input = $<HTMLInputElement>('propName');
    input.addEventListener('change', () => {
      const name = input.value.trim();
      if (name) store.commit((d) => void (d.name = name));
    });
    return;
  }

  if (sel.length === 1 && isSymbol(sel[0])) {
    const s = sel[0];
    const def = symbolDef(s.symbol);
    if (!def) return;
    el.innerHTML = `
      <div class="prop-head" style="--tile-color:${TILE_COLORS[def.layer] ?? '#9CC5FF'}">${symbolSvg(def)}
        <div><b>${esc(symName(def))}</b><span>${def.code} · ${esc(layerName(s.layer, s.layer))}</span></div></div>
      <div class="prop-grid">
        ${def.mount === 'wall' ? numField('propHeight', t('heightCm'), s.height ?? '') : `<div class="field">${esc(t('heightCm'))}<span class="static">${esc(t('ceiling'))}</span></div>`}
        ${numField('propPower', t('powerW'), s.power ?? '')}
        ${numField('propAngle', t('rotation'), normAngle(s.angle - 270), '90')}
      </div>
      <button class="btn danger" id="propDelete" type="button">${esc(t('deleteSymbol'))}</button>`;
    const onNum = (id: string, fn: (x: SymbolEntity, v: number | undefined) => void) =>
      $(id)?.addEventListener('change', (e) => {
        const raw = (e.target as HTMLInputElement).value;
        const v = raw === '' ? undefined : Number(raw);
        if (v !== undefined && !Number.isFinite(v)) return;
        update<SymbolEntity>(s.id, (x) => fn(x, v));
      });
    onNum('propHeight', (x, v) => (v === undefined ? delete x.height : (x.height = Math.max(0, Math.round(v)))));
    onNum('propPower', (x, v) => (v === undefined ? delete x.power : (x.power = Math.max(0, Math.round(v)))));
    onNum('propAngle', (x, v) => v !== undefined && (x.angle = normAngle(v + 270)));
    $('propDelete').addEventListener('click', () => editor.deleteSelection());
    return;
  }

  if (sel.length === 1 && isWall(sel[0])) {
    const w = sel[0];
    el.innerHTML = `
      <div class="prop-head">${WALL_ICON}<div><b>${esc(t('wall'))}</b><span>${esc(t('layer'))}: ${esc(layerName(w.layer, w.layer))}</span></div></div>
      <div class="prop-grid">
        ${numField('propLen', t('lengthCm'), Math.round(dist(w.a, w.b) / 10))}
        <label class="field" for="propThick">${esc(t('thicknessShort'))}
          <select id="propThick">${thicknessOptions(w.thickness)}</select>
        </label>
        ${numField('propAx', t('startX'), (w.a.x / 1000).toFixed(2), '0.01')}
        ${numField('propAy', t('startY'), (w.a.y / 1000).toFixed(2), '0.01')}
      </div>
      <button class="btn danger" id="propDelete" type="button">${esc(t('deleteWall'))}</button>`;
    $<HTMLInputElement>('propLen').addEventListener('change', (e) => {
      const cm = Number((e.target as HTMLInputElement).value);
      if (!(cm > 0)) return;
      update<Wall>(w.id, (x) => {
        const dir = sub(x.b, x.a);
        const l = len(dir) || 1;
        x.b = add(x.a, scale(dir, (cm * 10) / l));
      });
    });
    $<HTMLSelectElement>('propThick').addEventListener('change', (e) => {
      const v = Number((e.target as HTMLSelectElement).value);
      if (v > 0) update<Wall>(w.id, (x) => void (x.thickness = v));
    });
    const moveStart = (axis: 'x' | 'y') => (e: Event) => {
      const v = Number((e.target as HTMLInputElement).value);
      if (!Number.isFinite(v)) return;
      update<Wall>(w.id, (x) => {
        const d = v * 1000 - x.a[axis];
        x.a = { ...x.a, [axis]: x.a[axis] + d };
        x.b = { ...x.b, [axis]: x.b[axis] + d };
      });
    };
    $('propAx').addEventListener('change', moveStart('x'));
    $('propAy').addEventListener('change', moveStart('y'));
    $('propDelete').addEventListener('click', () => editor.deleteSelection());
    return;
  }

  const walls = sel.filter(isWall);
  const ts = new Set(walls.map((w) => w.thickness));
  const selLen = walls.reduce((s, w) => s + dist(w.a, w.b), 0);
  el.innerHTML = `
    <div class="prop-head">${WALL_ICON}<div><b>${esc(t('nSelected', { n: sel.length }))}</b>
      <span>${walls.length ? esc(t('total', { v: formatMeters(selLen) })) : ''}</span></div></div>
    ${walls.length ? `<label class="field" for="propThick">${esc(t('thicknessAll'))}
      <select id="propThick">${thicknessOptions(ts.size === 1 ? walls[0].thickness : null)}</select></label>` : ''}
    <button class="btn danger" id="propDelete" type="button">${esc(t('deleteN', { n: sel.length }))}</button>`;
  $('propThick')?.addEventListener('change', (e) => {
    const v = Number((e.target as HTMLSelectElement).value);
    if (!(v > 0)) return;
    const ids = new Set(walls.map((w) => w.id));
    store.commit((d) => d.entities.forEach((x) => isWall(x) && ids.has(x.id) && (x.thickness = v)));
  });
  $('propDelete').addEventListener('click', () => editor.deleteSelection());
}

// ---- lista e simboleve në plan ----

let summaryKey = '';
function renderSummary(): void {
  const counts = new Map<string, number>();
  for (const e of store.doc.entities) if (isSymbol(e)) counts.set(e.symbol, (counts.get(e.symbol) ?? 0) + 1);
  const key = JSON.stringify([getLang(), [...counts]]);
  if (key === summaryKey) return;
  summaryKey = key;
  if (counts.size === 0) {
    $('symbolSummary').innerHTML = `<p class="muted small">${esc(t('noSymbols'))}</p>`;
    return;
  }
  const rows = SYMBOLS.filter((d) => counts.has(d.id))
    .map((d) => `<tr><td class="code">${d.code}</td><td>${esc(symName(d))}</td><td class="qty">${counts.get(d.id)}</td></tr>`)
    .join('');
  $('symbolSummary').innerHTML = `<table class="summary"><thead><tr><th>${esc(t('code'))}</th><th></th><th class="qty">${esc(t('qty'))}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ---- shtresat ----

const EYE =
  '<svg class="ic" viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
const EYE_OFF =
  '<svg class="ic" viewBox="0 0 24 24"><path d="M3 3l18 18"></path><path d="M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.6M6.6 6.6C3.8 8.4 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6"></path></svg>';
const LOCK =
  '<svg class="ic" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>';
const UNLOCK =
  '<svg class="ic" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 7.5-2"></path></svg>';

let layersKey = '';
function renderLayers(): void {
  const counts = new Map<string, number>();
  for (const e of store.doc.entities) counts.set(e.layer, (counts.get(e.layer) ?? 0) + 1);
  const key = JSON.stringify([getLang(), store.doc.layers, [...counts]]);
  if (key === layersKey) return;
  layersKey = key;
  $('layers').innerHTML = store.doc.layers
    .map((l, i) => {
      const name = esc(layerName(l.id, l.name));
      return `<li class="${l.visible ? '' : 'off'}">
        <button class="icon-btn" type="button" data-vis="${i}" aria-pressed="${l.visible}" aria-label="${esc(t(l.visible ? 'hide' : 'show'))} ${name}">${l.visible ? EYE : EYE_OFF}</button>
        <span class="sw" style="background:${layerColor(l.id)}"></span>
        <span class="name">${name}</span>
        <span class="count">${counts.get(l.id) ?? 0}</span>
        <button class="icon-btn" type="button" data-lock="${i}" aria-pressed="${!l.locked}" aria-label="${esc(t(l.locked ? 'unlock' : 'lock'))} ${name}">${l.locked ? LOCK : UNLOCK}</button>
      </li>`;
    })
    .join('');
}
$('layers').addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn) return;
  const vis = btn.dataset.vis;
  const lock = btn.dataset.lock;
  store.commit((d) => {
    if (vis !== undefined) d.layers[+vis].visible = !d.layers[+vis].visible;
    if (lock !== undefined) d.layers[+lock].locked = !d.layers[+lock].locked;
  });
});

// ---- statusi ----

const hint = $('hint');
const SNAP_KEYS = { endpoint: 'snapEndpoint', midpoint: 'snapMidpoint', grid: 'snapGrid', wall: 'snapWall' } as const;

function updateStatus(): void {
  const p = editor.cursorWorld;
  $('stCoords').textContent = `X ${(p.x / 1000).toFixed(2)} m · Y ${(p.y / 1000).toFixed(2)} m`;
  const sk = editor.snapKind;
  $('stSnap').textContent = (editor.tool === 'wall' || editor.tool === 'symbol') && sk !== 'none' ? t(SNAP_KEYS[sk]) : '';
  $('stZoom').textContent = `1 m = ${Math.round(vp.scale * 1000)} px`;

  const def = editor.activeSymbol ? symbolDef(editor.activeSymbol) : undefined;
  const info =
    editor.tool === 'symbol' && def
      ? t('infoSymbol', { name: symName(def) })
      : t(editor.tool === 'wall' ? 'infoWall' : editor.tool === 'pan' ? 'infoPan' : 'infoSelect');
  $('stInfo').textContent = info;

  if (editor.tool === 'wall') {
    hint.hidden = false;
    if (!editor.chainStart) hint.textContent = t('hintWallStart', { v: editor.settings.wallThickness / 10 });
    else hint.innerHTML = editor.typed ? t('hintWallTyped', { v: esc(editor.typed) }) : t('hintWallNext');
  } else if (editor.tool === 'symbol' && def) {
    hint.hidden = false;
    hint.innerHTML = t('hintSymbol', { code: def.code, name: esc(symName(def)) });
  } else {
    hint.hidden = true;
  }
}

function syncUi(): void {
  toolButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === editor.tool)));
  canvas.className = `tool-${editor.tool}`;
  $<HTMLButtonElement>('btnUndo').disabled = !store.canUndo;
  $<HTMLButtonElement>('btnRedo').disabled = !store.canRedo;
  $<HTMLButtonElement>('btnDelete').disabled = store.selection.size === 0;
  $('docName').textContent = store.doc.name;
  const dirty = JSON.stringify(store.doc) !== lastSaved;
  $('stSaved').textContent = t(dirty ? 'savedAuto' : 'savedFile');
  syncLibraryPressed();
  renderProps();
  renderSummary();
  renderLayers();
  updateStatus();
}

// ---- ruajtja automatike ----

let autosaveTimer = 0;
store.subscribe(() => {
  syncUi();
  scheduleRender();
  clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(() => writeAutosave(store.doc), 400);
});

// ---- njoftimet ----

const toastEl = $('toast');
let toastTimer = 0;
function toast(msg: string, error = false): void {
  toastEl.textContent = msg;
  toastEl.classList.toggle('error', error);
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toastEl.hidden = true), error ? 5000 : 2500);
}

applyLang(storedLang());
resize();
