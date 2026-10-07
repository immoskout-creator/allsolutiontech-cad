import { Store } from './core/store';
import { emptyDoc, type Doc, type Wall } from './core/types';
import { add, dist, formatMeters, len, scale, sub } from './core/geometry';
import { sampleDoc } from './core/sample';
import { Viewport } from './view/viewport';
import { render } from './view/renderer';
import { Editor, type ToolId } from './tools/editor';
import { loadAutosave, readFile, saveFile, writeAutosave } from './io/files';

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
  const es = store.doc.entities;
  if (es.length === 0) {
    vp.fit({ minX: 0, minY: 0, maxX: 12000, maxY: 8000 });
  } else {
    const xs = es.flatMap((e) => [e.a.x, e.b.x]);
    const ys = es.flatMap((e) => [e.a.y, e.b.y]);
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
function setTool(t: ToolId): void {
  editor.setTool(t);
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

$('btnPanels').addEventListener('click', () => {
  const open = app.dataset.panels !== 'open';
  app.dataset.panels = open ? 'open' : '';
  $('btnPanels').setAttribute('aria-expanded', String(open));
});

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
    toast(`U hap: ${doc.name}`);
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
      toast('Projekti u ruajt si skedar.');
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
  newName.value = 'Projekt i ri';
  newName.select();
  newName.focus();
});
$('confirmCancel').addEventListener('click', () => (modal.hidden = true));
$('confirmOk').addEventListener('click', () => {
  modal.hidden = true;
  store.replace(emptyDoc(newName.value.trim() || 'Projekt i ri'));
  fitAll();
  setTool('wall');
  toast('Projekti i ri është gati. Vizato muret.');
});
newName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('confirmOk').click();
  if (e.key === 'Escape') $('confirmCancel').click();
});

// ---- tastiera ----

const typing = (t: EventTarget | null) =>
  t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement;

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
    return;
  }
  if (ctrl || e.altKey) return;
  if (k === 'w') setTool('wall');
  else if (k === 'v') setTool('select');
  else if (k === 'h') setTool('pan');
  else if (k === 'f') fitAll();
});
window.addEventListener('keyup', (e) => editor.keyUp(e));

// ---- panelet ----

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const WALL_ICON =
  '<svg viewBox="0 0 24 24" class="ic" style="color:#9CC5FF"><rect x="3" y="9" width="18" height="6"></rect><path d="M7 9v6M11 9v6M15 9v6M19 9v6"></path></svg>';
const THICKNESSES = [100, 120, 150, 200, 250, 300];

function thicknessOptions(current: number | null): string {
  const opts = THICKNESSES.map((t) => `<option value="${t}"${t === current ? ' selected' : ''}>${t / 10} cm</option>`);
  if (current === null) opts.unshift('<option value="" selected>Të ndryshme</option>');
  else if (!THICKNESSES.includes(current)) opts.unshift(`<option value="${current}" selected>${current / 10} cm</option>`);
  return opts.join('');
}

