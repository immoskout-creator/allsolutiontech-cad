import { CABLE_LAYER, DIM_LAYER, DRAW_LAYER, OPENING_LAYER, ROOM_LAYER, WALL_LAYER, type Doc } from './types';

/**
 * Shtresat me "sy": grupet që hapen/mbyllen me një klikim. Ajo që mbyllet nuk del as në ekran,
 * as në printim, PDF, DXF, SVG apo PNG. Pamjet e ruajtura mbajnë mend cilat grupe janë të mbyllura.
 */
export type ViewGroup = 'walls' | 'elements' | 'cables' | 'dims' | 'coverage' | 'texts' | 'grid';
export const VIEW_GROUPS: ViewGroup[] = ['walls', 'elements', 'cables', 'dims', 'coverage', 'texts', 'grid'];

/** Grupet që nuk janë shtresa: ruhen te doc.viewOff (rrjeta ruhet te cilësimet e programit). */
export type FlagGroup = 'coverage' | 'texts';

export interface SavedView {
  id: string;
  name: string;
  /** Grupet e mbyllura në këtë pamje. */
  hidden: ViewGroup[];
}

/** Pamjet e gatshme: emri vjen nga përkthimi sipas id. */
export const BUILTIN_VIEWS: SavedView[] = [
  { id: 'all', name: '', hidden: [] },
  { id: 'dims', name: '', hidden: ['cables', 'grid', 'coverage'] },
  { id: 'cables', name: '', hidden: ['dims'] },
];

const WALL_GROUP = [WALL_LAYER, OPENING_LAYER, ROOM_LAYER, DRAW_LAYER];
const OTHER = new Set([...WALL_GROUP, CABLE_LAYER, DIM_LAYER, 'tekstet']);

/** Shtresat e projektit që i përkasin grupit (bosh për rrjetën dhe zonat). */
export function groupLayers(doc: Doc, g: ViewGroup): string[] {
  const ids = doc.layers.map((l) => l.id);
  switch (g) {
    case 'walls':
      return ids.filter((id) => WALL_GROUP.includes(id));
    case 'elements':
      return ids.filter((id) => !OTHER.has(id));
    case 'cables':
      return ids.filter((id) => id === CABLE_LAYER);
    case 'dims':
      return ids.filter((id) => id === DIM_LAYER);
    case 'texts':
      return ids.filter((id) => id === 'tekstet');
    default:
      return [];
  }
}

export const isFlag = (g: ViewGroup): g is FlagGroup => g === 'coverage' || g === 'texts';

/** A është i hapur grupi (syri hapur). */
export function groupOn(doc: Doc, g: ViewGroup, grid: boolean): boolean {
  if (g === 'grid') return grid;
  if (isFlag(g)) return !(doc.viewOff ?? []).includes(g);
  const ls = groupLayers(doc, g);
  return ls.length === 0 || doc.layers.some((l) => ls.includes(l.id) && l.visible);
}

/** Hap ose mbyll grupin në dokument (rrjeta nuk preket këtu). */
export function setGroup(doc: Doc, g: ViewGroup, on: boolean): void {
  if (g === 'grid') return;
  if (isFlag(g)) {
    const off = new Set(doc.viewOff ?? []);
    if (on) off.delete(g);
    else off.add(g);
    if (g === 'texts') for (const l of doc.layers) if (l.id === 'tekstet') l.visible = on;
    if (off.size) doc.viewOff = [...off].sort();
    else delete doc.viewOff;
    return;
  }
  const ls = new Set(groupLayers(doc, g));
  for (const l of doc.layers) if (ls.has(l.id)) l.visible = on;
}

/** Grupet e mbyllura tani. */
export function hiddenGroups(doc: Doc, grid: boolean): ViewGroup[] {
  return VIEW_GROUPS.filter((g) => !groupOn(doc, g, grid));
}

/** Vendos pamjen: grupet e listës mbyllen, të tjerat hapen. */
export function applyView(doc: Doc, hidden: ViewGroup[]): void {
  for (const g of VIEW_GROUPS) setGroup(doc, g, !hidden.includes(g));
}

/** Kopje e dokumentit me pamjen e zgjedhur (për PDF me shumë faqe). */
export function docWithView(doc: Doc, hidden: ViewGroup[]): Doc {
  const d: Doc = { ...doc, layers: doc.layers.map((l) => ({ ...l })), viewOff: doc.viewOff ? [...doc.viewOff] : undefined };
  applyView(d, hidden);
  return d;
}

/** Pamjet e projektit: të gatshmet dhe ato të ruajtura nga përdoruesi. */
export function allViews(doc: Doc): SavedView[] {
  return [...BUILTIN_VIEWS, ...(doc.views ?? [])];
}

export function parseViews(raw: unknown): SavedView[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedView[] = [];
  for (const x of raw) {
    const v = x as Partial<SavedView> | null;
    if (!v || typeof v.id !== 'string' || typeof v.name !== 'string' || !v.name.trim() || !Array.isArray(v.hidden)) continue;
    if (BUILTIN_VIEWS.some((b) => b.id === v.id)) continue;
    out.push({ id: v.id, name: v.name.trim().slice(0, 60), hidden: VIEW_GROUPS.filter((g) => v.hidden!.includes(g)) });
  }
  return out.slice(0, 40);
}

export function parseViewOff(raw: unknown): FlagGroup[] {
  return Array.isArray(raw) ? (['coverage', 'texts'] as FlagGroup[]).filter((g) => raw.includes(g)) : [];
}
