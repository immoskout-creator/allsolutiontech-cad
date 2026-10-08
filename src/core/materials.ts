import { calcAll, cableRunLength, cableText } from './circuits';
import { isCable, isSymbol, type CircuitKind, type Doc, type Vec } from './types';
import { allSymbols, type SymbolDef } from '../symbols/library';

/** Rezerva që i shtohet gjatësisë së kabllove në listën e materialeve. */
export const CABLE_RESERVE = 0.1;

export interface SymbolLine {
  def: SymbolDef;
  qty: number;
}

export interface CableLine {
  /** Seksioni, mm²; null për kabllot pa qark. */
  section: number | null;
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

export interface Materials {
  symbols: SymbolLine[];
  cables: CableLine[];
  breakers: BreakerLine[];
}

/** Lakorja e siguresës: B për ndriçim e priza, C për pajisjet me rrymë ndezjeje. */
export const curveFor = (kind: CircuitKind): 'B' | 'C' => (kind === 'appliance' ? 'C' : 'B');

/** Simbolet e vendosura në plan, me sasitë, sipas renditjes së librarisë. */
export function usedSymbols(doc: Doc): SymbolLine[] {
  const counts = new Map<string, number>();
  for (const e of doc.entities) if (isSymbol(e)) counts.set(e.symbol, (counts.get(e.symbol) ?? 0) + 1);
  return allSymbols()
    .filter((d) => counts.has(d.id))
    .map((def) => ({ def, qty: counts.get(def.id)! }));
}

export function materialList(doc: Doc, centers: Map<string, Vec>): Materials {
  const symbols = doc.entities.filter(isSymbol);
  const cables = doc.entities.filter(isCable);
  const results = calcAll(doc, centers);
  const byId = new Map(results.map((r) => [r.circuit.id, r]));

  // kabllot grupohen sipas llojit që del nga llogaritja e qarkut të tyre
  const cableMap = new Map<string, CableLine>();
  for (const k of cables) {
    const r = k.circuit ? byId.get(k.circuit) : undefined;
    const section = r ? r.section : null;
    const phases = r ? r.circuit.phases : 1;
    const key = section === null ? 'none' : `${phases}:${section}`;
    const line = cableMap.get(key) ?? { section, phases, length: 0, qty: 0 };
    line.length += cableRunLength(k, symbols, centers) / 1000;
    cableMap.set(key, line);
  }
  const cableLines = [...cableMap.values()]
    .map((l) => ({ ...l, qty: Math.ceil(l.length * (1 + CABLE_RESERVE)) }))
    .filter((l) => l.length > 0)
    .sort((a, b) => (a.section ?? Infinity) - (b.section ?? Infinity) || a.phases - b.phases);

  const brMap = new Map<string, BreakerLine>();
  for (const r of results) {
    const curve = curveFor(r.circuit.kind);
    const key = `${curve}${r.breaker}:${r.circuit.phases}`;
    const line = brMap.get(key) ?? { curve, amps: r.breaker, phases: r.circuit.phases, qty: 0 };
    line.qty++;
    brMap.set(key, line);
  }
  const breakers = [...brMap.values()].sort((a, b) => a.phases - b.phases || a.amps - b.amps || a.curve.localeCompare(b.curve));

  return { symbols: usedSymbols(doc), cables: cableLines, breakers };
}

/** Përshkrimi i kabllos pa gjuhë: "3×2.5 mm²". */
export function cableSpec(l: CableLine): string {
  return l.section === null ? '' : cableText(l.section, l.phases);
}

/** Përshkrimi i siguresës pa gjuhë: "B16 1P+N" ose "C32 3P+N". */
export function breakerSpec(b: BreakerLine): string {
  return `${b.curve}${b.amps} ${b.phases === 3 ? '3P+N' : '1P+N'}`;
}
