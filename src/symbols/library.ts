import type { Lang } from '../i18n/strings';

/**
 * Libraria e simboleve elektrike civile.
 *
 * Çdo simbol vizatohet në njësi lokale (1 njësi = UNIT_MM mm në plan).
 * Simbolet e murit ("wall") kanë origjinën te faqja e murit dhe zgjaten drejt +y (brenda dhomës);
 * simbolet e qendrës ("center") kanë origjinën në qendër.
 */

export const UNIT_MM = 15;

export type Names = Record<Lang, string>;

export interface SymbolPart {
  /** Rrugë SVG në njësi lokale. */
  d: string;
  fill?: boolean;
}

export interface SymbolDef {
  id: string;
  /** Kodi i AllSolutionTech, del në legjendë dhe në listën e materialeve. */
  code: string;
  category: CategoryId;
  layer: string;
  mount: 'wall' | 'center';
  names: Names;
  parts: SymbolPart[];
  /** Lartësia standarde e montimit, cm. */
  height?: number;
  /** Fuqia standarde, W. */
  power?: number;
}

export type CategoryId = 'priza' | 'celesa' | 'ndricim' | 'pajisje';

export const CATEGORIES: { id: CategoryId; names: Names }[] = [
  { id: 'priza', names: { sq: 'Priza', en: 'Sockets', it: 'Prese', de: 'Steckdosen' } },
  { id: 'celesa', names: { sq: 'Çelësa', en: 'Switches', it: 'Interruttori', de: 'Schalter' } },
  { id: 'ndricim', names: { sq: 'Ndriçim', en: 'Lighting', it: 'Illuminazione', de: 'Beleuchtung' } },
  { id: 'pajisje', names: { sq: 'Kuadro dhe pajisje', en: 'Panels and appliances', it: 'Quadri e apparecchi', de: 'Verteiler und Geräte' } },
];

const circle = (cx: number, cy: number, r: number) =>
  `M${cx + r} ${cy} A${r} ${r} 0 1 1 ${cx - r} ${cy} A${r} ${r} 0 1 1 ${cx + r} ${cy} Z`;

// Pjesë të përbashkëta
const SOCKET_ARC = 'M-10 18 A10 10 0 0 1 10 18';
const SOCKET = [{ d: 'M0 0 V8' }, { d: SOCKET_ARC }];
const EARTH = { d: 'M-6 4 H6' };
const SWITCH_DOT = { d: circle(0, 10, 3), fill: true };
const CROSS = (cx: number, cy: number, r: number) => ({
  d: `M${cx - r} ${cy - r} L${cx + r} ${cy + r} M${cx + r} ${cy - r} L${cx - r} ${cy + r}`,
});

