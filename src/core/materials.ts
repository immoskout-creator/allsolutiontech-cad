import { calcAll, cableRunLength, cableText } from './circuits';
import { isCable, isDrawing, isOpening, isSymbol, type CircuitKind, type Doc, type Vec, type WindowSash } from './types';
import { DEFAULT_STAIR, type StairType } from './drawings';
import { doorKind, openingHeight, type DoorKind } from './openings';
import { allSymbols, type SymbolDef } from '../symbols/library';
import { cableTypeOf, isSystemKind, type SystemKind } from './systems';
import { cameraModel, recorderModel } from './coverage';
import { emModel } from './emergency';

/** Rezerva që i shtohet gjatësisë së kabllove në listën e materialeve. */
export const CABLE_RESERVE = 0.1;

export interface SymbolLine {
  def: SymbolDef;
  qty: number;
  /** Modeli i kamerës, kur është zgjedhur (p.sh. "Bullet 4MP · 4 mm"). */
  model?: string;
}

export interface CableLine {
  /** Seksioni, mm²; null për kabllot pa qark dhe ato të sistemeve. */
  section: number | null;
  /** Sistemi dhe kablloja e tij, p.sh. "U/UTP Cat6" (vetëm për kamerat, rrjetin, zjarrin). */
  system?: SystemKind;
  type?: string;
  phases: 1 | 3;
  /** Gjatësia e matur me zbritjet, m. */
  length: number;
  /** Sasia për porosi me rezervën, m (e rrumbullakosur lart). */
  qty: number;
}

export interface BreakerLine {
  curve: 'B' | 'C';
  amps: number;
  phases: 1 | 3;
  qty: number;
}

/** Pjesë që dalin nga linjat e sistemeve: konektorët RJ45 dhe rezistencat e fundit të zonës. */
export interface ExtraLine {
  id: 'rj45' | 'eol';
  system: SystemKind;
  qty: number;
}

/** Dyert dhe dritaret sipas llojit dhe masave (gjerësi × lartësi, mm). */
export interface OpeningLine {
  type: 'door' | 'window';
  /** Dera: lloji (një/dy kanate, rrëshqitëse, palosëse, brenda murit, hyrëse). Dritarja: krahët. */
  kind: DoorKind | WindowSash;
  width: number;
  height: number;
  qty: number;
}

/** Shkallët sipas modelit, gjerësisë dhe numrit të shkallëve. */
export interface StairLine {
  type: StairType;
  width: number;
  steps: number;
  qty: number;
}

export interface Materials {
  symbols: SymbolLine[];
  cables: CableLine[];
  breakers: BreakerLine[];
  extras: ExtraLine[];
  openings: OpeningLine[];
  stairs: StairLine[];
}

/** Dyert, dritaret dhe shkallët e planit, të grupuara: dyert para dritareve, nga më e ngushta. */
export function buildingLines(doc: Doc): { openings: OpeningLine[]; stairs: StairLine[] } {
  const om = new Map<string, OpeningLine>();
  for (const o of doc.entities) {
    if (!isOpening(o)) continue;
    const kind = o.type === 'door' ? doorKind(o) : (o.sash ?? 'fixed');
    const height = openingHeight(o);
    const key = `${o.type}:${kind}:${o.width}:${height}`;
    const line = om.get(key) ?? { type: o.type, kind, width: o.width, height, qty: 0 };
    line.qty++;
    om.set(key, line);
  }
  const sm = new Map<string, StairLine>();
  for (const d of doc.entities) {
    if (!isDrawing(d) || d.shape !== 'stair') continue;
    const st = d.stair ?? DEFAULT_STAIR;
    const key = `${st.type}:${st.width}:${st.steps}`;
    const line = sm.get(key) ?? { type: st.type, width: st.width, steps: st.steps, qty: 0 };
    line.qty++;
    sm.set(key, line);
  }
  return {
    openings: [...om.values()].sort((a, b) => (a.type === b.type ? 0 : a.type === 'door' ? -1 : 1) || a.width - b.width || a.height - b.height || String(a.kind).localeCompare(String(b.kind))),
    stairs: [...sm.values()],
  };
}

/** Lakorja e siguresës: B për ndriçim e priza, C për pajisjet me rrymë ndezjeje. */
export const curveFor = (kind: CircuitKind): 'B' | 'C' => (kind === 'appliance' ? 'C' : 'B');

