import { dist } from './geometry';
import { isCable, isSymbol, type Cable, type Circuit, type CircuitKind, type Doc, type SymbolEntity, type Vec } from './types';
import { symbolDef } from '../symbols/library';
import { ZONE_MAX_DEVICES, cableTypeOf, circuitPrefix, isSystemKind } from './systems';

/**
 * Llogaritja e qarqeve sipas IEC 60364 (bakër, izolim PVC, tub në mur, metoda B2):
 * ngarkesa → rryma e projektimit Ib → siguresa In (Ib ≤ In) → seksioni me Iz ≥ In → rënia e tensionit.
 */

export const VOLTAGE = { 1: 230, 3: 400 } as const;
/** Rezistiviteti i bakrit në temperaturën e punës, Ω·mm²/m. */
export const RHO_CU = 0.0225;
/** Siguresat standarde, A. */
export const BREAKERS = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63];
/** Seksionet standarde, mm². */
export const SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25];
/** Kapaciteti Iz (A), metoda B2, PVC: me 2 dhe 3 përcjellës nën ngarkesë. */
const IZ: Record<1 | 3, number[]> = {
  1: [16.5, 23, 30, 38, 52, 69, 90],
  3: [15, 20, 27, 34, 46, 62, 80],
};
/** Kufiri i rënies së tensionit, %. */
export const DROP_LIMIT: Record<CircuitKind, number> = { lighting: 3, sockets: 5, appliance: 5, cctv: 0, network: 0, fire: 0, emergency: 0 };
/** Minimumi i zakonshëm sipas llojit. */
const MIN_BREAKER: Record<string, number> = { lighting: 10, sockets: 16, appliance: 10 };
const MIN_SECTION: Record<string, number> = { lighting: 1.5, sockets: 2.5, appliance: 1.5 };
/** Ngarkesa e supozuar për një prizë pa fuqi të shënuar, W. */
export const SOCKET_W = 200;
/** Lartësia e tavanit ku kalojnë kabllot, cm. */
export const CEILING_CM = 270;
/** Sa afër (mm) duhet të jetë fundi i kabllos që të llogaritet si i lidhur me simbolin. */
export const LINK_MM = 150;

export const CIRCUIT_COLORS = ['#DC2626', '#2563EB', '#16A34A', '#D97706', '#7C3AED', '#0891B2', '#DB2777', '#65A30D', '#EA580C', '#4F46E5'];

export function newCircuit(existing: Circuit[], kind: CircuitKind, label: string, id: string): Circuit {
  return { id, name: freeName(existing, kind), label, kind, phases: 1, color: CIRCUIT_COLORS[existing.length % CIRCUIT_COLORS.length] };
}