export const SYMBOLS: SymbolDef[] = [
  // ---- Priza ----
  {
    id: 'pr-thjeshte', code: 'AST-PR-01', category: 'priza', layer: 'prizat', mount: 'wall', height: 30,
    names: { sq: 'Prizë e thjeshtë', en: 'Socket outlet', it: 'Presa', de: 'Steckdose' },
    parts: SOCKET,
  },
  {
    id: 'pr-schuko', code: 'AST-PR-02', category: 'priza', layer: 'prizat', mount: 'wall', height: 30,
    names: { sq: 'Prizë Schuko me tokëzim', en: 'Schuko socket, earthed', it: 'Presa Schuko con terra', de: 'Schutzkontaktsteckdose' },
    parts: [...SOCKET, EARTH],
  },
  {
    id: 'pr-dyfishe', code: 'AST-PR-03', category: 'priza', layer: 'prizat', mount: 'wall', height: 30,
    names: { sq: 'Prizë e dyfishtë', en: 'Double socket', it: 'Presa doppia', de: 'Doppelsteckdose' },
    parts: [{ d: 'M-4 0 V9 M4 0 V9' }, { d: SOCKET_ARC }, { d: 'M-8 4 H8' }],
  },
  {
    id: 'pr-ip44', code: 'AST-PR-04', category: 'priza', layer: 'prizat', mount: 'wall', height: 110,
    names: { sq: 'Prizë IP44 (banjo, jashtë)', en: 'Socket IP44 (wet areas)', it: 'Presa IP44 (ambienti umidi)', de: 'Feuchtraumsteckdose IP44' },
    parts: [{ d: 'M0 0 V8' }, { d: `${SOCKET_ARC} Z`, fill: true }, EARTH],
  },
  {
    id: 'pr-trefazore', code: 'AST-PR-05', category: 'priza', layer: 'prizat', mount: 'wall', height: 110,
    names: { sq: 'Prizë trefazore 400V', en: 'Three-phase socket 400V', it: 'Presa trifase 400V', de: 'Drehstromsteckdose 400V' },
    parts: [{ d: 'M-5 0 V9.5 M0 0 V8 M5 0 V9.5' }, { d: SOCKET_ARC }, { d: 'M-8 4 H8' }],
  },
  {
    id: 'pr-tv', code: 'AST-PR-06', category: 'priza', layer: 'prizat', mount: 'wall', height: 30,
    names: { sq: 'Prizë TV / SAT', en: 'TV / SAT outlet', it: 'Presa TV / SAT', de: 'Antennendose TV / SAT' },
    parts: [{ d: 'M0 0 V6' }, { d: 'M-9 6 H9 V20 H-9 Z' }, { d: 'M-5 10 L0 16 L5 10' }],
  },
  {
    id: 'pr-rj45', code: 'AST-PR-07', category: 'priza', layer: 'prizat', mount: 'wall', height: 30,
    names: { sq: 'Prizë interneti RJ45', en: 'Data outlet RJ45', it: 'Presa dati RJ45', de: 'Datendose RJ45' },
    parts: [{ d: 'M0 0 V6' }, { d: 'M-9 6 H9 V20 H-9 Z' }, { d: 'M-4 16 V12 H4 V16 M-2 12 V10 H2 V12' }],
  },

  // ---- Çelësa ----
  {
    id: 'cl-thjeshte', code: 'AST-CL-01', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Çelës i thjeshtë', en: 'One-way switch', it: 'Interruttore', de: 'Ausschalter' },
    parts: [SWITCH_DOT, { d: 'M2 12 L10 20 L13 17' }],
  },
  {
    id: 'cl-dyfishte', code: 'AST-CL-02', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Çelës i dyfishtë', en: 'Double switch', it: 'Interruttore doppio', de: 'Serienschalter' },
    parts: [SWITCH_DOT, { d: 'M2 12 L10 20 L13 17 M7 17 L10 14' }],
  },
  {
    id: 'cl-devijator', code: 'AST-CL-03', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Devijator', en: 'Two-way switch', it: 'Deviatore', de: 'Wechselschalter' },
    parts: [SWITCH_DOT, { d: 'M-8 2 L8 18 L11 15 M-8 2 L-11 5' }],
  },
  {
    id: 'cl-kryqezim', code: 'AST-CL-04', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Çelës kryqëzim', en: 'Intermediate switch', it: 'Invertitore', de: 'Kreuzschalter' },
    parts: [SWITCH_DOT, { d: 'M-8 2 L8 18 L11 15 M-8 2 L-11 5 M-8 18 L8 2' }],
  },
  {
    id: 'cl-buton', code: 'AST-CL-05', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Buton (zile, shkallë)', en: 'Push button', it: 'Pulsante', de: 'Taster' },
    parts: [{ d: 'M0 0 V5' }, { d: circle(0, 11, 6) }, { d: circle(0, 11, 2.2), fill: true }],
  },
  {
    id: 'cl-dimmer', code: 'AST-CL-06', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Dimmer', en: 'Dimmer switch', it: 'Dimmer', de: 'Dimmer' },
    parts: [SWITCH_DOT, { d: 'M2 12 L10 20 L13 17' }, { d: 'M-12 20 L-5 13 L-5 20 Z', fill: true }],
  },

  // ---- Ndriçim ----
  {
    id: 'nd-tavan', code: 'AST-ND-01', category: 'ndricim', layer: 'ndricimi', mount: 'center', power: 20,
    names: { sq: 'Ndriçues tavani', en: 'Ceiling light', it: 'Punto luce a soffitto', de: 'Deckenleuchte' },
    parts: [{ d: circle(0, 0, 10) }, CROSS(0, 0, 7)],
  },
  {
    id: 'nd-aplik', code: 'AST-ND-02', category: 'ndricim', layer: 'ndricimi', mount: 'wall', height: 200, power: 15,
    names: { sq: 'Aplik muri', en: 'Wall light', it: 'Applique', de: 'Wandleuchte' },
    parts: [{ d: 'M0 0 V4' }, { d: circle(0, 12, 8) }, CROSS(0, 12, 5.6)],
  },
  {
    id: 'nd-panel', code: 'AST-ND-03', category: 'ndricim', layer: 'ndricimi', mount: 'center', power: 36,
    names: { sq: 'Panel LED', en: 'LED panel', it: 'Pannello LED', de: 'LED-Panel' },
    parts: [{ d: 'M-13 -8 H13 V8 H-13 Z' }, { d: 'M-13 -8 L13 8 M13 -8 L-13 8' }],
  },
  {
    id: 'nd-spot', code: 'AST-ND-04', category: 'ndricim', layer: 'ndricimi', mount: 'center', power: 7,
    names: { sq: 'Spot i futur', en: 'Recessed spotlight', it: 'Faretto a incasso', de: 'Einbaustrahler' },
    parts: [{ d: circle(0, 0, 6) }, { d: circle(0, 0, 2.5), fill: true }],
  },
  {
    id: 'nd-linear', code: 'AST-ND-05', category: 'ndricim', layer: 'ndricimi', mount: 'center', power: 18,
    names: { sq: 'Ndriçues linear LED', en: 'Linear LED light', it: 'Lampada lineare LED', de: 'LED-Lichtleiste' },
    parts: [{ d: 'M-16 0 H16 M-16 -5 V5 M16 -5 V5' }],
  },
  {
    id: 'nd-emergjence', code: 'AST-ND-06', category: 'ndricim', layer: 'ndricimi', mount: 'center', power: 3,
    names: { sq: 'Ndriçim emergjence', en: 'Emergency light', it: 'Lampada di emergenza', de: 'Notleuchte' },
    parts: [{ d: 'M-12 -7 H12 V7 H-12 Z' }, { d: 'M-12 -7 L12 7 M12 -7 L-12 7' }, { d: circle(0, 0, 3), fill: true }],
  },

  // ---- Kuadro dhe pajisje ----
  {
    id: 'kp-kuadri', code: 'AST-KP-01', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 160,
    names: { sq: 'Kuadri elektrik', en: 'Distribution board', it: 'Quadro elettrico', de: 'Verteiler' },
    parts: [{ d: 'M-16 0 H16 V14 H-16 Z' }, { d: 'M-16 14 L16 0 L16 14 Z', fill: true }],
  },
  {
    id: 'kp-kuti', code: 'AST-KP-02', category: 'pajisje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Kuti shpërndarëse', en: 'Junction box', it: 'Scatola di derivazione', de: 'Abzweigdose' },
    parts: [{ d: 'M-6 -6 H6 V6 H-6 Z' }, { d: circle(0, 0, 1.8), fill: true }],
  },
  {
    id: 'pj-boiler', code: 'AST-PJ-01', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 180, power: 2000,
    names: { sq: 'Boiler', en: 'Water heater', it: 'Scaldabagno', de: 'Warmwasserspeicher' },
    parts: [{ d: 'M0 0 V3' }, { d: circle(0, 14, 11) }, { d: 'M-7 14 L-3.5 9 L0 19 L3.5 9 L7 14' }],
  },
  {
    id: 'pj-kondicioner', code: 'AST-PJ-02', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 220, power: 1200,
    names: { sq: 'Kondicioner', en: 'Air conditioner', it: 'Condizionatore', de: 'Klimagerät' },
    parts: [{ d: 'M-15 0 H15 V12 H-15 Z' }, { d: 'M0 2 V10 M-3.5 4 L3.5 8 M3.5 4 L-3.5 8' }],
  },
  {
    id: 'pj-sobe', code: 'AST-PJ-03', category: 'pajisje', layer: 'pajisje', mount: 'center', power: 6000,
    names: { sq: 'Sobë elektrike', en: 'Electric cooker', it: 'Piano cottura elettrico', de: 'Elektroherd' },
    parts: [
      { d: 'M-12 -12 H12 V12 H-12 Z' },
      { d: `${circle(-5.5, -5.5, 3.5)} ${circle(5.5, -5.5, 3.5)} ${circle(-5.5, 5.5, 3.5)} ${circle(5.5, 5.5, 3.5)}` },
    ],
  },
  {
    id: 'pj-zile', code: 'AST-PJ-04', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 150,
    names: { sq: 'Zile', en: 'Door bell', it: 'Campanello', de: 'Klingel' },
    parts: [{ d: 'M0 0 V8' }, { d: 'M-8 18 A8 8 0 0 1 8 18 M-10 18 H10' }],
  },
  {
    id: 'pj-citofon', code: 'AST-PJ-05', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 150,
    names: { sq: 'Citofon', en: 'Intercom', it: 'Citofono', de: 'Sprechanlage' },
    parts: [{ d: 'M0 0 V4' }, { d: 'M-8 4 H8 V22 H-8 Z' }, { d: 'M-4 9 H4 M-4 13 H4 M-4 17 H4' }],
  },
  {
    id: 'pj-tokezim', code: 'AST-PJ-06', category: 'pajisje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Tokëzim', en: 'Earthing point', it: 'Messa a terra', de: 'Erdung' },
    parts: [{ d: 'M0 -10 V2 M-10 2 H10 M-6 6 H6 M-2 10 H2' }],
  },
];

const BY_ID = new Map(SYMBOLS.map((s) => [s.id, s]));

export function symbolDef(id: string): SymbolDef | undefined {
  return BY_ID.get(id);
}

/** Qendra vizuale e simbolit në njësi lokale (për zgjedhjen me mi). */
export function localCenter(def: SymbolDef): { x: number; y: number } {
  return def.mount === 'wall' ? { x: 0, y: 12 } : { x: 0, y: 0 };
}

/** Rrezja e zgjedhjes në njësi lokale. */
export const HIT_RADIUS_UNITS = 15;

/** SVG i plotë i simbolit, për ikonat e librarisë. */
export function symbolSvg(def: SymbolDef): string {
  const vb = def.mount === 'wall' ? '-20 -4 40 30' : '-20 -15 40 30';
  const parts = def.parts
    .map((p) => `<path d="${p.d}"${p.fill ? ' class="fill"' : ''}></path>`)
    .join('');
  return `<svg viewBox="${vb}" aria-hidden="true">${parts}</svg>`;
}