/** Simbolet e vendosura në plan, me sasitë, sipas renditjes së librarisë; kamerat ndahen sipas modelit. */
export function usedSymbols(doc: Doc): SymbolLine[] {
  const counts = new Map<string, Map<string, number>>();
  for (const e of doc.entities) {
    if (!isSymbol(e)) continue;
    const model = cameraModel(e)?.name ?? recorderModel(e)?.name ?? emModel(e)?.name ?? '';
    const byModel = counts.get(e.symbol) ?? new Map<string, number>();
    byModel.set(model, (byModel.get(model) ?? 0) + 1);
    counts.set(e.symbol, byModel);
  }
  return allSymbols().flatMap((def) =>
    [...(counts.get(def.id) ?? new Map<string, number>())]
      .sort(([a], [b]) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)))
      .map(([model, qty]) => (model ? { def, qty, model } : { def, qty })),
  );
}

export function materialList(doc: Doc, centers: Map<string, Vec>): Materials {
  const symbols = doc.entities.filter(isSymbol);
  const cables = doc.entities.filter(isCable);
  const results = calcAll(doc, centers);
  const byId = new Map(results.map((r) => [r.circuit.id, r]));

  // kabllot grupohen sipas llojit që del nga llogaritja e qarkut të tyre
  const cableMap = new Map<string, CableLine>();
  const extras = new Map<string, ExtraLine>();
  const addExtra = (id: ExtraLine['id'], system: SystemKind, qty: number) => {
    const line = extras.get(`${id}:${system}`) ?? { id, system, qty: 0 };
    line.qty += qty;
    extras.set(`${id}:${system}`, line);
  };
  for (const k of cables) {
    const r = k.circuit ? byId.get(k.circuit) : undefined;
    const length = cableRunLength(k, symbols, centers) / 1000;
    let key: string;
    let base: CableLine;
    if (r && isSystemKind(r.circuit.kind)) {
      const type = cableTypeOf(r.circuit);
      key = `sys:${r.circuit.kind}:${type.id}`;
      base = { section: null, phases: 1, system: r.circuit.kind, type: type.spec, length: 0, qty: 0 };
      if (type.rj45 && length > 0) addExtra('rj45', r.circuit.kind, 2);
    } else {
      const section = r ? r.section : null;
      const phases = r ? r.circuit.phases : 1;
      key = section === null ? 'none' : `${phases}:${section}`;
      base = { section, phases, length: 0, qty: 0 };
    }
    const line = cableMap.get(key) ?? base;
    line.length += length;
    cableMap.set(key, line);
  }
  // çdo zonë zjarri me pajisje mbyllet me një rezistencë në fund
  for (const r of results) if (r.circuit.kind === 'fire' && r.points > 0) addExtra('eol', 'fire', 1);
  const cableLines = [...cableMap.values()]
    .map((l) => ({ ...l, qty: Math.ceil(l.length * (1 + CABLE_RESERVE)) }))
    .filter((l) => l.length > 0)
    .sort((a, b) => Number(!!a.system) - Number(!!b.system) || (a.section ?? Infinity) - (b.section ?? Infinity) || a.phases - b.phases);

  const brMap = new Map<string, BreakerLine>();
  for (const r of results) {
    if (r.system) continue;
    const curve = curveFor(r.circuit.kind);
    const key = `${curve}${r.breaker}:${r.circuit.phases}`;
    const line = brMap.get(key) ?? { curve, amps: r.breaker, phases: r.circuit.phases, qty: 0 };
    line.qty++;
    brMap.set(key, line);
  }
  const breakers = [...brMap.values()].sort((a, b) => a.phases - b.phases || a.amps - b.amps || a.curve.localeCompare(b.curve));

  return { symbols: usedSymbols(doc), cables: cableLines, breakers, extras: [...extras.values()], ...buildingLines(doc) };
}

/** Përshkrimi i kabllos pa gjuhë: "3×2.5 mm²". */
export function cableSpec(l: CableLine): string {
  if (l.type) return l.type;
  return l.section === null ? '' : cableText(l.section, l.phases);
}

/** Përshkrimi i siguresës pa gjuhë: "B16 1P+N" ose "C32 3P+N". */
export function breakerSpec(b: BreakerLine): string {
  return `${b.curve}${b.amps} ${b.phases === 3 ? '3P+N' : '1P+N'}`;
}