let propsKey = '';
function renderProps(): void {
  const sel = store.selected();
  const key = JSON.stringify([store.doc.name, sel, store.doc.entities.length]);
  if (key === propsKey) return;
  propsKey = key;
  const el = $('props');
  const walls = store.doc.entities;
  const total = walls.reduce((s, w) => s + dist(w.a, w.b), 0);

  if (sel.length === 0) {
    el.innerHTML = `
      <label class="field" for="propName">Emri i projektit
        <input id="propName" type="text" value="${esc(store.doc.name)}">
      </label>
      <div class="stats">
        <div class="stat"><span>Mure</span><b>${walls.length}</b></div>
        <div class="stat"><span>Gjatësia e mureve</span><b>${(total / 1000).toFixed(1)} m</b></div>
      </div>
      <p class="muted small">Zgjidh një mur për t'i parë dhe ndryshuar vetitë.</p>`;
    const input = $<HTMLInputElement>('propName');
    input.addEventListener('change', () => {
      const name = input.value.trim();
      if (name) store.commit((d) => void (d.name = name));
    });
    return;
  }

  if (sel.length === 1) {
    const w = sel[0];
    el.innerHTML = `
      <div class="prop-head">${WALL_ICON}<div><b>Mur</b><span>Shtresa: Muret</span></div></div>
      <div class="prop-grid">
        <label class="field" for="propLen">Gjatësia (cm)
          <input id="propLen" class="num" type="number" min="1" step="1" value="${Math.round(dist(w.a, w.b) / 10)}">
        </label>
        <label class="field" for="propThick">Trashësia
          <select id="propThick">${thicknessOptions(w.thickness)}</select>
        </label>
        <label class="field" for="propAx">Fillimi X (m)
          <input id="propAx" class="num" type="number" step="0.01" value="${(w.a.x / 1000).toFixed(2)}">
        </label>
        <label class="field" for="propAy">Fillimi Y (m)
          <input id="propAy" class="num" type="number" step="0.01" value="${(w.a.y / 1000).toFixed(2)}">
        </label>
      </div>
      <button class="btn danger" id="propDelete" type="button">Fshi murin</button>`;
    const update = (fn: (x: Wall) => void) =>
      store.commit((d) => {
        const x = d.entities.find((e) => e.id === w.id);
        if (x) fn(x);
      });
    $<HTMLInputElement>('propLen').addEventListener('change', (e) => {
      const cm = Number((e.target as HTMLInputElement).value);
      if (!(cm > 0)) return;
      update((x) => {
        const dir = sub(x.b, x.a);
        const l = len(dir) || 1;
        x.b = add(x.a, scale(dir, (cm * 10) / l));
      });
    });
    $<HTMLSelectElement>('propThick').addEventListener('change', (e) => {
      const t = Number((e.target as HTMLSelectElement).value);
      if (t > 0) update((x) => void (x.thickness = t));
    });
    const moveStart = (axis: 'x' | 'y') => (e: Event) => {
      const v = Number((e.target as HTMLInputElement).value);
      if (!Number.isFinite(v)) return;
      update((x) => {
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

  const ts = new Set(sel.map((w) => w.thickness));
  const selLen = sel.reduce((s, w) => s + dist(w.a, w.b), 0);
  el.innerHTML = `
    <div class="prop-head">${WALL_ICON}<div><b>${sel.length} mure të zgjedhura</b><span>Gjithsej ${formatMeters(selLen)}</span></div></div>
    <label class="field" for="propThick">Trashësia për të gjitha
      <select id="propThick">${thicknessOptions(ts.size === 1 ? sel[0].thickness : null)}</select>
    </label>
    <button class="btn danger" id="propDelete" type="button">Fshi ${sel.length} muret</button>`;
  $<HTMLSelectElement>('propThick').addEventListener('change', (e) => {
    const t = Number((e.target as HTMLSelectElement).value);
    if (!(t > 0)) return;
    const ids = new Set(sel.map((w) => w.id));
    store.commit((d) => d.entities.forEach((x) => ids.has(x.id) && (x.thickness = t)));
  });
  $('propDelete').addEventListener('click', () => editor.deleteSelection());
}

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
  const key = JSON.stringify([store.doc.layers, [...counts]]);
  if (key === layersKey) return;
  layersKey = key;
  $('layers').innerHTML = store.doc.layers
    .map(
      (l, i) => `<li class="${l.visible ? '' : 'off'}">
        <button class="icon-btn" type="button" data-vis="${i}" aria-pressed="${l.visible}" aria-label="${l.visible ? 'Fshih' : 'Shfaq'} ${esc(l.name)}">${l.visible ? EYE : EYE_OFF}</button>
        <span class="sw" style="background:${l.color}"></span>
        <span class="name">${esc(l.name)}</span>
        <span class="count">${counts.get(l.id) ?? 0}</span>
        <button class="icon-btn" type="button" data-lock="${i}" aria-pressed="${!l.locked}" aria-label="${l.locked ? 'Zhblloko' : 'Blloko'} ${esc(l.name)}">${l.locked ? LOCK : UNLOCK}</button>
      </li>`,
    )
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
const TOOL_INFO: Record<ToolId, string> = {
  select: 'Kliko një mur për ta zgjedhur, tërhiq për ta lëvizur. Tërhiq në bosh për të zgjedhur disa.',
  wall: 'Kliko për pikën e parë, pastaj për çdo cep. Esc ose kliko djathtas për të mbaruar.',
  pan: 'Tërhiq për të lëvizur pamjen. Rrota e miut zmadhon.',
};
const SNAP_NAMES = { endpoint: 'Snap: fund muri', midpoint: 'Snap: mesi i murit', grid: 'Snap: rrjeta', none: '' };

function updateStatus(): void {
  const p = editor.cursorWorld;
  $('stCoords').textContent = `X ${(p.x / 1000).toFixed(2)} m · Y ${(p.y / 1000).toFixed(2)} m`;
  $('stSnap').textContent = editor.tool === 'wall' ? SNAP_NAMES[editor.snapKind] : '';
  $('stZoom').textContent = `1 m = ${Math.round(vp.scale * 1000)} px`;
  $('stInfo').textContent = TOOL_INFO[editor.tool];

  if (editor.tool === 'wall' && editor.chainStart) {
    hint.hidden = false;
    hint.innerHTML = editor.typed
      ? `Gjatësia: <b>${esc(editor.typed)} cm</b> · Enter për ta vendosur`
      : 'Shkruaj gjatësinë në cm (p.sh. <b>430</b>) dhe shtyp Enter, ose kliko pikën tjetër.';
  } else if (editor.tool === 'wall') {
    hint.hidden = false;
    hint.textContent = 'Kliko për të filluar murin. Trashësia: ' + editor.settings.wallThickness / 10 + ' cm';
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
  $('stSaved').textContent = dirty ? 'Ruajtur automatikisht në këtë shfletues' : 'Ruajtur në skedar';
  renderProps();
  renderLayers();
  updateStatus();
}

// ---- ruajtja automatike ----

let autosaveTimer = 0;
store.subscribe(() => {
  syncUi();
  scheduleRender();
  clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(() => writeAutosave(store.doc as Doc), 400);
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

syncUi();
resize();