/** Emri i parë i lirë për llojin: Q1, Q2... ose CAM1, NET1, FA1. */
export function freeName(existing: Circuit[], kind: CircuitKind): string {
  const used = new Set(existing.map((c) => c.name));
  const prefix = circuitPrefix(kind);
  let n = 1;
  while (used.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

/** Gjatësia e kabllos në plan, mm. */
export function cableLength(c: Pick<Cable, 'points'>): number {
  let s = 0;
  for (let i = 1; i < c.points.length; i++) s += dist(c.points[i - 1], c.points[i]);
  return s;
}

/**
 * Zbritja vertikale te një fund kabllo: nga tavani deri te simboli i murit, mm.
 * Simbolet e tavanit dhe fundet e lira nuk shtojnë gjë.
 */
function dropAt(p: Vec, symbols: SymbolEntity[], centers: Map<string, Vec>): number {
  let best: { s: SymbolEntity; d: number } | null = null;
  for (const s of symbols) {
    const d = Math.min(dist(p, s.pos), dist(p, centers.get(s.id) ?? s.pos));
    if (d <= LINK_MM && (!best || d < best.d)) best = { s, d };
  }
  if (!best) return 0;
  const def = symbolDef(best.s.symbol);
  if (!def || def.mount !== 'wall') return 0;
  const h = best.s.height ?? def.height ?? 0;
  return Math.max(0, CEILING_CM - h) * 10;
}

/** Gjatësia e kabllos me zbritjet nëpër mur, mm. */
export function cableRunLength(c: Pick<Cable, 'points'>, symbols: SymbolEntity[], centers: Map<string, Vec>): number {
  if (c.points.length < 2) return 0;
  return cableLength(c) + dropAt(c.points[0], symbols, centers) + dropAt(c.points[c.points.length - 1], symbols, centers);
}

/** Fuqia e një pike në qark, W. */
export function pointPower(s: SymbolEntity): number {
  if (s.power !== undefined) return s.power;
  const def = symbolDef(s.symbol);
  if (def?.power !== undefined) return def.power;
  return def?.category === 'priza' ? SOCKET_W : 0;
}

/** overload/drop për energjinë; run = kabllo më e gjatë se lejohet; devices = shumë pajisje në zonë. */
export type CircuitWarning = 'overload' | 'drop' | 'run' | 'devices';

export interface CircuitCalc {
  circuit: Circuit;
  points: number;
  /** Fuqia e instaluar, W. */
  power: number;
  /** Rryma e projektimit, A. */
  ib: number;
  /** Siguresa, A. */
  breaker: number;
  /** Seksioni, mm². */
  section: number;
  /** Kapaciteti i kabllos, A. */
  iz: number;
  /** Gjatësia e kabllove me zbritjet, m (0 kur s'ka kabllo). */
  length: number;
  /** Rënia e tensionit, % (null kur s'ka kabllo). */
  drop: number | null;
  /** Përshkrimi i kabllos, p.sh. "3×2.5 mm²" ose "U/UTP Cat6". */
  cable: string;
  /** Kablloja më e gjatë e linjës, m. */
  longest: number;
  /** Linjë sistemi (kamera, rrjet, zjarr): pa siguresë, seksion dhe rënie tensioni. */
  system: boolean;
  warnings: CircuitWarning[];
}

export function designCurrent(power: number, phases: 1 | 3): number {
  return phases === 3 ? power / (Math.sqrt(3) * VOLTAGE[3]) : power / VOLTAGE[1];
}

export function voltageDrop(lengthM: number, current: number, section: number, phases: 1 | 3): number {
  const k = phases === 3 ? Math.sqrt(3) : 2;
  return ((k * lengthM * current * RHO_CU) / section / VOLTAGE[phases]) * 100;
}

export function cableText(section: number, phases: 1 | 3): string {
  return `${phases === 3 ? 5 : 3}×${section} mm²`;
}

/** Llogarit një qark nga pikat dhe kabllot e tij. */
export function calcCircuit(circuit: Circuit, symbols: SymbolEntity[], lengthMm: number, longestMm = lengthMm): CircuitCalc {
  const phases = circuit.phases;
  const power = symbols.reduce((s, x) => s + pointPower(x), 0);
  if (isSystemKind(circuit.kind)) {
    const type = cableTypeOf(circuit);
    const longest = longestMm / 1000;
    const warnings: CircuitWarning[] = [];
    if (type.maxRun && longest > type.maxRun) warnings.push('run');
    if (circuit.kind === 'fire' && symbols.length > ZONE_MAX_DEVICES) warnings.push('devices');
    return { circuit, points: symbols.length, power, ib: 0, breaker: 0, section: 0, iz: 0, length: lengthMm / 1000, drop: null, cable: type.spec, longest, system: true, warnings };
  }
  const ib = designCurrent(power, phases);
  const warnings: CircuitWarning[] = [];

  let breaker = circuit.breaker ?? BREAKERS.find((b) => b >= Math.max(ib, MIN_BREAKER[circuit.kind])) ?? BREAKERS[BREAKERS.length - 1];
  if (ib > breaker) warnings.push('overload');

  const iz = IZ[phases];
  const minIdx = Math.max(0, SECTIONS.indexOf(circuit.section ?? MIN_SECTION[circuit.kind]));
  let idx = SECTIONS.findIndex((_s, i) => i >= minIdx && iz[i] >= breaker);
  if (idx < 0) {
    idx = SECTIONS.length - 1;
    warnings.push('overload');
  }

  const length = lengthMm / 1000;
  let drop: number | null = null;
  if (length > 0) {
    // seksioni rritet derisa rënia e tensionit të jetë brenda kufirit
    const current = Math.max(ib, 0);
    drop = voltageDrop(length, current, SECTIONS[idx], phases);
    while (drop > DROP_LIMIT[circuit.kind] && idx < SECTIONS.length - 1) {
      idx++;
      drop = voltageDrop(length, current, SECTIONS[idx], phases);
    }
    if (drop > DROP_LIMIT[circuit.kind]) warnings.push('drop');
  }
  breaker = Math.round(breaker);
  return {
    circuit,
    points: symbols.length,
    power,
    ib,
    breaker,
    section: SECTIONS[idx],
    iz: iz[idx],
    length,
    drop,
    cable: cableText(SECTIONS[idx], phases),
    longest: longestMm / 1000,
    system: false,
    warnings: [...new Set(warnings)],
  };
}

/** Llogarit të gjitha qarqet e projektit; `centers` jep qendrat e simboleve për lidhjen e kabllove. */
export function calcAll(doc: Doc, centers: Map<string, Vec>): CircuitCalc[] {
  const symbols = doc.entities.filter(isSymbol);
  const cables = doc.entities.filter(isCable);
  return (doc.circuits ?? []).map((c) => {
    const pts = symbols.filter((s) => s.circuit === c.id);
    const runs = cables.filter((k) => k.circuit === c.id).map((k) => cableRunLength(k, symbols, centers));
    return calcCircuit(c, pts, runs.reduce((s, v) => s + v, 0), Math.max(0, ...runs));
  });
}
