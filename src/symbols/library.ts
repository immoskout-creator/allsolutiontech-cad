import { localName, type CoreLang } from '../i18n/strings';

/**
 * Libraria e simboleve elektrike civile.
 *
 * Çdo simbol vizatohet në njësi lokale; 1 njësi = PAPER_UNIT_MM mm në letër,
 * pra në plan madhësia varet nga shkalla e fletës (shih unitMm).
 * Simbolet e murit ("wall") kanë origjinën te faqja e murit dhe zgjaten drejt +y (brenda dhomës);
 * simbolet e qendrës ("center") kanë origjinën në qendër.
 */

/** Madhësia e një njësie lokale në letër, mm (simboli tipik ~ 6-8 mm në letër). */
export const PAPER_UNIT_MM = 0.3;

/** Sa mm në plan është një njësi lokale për shkallën 1:scale. */
export function unitMm(scale: number): number {
  return PAPER_UNIT_MM * scale;
}

export type Names = Record<CoreLang, string>;

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
  /** Pajisje trefazore 400 V: qarku i saj duhet të jetë trefazor. */
  phases?: 3;
  /** Kamera: këndi i shikimit (gradë) dhe distanca (m) standarde. */
  cover?: { fov: number; range: number };
  /** Detektor zjarri: këndi i sensorit (gradë), rrezja maksimale (m) dhe lartësia maksimale e montimit (m). */
  detector?: { angle: number; maxRadius: number; maxHeight: number };
  /** Detektor linear me rreze: gjatësia standarde (m), gjerësia e mbulimit në secilën anë (m), lartësia maksimale (m). */
  beam?: { range: number; half: number; maxHeight: number };
  /** Ndriçues emergjence: fluksi standard në emergjencë, lm. */
  emergency?: { lumens: number };
  /** Tabelë sinjalizimi (EXIT): lartësia e piktogramit, mm. */
  sign?: { size: number };
}

export type CategoryId = 'custom' | 'priza' | 'celesa' | 'ndricim' | 'pajisje' | 'mbrojtje' | 'komandim' | 'matje' | 'sinjalizim' | 'sensore' | 'komunikim' | 'industri' | 'cctv' | 'rrjet' | 'zjarr' | 'emergjence';

/** Libraritë që zgjidhen veç e veç në panelin e majtë. */
export type LibraryId = 'civil' | 'cctv' | 'network' | 'fire' | 'emergency';
export const LIBRARIES: LibraryId[] = ['civil', 'cctv', 'network', 'fire', 'emergency'];

export const CATEGORIES: { id: CategoryId; lib?: LibraryId; names: Names }[] = [
  { id: 'custom', names: { sq: 'Simbolet e mia', en: 'My symbols', it: 'I miei simboli', de: 'Meine Symbole' } },
  { id: 'priza', names: { sq: 'Priza', en: 'Sockets', it: 'Prese', de: 'Steckdosen' } },
  { id: 'celesa', names: { sq: 'Çelësa', en: 'Switches', it: 'Interruttori', de: 'Schalter' } },
  { id: 'ndricim', names: { sq: 'Ndriçim', en: 'Lighting', it: 'Illuminazione', de: 'Beleuchtung' } },
  { id: 'pajisje', names: { sq: 'Kuadro dhe pajisje', en: 'Panels and appliances', it: 'Quadri e apparecchi', de: 'Verteiler und Geräte' } },
  { id: 'mbrojtje', names: { sq: 'Aparate mbrojtëse', en: 'Protective devices', it: 'Dispositivi di protezione', de: 'Schutzgeräte' } },
  { id: 'komandim', names: { sq: 'Rele dhe kontaktorë', en: 'Relays and contactors', it: 'Relè e contattori', de: 'Relais und Schütze' } },
  { id: 'matje', names: { sq: 'Matës dhe instrumente', en: 'Meters and instruments', it: 'Contatori e strumenti', de: 'Zähler und Messgeräte' } },
  { id: 'sinjalizim', names: { sq: 'Sinjalizim dhe alarm', en: 'Signalling and alarms', it: 'Segnalazione e allarmi', de: 'Meldung und Alarm' } },
  { id: 'sensore', names: { sq: 'Sensorë dhe automatizim', en: 'Sensors and automation', it: 'Sensori e automazione', de: 'Sensoren und Automation' } },
  { id: 'komunikim', names: { sq: 'TV dhe komunikim', en: 'TV and communication', it: 'TV e comunicazione', de: 'TV und Kommunikation' } },
  { id: 'industri', names: { sq: 'Industriale', en: 'Industrial', it: 'Industriale', de: 'Industrie' } },
  { id: 'cctv', lib: 'cctv', names: { sq: 'Kamera dhe regjistrim', en: 'Cameras and recording', it: 'Telecamere e registrazione', de: 'Kameras und Aufzeichnung' } },
  { id: 'rrjet', lib: 'network', names: { sq: 'Access point dhe rrjet', en: 'Access points and network', it: 'Access point e rete', de: 'Access Points und Netzwerk' } },
  { id: 'zjarr', lib: 'fire', names: { sq: 'Sinjalizim zjarri', en: 'Fire alarm', it: 'Rivelazione incendi', de: 'Brandmeldeanlage' } },
  { id: 'emergjence', lib: 'emergency', names: { sq: 'Ndriçim emergjence', en: 'Emergency lighting', it: 'Illuminazione di emergenza', de: 'Notbeleuchtung' } },
];

/** Tensioni i pajisjes elektrike: trefazoret janë 400 V, të tjerat 230 V. */
export type Volt = 230 | 400;
export const VOLTS: Volt[] = [230, 400];
export const symbolVolt = (d: SymbolDef): Volt => (d.phases === 3 ? 400 : 230);

/** Libraria e kategorisë: kategoritë pa `lib` janë të instalimit civil. */
export const categoryLibrary = (id: CategoryId): LibraryId => CATEGORIES.find((c) => c.id === id)?.lib ?? 'civil';

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

/**
 * Shkronja me vija (pa font), që simbolet të mbeten vektor i pastër.
 * Çdo shkronjë vizatohet në një kuti 4 x 6 me y poshtë.
 */
const GLYPHS: Record<string, string> = {
  B: 'M0 6 V0 H3 Q4 0 4 1.5 Q4 3 3 3 H0 M3 3 Q4 3 4 4.5 Q4 6 3 6 H0',
  F: 'M4 0 H0 V6 M0 3 H3',
  G: 'M4 1 Q3 0 2 0 Q0 0 0 3 Q0 6 2 6 Q4 6 4 3.5 H2.2',
  H: 'M0 0 V6 M4 0 V6 M0 3 H4',
  I: 'M2 0 V6 M1 0 H3 M1 6 H3',
  M: 'M0 6 V0 L2 3.5 L4 0 V6',
  O: 'M2 0 Q4 0 4 3 Q4 6 2 6 Q0 6 0 3 Q0 0 2 0 Z',
  P: 'M0 6 V0 H3 Q4 0 4 1.5 Q4 3 3 3 H0',
  S: 'M4 1 Q3.5 0 2 0 Q0 0 0 1.5 Q0 3 2 3 Q4 3 4 4.5 Q4 6 2 6 Q0.5 6 0 5',
  U: 'M0 0 V4.5 Q0 6 2 6 Q4 6 4 4.5 V0',
  W: 'M0 0 L1 6 L2 2.5 L3 6 L4 0',
  '3': 'M0 0.5 Q1 0 2 0 Q4 0 4 1.5 Q4 3 2 3 Q4 3 4 4.5 Q4 6 2 6 Q1 6 0 5.5',
  '4': 'M3 6 V0 L0 4 H4',
  A: 'M0 6 L2 0 L4 6 M0.7 4 H3.3',
  C: 'M4 1 Q3 0 2 0 Q0 0 0 3 Q0 6 2 6 Q3 6 4 5',
  D: 'M0 0 V6 H2 Q4 6 4 3 Q4 0 2 0 Z',
  E: 'M4 0 H0 V6 H4 M0 3 H3',
  J: 'M4 0 V4.5 Q4 6 2 6 Q0 6 0 4.5',
  K: 'M0 0 V6 M4 0 L0 3.5 M1.3 2.6 L4 6',
  L: 'M0 0 V6 H4',
  N: 'M0 6 V0 L4 6 V0',
  Q: 'M2 0 Q4 0 4 3 Q4 6 2 6 Q0 6 0 3 Q0 0 2 0 Z M2.5 4.5 L4 6',
  R: 'M0 6 V0 H3 Q4 0 4 1.5 Q4 3 3 3 H0 M2 3 L4 6',
  T: 'M0 0 H4 M2 0 V6',
  V: 'M0 0 L2 6 L4 0',
  X: 'M0 0 L4 6 M4 0 L0 6',
  Y: 'M0 0 L2 3 L4 0 M2 3 V6',
  Z: 'M0 0 H4 L0 6 H4',
  '0': 'M2 0 Q4 0 4 3 Q4 6 2 6 Q0 6 0 3 Q0 0 2 0 Z M0.6 5 L3.4 1',
  '1': 'M1 1 L2 0 V6 M1 6 H3',
  '2': 'M0 1 Q1 0 2 0 Q4 0 4 1.7 Q4 3 0 6 H4',
  '5': 'M4 0 H0.3 L0 3 Q1 2.5 2 2.5 Q4 2.5 4 4.2 Q4 6 2 6 Q1 6 0 5.4',
  '6': 'M3.6 0.4 Q3 0 2 0 Q0 0 0 3.5 Q0 6 2 6 Q4 6 4 4.2 Q4 2.5 2 2.5 Q0.5 2.5 0 3.8',
  '7': 'M0 0 H4 L1.5 6',
  '8': 'M2 3 Q0.2 3 0.2 1.5 Q0.2 0 2 0 Q3.8 0 3.8 1.5 Q3.8 3 2 3 Q0 3 0 4.5 Q0 6 2 6 Q4 6 4 4.5 Q4 3 2 3 Z',
  '9': 'M0.4 5.6 Q1 6 2 6 Q4 6 4 2.5 Q4 0 2 0 Q0 0 0 1.8 Q0 3.5 2 3.5 Q3.5 3.5 4 2.2',
  '-': 'M0.5 3 H3.5',
  '<': 'M4 0.5 L0 3 L4 5.5',
  '>': 'M0 0.5 L4 3 L0 5.5',
  '+': 'M0.5 3 H3.5 M2 1.5 V4.5',
  '/': 'M0.5 6 L3.5 0',
  '.': 'M1.6 5.6 H2.4 V6 H1.6 Z',
  '~': 'M0 3.5 Q1 2 2 3 Q3 4 4 2.5',
  '°': 'M2 0 Q3 0 3 1 Q3 2 2 2 Q1 2 1 1 Q1 0 2 0 Z',
};

/** Shkronjat që mund të vizatohen me strokeText (të tjerat kthehen në të mëdha ose hiqen). */
export const STROKE_CHARS = new Set([...Object.keys(GLYPHS), ' ']);

/** Teksti si rrugë SVG, me qendër në (cx, cy) dhe lartësi h. */
export function strokeText(text: string, cx: number, cy: number, h: number): string {
  const k = h / 6;
  const width = text.length * 4 * k + (text.length - 1) * 1.5 * k;
  const out: string[] = [];
  [...text].forEach((ch, i) => {
    const g = GLYPHS[ch];
    if (!g) return;
    const ox = cx - width / 2 + i * 5.5 * k;
    const oy = cy - h / 2;
    const fx = (v: string) => +(ox + Number(v) * k).toFixed(2);
    const fy = (v: string) => +(oy + Number(v) * k).toFixed(2);
    out.push(
      g.replace(/([MLQHVZ])([^MLQHVZ]*)/g, (_m, cmd: string, args: string) => {
        const n = args.trim() ? args.trim().split(/\s+/) : [];
        if (cmd === 'H') return `H${fx(n[0])} `;
        if (cmd === 'V') return `V${fy(n[0])} `;
        if (cmd === 'Z') return 'Z ';
        return `${cmd}${n.map((v, j) => (j % 2 ? fy(v) : fx(v))).join(' ')} `;
      }),
    );
  });
  return out.join('').trim();
}

const rect = (x1: number, y1: number, x2: number, y2: number) => `M${x1} ${y1} H${x2} V${y2} H${x1} Z`;
/** Pajisje e lidhur në mur: katror me simbolin brenda (qendra në 0,13). */
const APPLIANCE = (inner: SymbolPart[]): SymbolPart[] => [{ d: 'M0 0 V2' }, { d: rect(-11, 2, 11, 24) }, ...inner];
const SWITCH_BLADE = { d: 'M2 12 L10 20 L13 17' };

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
    id: 'pr-trefazore', code: 'AST-PR-05', category: 'priza', layer: 'prizat', mount: 'wall', height: 110, phases: 3,
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
    names: { sq: 'Çelës pulsant (zile, shkallë, teleruptor)', en: 'Push-button switch', it: 'Pulsante', de: 'Taster' },
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
  // ---- Priza (plotësim) ----
  {
    id: 'pr-trefishe', code: 'AST-PR-08', category: 'priza', layer: 'prizat', mount: 'wall', height: 30,
    names: { sq: 'Prizë e trefishtë', en: 'Triple socket', it: 'Presa tripla', de: 'Dreifachsteckdose' },
    parts: [...SOCKET, EARTH, { d: strokeText('3', 15, 13, 6) }],
  },
  {
    id: 'pr-katerfishe', code: 'AST-PR-09', category: 'priza', layer: 'prizat', mount: 'wall', height: 30,
    names: { sq: 'Prizë e katërfishtë', en: 'Quadruple socket', it: 'Presa quadrupla', de: 'Vierfachsteckdose' },
    parts: [...SOCKET, EARTH, { d: strokeText('4', 15, 13, 6) }],
  },
  {
    id: 'pr-me-celes', code: 'AST-PR-10', category: 'priza', layer: 'prizat', mount: 'wall', height: 30,
    names: { sq: 'Prizë me çelës', en: 'Switched socket', it: 'Presa interbloccata', de: 'Schaltbare Steckdose' },
    parts: [...SOCKET, EARTH, { d: 'M7 11 L14 4 L16.5 6.5' }],
  },
  {
    id: 'pr-usb', code: 'AST-PR-11', category: 'priza', layer: 'prizat', mount: 'wall', height: 30,
    names: { sq: 'Prizë me USB', en: 'Socket with USB', it: 'Presa con USB', de: 'Steckdose mit USB' },
    parts: [...SOCKET, EARTH, { d: strokeText('USB', 0, 22.5, 4.5) }],
  },
  {
    id: 'pr-dysheme', code: 'AST-PR-12', category: 'priza', layer: 'prizat', mount: 'center',
    names: { sq: 'Prizë dyshemeje', en: 'Floor socket', it: 'Presa a pavimento', de: 'Bodensteckdose' },
    parts: [{ d: rect(-10, -10, 10, 10) }, { d: 'M0 -10 V-3' }, { d: 'M-7 4 A7 7 0 0 1 7 4' }],
  },
  {
    id: 'pr-rroje', code: 'AST-PR-13', category: 'priza', layer: 'prizat', mount: 'wall', height: 150,
    names: { sq: 'Prizë rroje (banjo)', en: 'Shaver socket', it: 'Presa rasoio', de: 'Rasiersteckdose' },
    parts: [...SOCKET, { d: `${circle(12, 11, 3)} ${circle(15.5, 11, 3)}` }],
  },

  // ---- Çelësa (plotësim) ----
  {
    id: 'cl-ip44', code: 'AST-CL-07', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Çelës IP44 (banjo, jashtë)', en: 'Switch IP44 (wet areas)', it: 'Interruttore IP44', de: 'Feuchtraumschalter IP44' },
    parts: [SWITCH_DOT, SWITCH_BLADE, { d: strokeText('IP', -9, 20, 5) }],
  },
  {
    id: 'cl-tirje', code: 'AST-CL-08', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 220,
    names: { sq: 'Çelës me tërheqje (kordon)', en: 'Pull-cord switch', it: 'Interruttore a tirante', de: 'Zugschalter' },
    parts: [SWITCH_DOT, SWITCH_BLADE, { d: 'M10 20 V25 M8.2 23.2 L10 25 L11.8 23.2' }],
  },
  {
    id: 'cl-karte', code: 'AST-CL-09', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Çelës me kartë', en: 'Key card switch', it: 'Interruttore a badge', de: 'Kartenschalter' },
    parts: [{ d: 'M0 0 V4' }, { d: rect(-8, 4, 8, 20) }, { d: 'M-4.5 9 H4.5' }],
  },
  {
    id: 'cl-sinjal', code: 'AST-CL-10', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Çelës me llambë sinjali', en: 'Switch with pilot lamp', it: 'Interruttore con spia', de: 'Kontrollschalter' },
    parts: [SWITCH_DOT, SWITCH_BLADE, { d: circle(-9, 18, 3.5) }, CROSS(-9, 18, 2.4)],
  },
  {
    id: 'cl-grila', code: 'AST-CL-11', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Çelës grilash', en: 'Roller shutter switch', it: 'Comando tapparelle', de: 'Jalousieschalter' },
    parts: [SWITCH_DOT, { d: 'M-6 14 V24 M-8.5 16.5 L-6 14 L-3.5 16.5 M6 14 V24 M3.5 21.5 L6 24 L8.5 21.5' }],
  },
  {
    id: 'cl-kohor', code: 'AST-CL-12', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Automat shkallësh (kohor)', en: 'Staircase timer switch', it: 'Temporizzatore luce scale', de: 'Treppenlichtzeitschalter' },
    parts: [{ d: 'M0 0 V5' }, { d: circle(0, 12, 7) }, { d: 'M0 12 V7.5 M0 12 L3.5 14' }],
  },
  {
    id: 'cl-devijator-dyfishte', code: 'AST-CL-13', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Devijator i dyfishtë', en: 'Double two-way switch', it: 'Deviatore doppio', de: 'Doppelwechselschalter' },
    parts: [SWITCH_DOT, { d: 'M-8 2 L8 18 L11 15 M-8 2 L-11 5 M5 15 L8 12' }],
  },
  {
    id: 'cl-buton-drite', code: 'AST-CL-14', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Çelës pulsant me dritë', en: 'Illuminated push-button switch', it: 'Pulsante luminoso', de: 'Leuchttaster' },
    parts: [{ d: 'M0 0 V5' }, { d: circle(0, 11, 6) }, CROSS(0, 11, 4.2)],
  },

  // ---- Ndriçim (plotësim) ----
  {
    id: 'nd-varese', code: 'AST-ND-07', category: 'ndricim', layer: 'ndricimi', mount: 'center', power: 40,
    names: { sq: 'Llambadar (i varur)', en: 'Pendant light', it: 'Lampadario a sospensione', de: 'Pendelleuchte' },
    parts: [{ d: circle(0, 0, 10) }, CROSS(0, 0, 7), { d: 'M-5 -13 H5' }],
  },
  {
    id: 'nd-fluo', code: 'AST-ND-08', category: 'ndricim', layer: 'ndricimi', mount: 'center', power: 2 * 36,
    names: { sq: 'Ndriçues me dy tuba', en: 'Twin tube luminaire', it: 'Plafoniera a due tubi', de: 'Langfeldleuchte 2-flammig' },
    parts: [{ d: 'M-16 -4 H16 M-16 4 H16 M-16 -7 V7 M16 -7 V7' }],
  },
  {
    id: 'nd-ip65', code: 'AST-ND-09', category: 'ndricim', layer: 'ndricimi', mount: 'center', power: 20,
    names: { sq: 'Ndriçues IP65 (i papërshkueshëm)', en: 'Waterproof luminaire IP65', it: 'Plafoniera stagna IP65', de: 'Feuchtraumleuchte IP65' },
    parts: [{ d: rect(-12, -12, 12, 12) }, { d: circle(0, 0, 8) }, CROSS(0, 0, 5.6)],
  },
  {
    id: 'nd-dalje', code: 'AST-ND-10', category: 'ndricim', layer: 'ndricimi', mount: 'wall', height: 220, power: 3,
    names: { sq: 'Shenjë daljeje (emergjencë)', en: 'Exit sign', it: 'Segnalazione uscita', de: 'Rettungszeichenleuchte' },
    parts: [{ d: 'M0 0 V4' }, { d: rect(-14, 4, 14, 18) }, { d: 'M-8 11 H8 M4 7 L8 11 L4 15' }],
  },
  {
    id: 'nd-kopsht', code: 'AST-ND-11', category: 'ndricim', layer: 'ndricimi', mount: 'center', power: 10,
    names: { sq: 'Ndriçues kopshti', en: 'Garden bollard light', it: 'Paletto da giardino', de: 'Pollerleuchte' },
    parts: [{ d: circle(0, 0, 8) }, { d: 'M-8 0 A8 8 0 0 0 8 0 Z', fill: true }],
  },
  {
    id: 'nd-projektor', code: 'AST-ND-12', category: 'ndricim', layer: 'ndricimi', mount: 'wall', height: 300, power: 50,
    names: { sq: 'Projektor', en: 'Floodlight', it: 'Proiettore', de: 'Strahler' },
    parts: [{ d: 'M0 0 V4' }, { d: 'M-6 4 H6 L10 16 H-10 Z' }, { d: 'M-6 19 L-8.5 24 M0 19 V25 M6 19 L8.5 24' }],
  },
  {
    id: 'nd-shirit', code: 'AST-ND-13', category: 'ndricim', layer: 'ndricimi', mount: 'center', power: 14,
    names: { sq: 'Shirit LED', en: 'LED strip', it: 'Striscia LED', de: 'LED-Streifen' },
    parts: [{ d: 'M-16 0 H16 M-16 -3.5 V3.5 M16 -3.5 V3.5' }, { d: `${circle(-10, 0, 1.6)} ${circle(-3.3, 0, 1.6)} ${circle(3.3, 0, 1.6)} ${circle(10, 0, 1.6)}`, fill: true }],
  },
  {
    id: 'nd-pasqyre', code: 'AST-ND-14', category: 'ndricim', layer: 'ndricimi', mount: 'wall', height: 200, power: 10,
    names: { sq: 'Ndriçues pasqyre', en: 'Mirror light', it: 'Lampada specchio', de: 'Spiegelleuchte' },
    parts: [{ d: 'M0 0 V4' }, { d: rect(-12, 4, 12, 9) }, { d: 'M-12 4 L12 9 M12 4 L-12 9' }],
  },
  {
    id: 'nd-shkalle', code: 'AST-ND-15', category: 'ndricim', layer: 'ndricimi', mount: 'wall', height: 30, power: 3,
    names: { sq: 'Ndriçues shkallësh (në mur)', en: 'Step light', it: 'Segnapasso', de: 'Stufenleuchte' },
    parts: [{ d: 'M0 0 V4' }, { d: rect(-6, 4, 6, 12) }, { d: rect(-6, 8, 6, 12), fill: true }],
  },

  // ---- Kuadro (plotësim) ----
  {
    id: 'kp-nenkuader', code: 'AST-KP-03', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 160,
    names: { sq: 'Nënkuadër (kati, apartamenti)', en: 'Sub-distribution board', it: 'Sottoquadro', de: 'Unterverteiler' },
    parts: [{ d: rect(-12, 0, 12, 10) }, { d: 'M-12 10 L12 0' }],
  },
  {
    id: 'kp-matesi', code: 'AST-KP-04', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 160,
    names: { sq: 'Matësi i energjisë', en: 'Electricity meter', it: 'Contatore', de: 'Stromzähler' },
    parts: [{ d: rect(-12, 0, 12, 16) }, { d: strokeText('WH', 0, 8, 6) }],
  },
  {
    id: 'kp-inverter', code: 'AST-KP-05', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 160,
    names: { sq: 'Inverter fotovoltaik', en: 'PV inverter', it: 'Inverter fotovoltaico', de: 'PV-Wechselrichter' },
    parts: [{ d: rect(-12, 0, 12, 16) }, { d: 'M-12 16 L12 0' }, { d: 'M-9 4 H-3 M-9 6.5 H-3' }, { d: 'M3 11.5 Q4.5 9.5 6 11.5 Q7.5 13.5 9 11.5' }],
  },

  // ---- Pajisje (plotësim) ----
  {
    id: 'pj-lavatrice', code: 'AST-PJ-07', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 30, power: 2200,
    names: { sq: 'Lavatriçe', en: 'Washing machine', it: 'Lavatrice', de: 'Waschmaschine' },
    parts: APPLIANCE([{ d: circle(0, 13, 6) }, { d: circle(0, 13, 2.5) }]),
  },
  {
    id: 'pj-tharese', code: 'AST-PJ-08', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 30, power: 2500,
    names: { sq: 'Tharëse rrobash', en: 'Tumble dryer', it: 'Asciugatrice', de: 'Wäschetrockner' },
    parts: APPLIANCE([{ d: circle(0, 13, 6) }, { d: 'M-3.5 13 Q-1.75 10 0 13 Q1.75 16 3.5 13' }]),
  },
  {
    id: 'pj-pjatalarese', code: 'AST-PJ-09', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 30, power: 2000,
    names: { sq: 'Pjatalarëse', en: 'Dishwasher', it: 'Lavastoviglie', de: 'Geschirrspüler' },
    parts: APPLIANCE([{ d: `${circle(-4.5, 13, 3)} ${circle(4.5, 13, 3)}` }, { d: 'M-7 19 H7' }]),
  },
  {
    id: 'pj-frigorifer', code: 'AST-PJ-10', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 30, power: 150,
    names: { sq: 'Frigorifer', en: 'Refrigerator', it: 'Frigorifero', de: 'Kühlschrank' },
    parts: APPLIANCE([{ d: 'M0 6.5 V19.5 M-5.6 9.75 L5.6 16.25 M5.6 9.75 L-5.6 16.25' }]),
  },
  {
    id: 'pj-furre', code: 'AST-PJ-11', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 30, power: 3500,
    names: { sq: 'Furrë e futur', en: 'Built-in oven', it: 'Forno da incasso', de: 'Einbaubackofen' },
    parts: APPLIANCE([{ d: rect(-7, 7, 7, 20) }, { d: rect(-7, 7, 7, 10), fill: true }]),
  },
  {
    id: 'pj-aspirator', code: 'AST-PJ-12', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 200, power: 250,
    names: { sq: 'Aspirator kuzhine', en: 'Cooker hood', it: 'Cappa aspirante', de: 'Dunstabzugshaube' },
    parts: [{ d: 'M0 0 V4' }, { d: 'M-5 4 H5 L12 20 H-12 Z' }, { d: 'M-7 14 H7' }],
  },
  {
    id: 'pj-ventilator', code: 'AST-PJ-13', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 220, power: 30,
    names: { sq: 'Ventilator aspirimi', en: 'Extractor fan', it: 'Aspiratore', de: 'Lüfter' },
    parts: [{ d: 'M0 0 V4' }, { d: circle(0, 13, 9) }, { d: 'M0 13 Q4 8 0 5.5 M0 13 Q-4 18 0 20.5 M0 13 Q5 17 7.5 13 M0 13 Q-5 9 -7.5 13' }],
  },
  {
    id: 'pj-radiator', code: 'AST-PJ-14', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 20, power: 2000,
    names: { sq: 'Radiator elektrik', en: 'Electric heater', it: 'Radiatore elettrico', de: 'Elektroheizkörper' },
    parts: [{ d: 'M0 0 V4' }, { d: rect(-14, 4, 14, 14) }, { d: 'M-8 4 V14 M-3 4 V14 M3 4 V14 M8 4 V14' }],
  },
  {
    id: 'pj-ev', code: 'AST-PJ-15', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 120, power: 11000,
    names: { sq: 'Karikues makine elektrike', en: 'EV charger (wallbox)', it: 'Wallbox ricarica auto', de: 'Wallbox (E-Auto)' },
    parts: APPLIANCE([{ d: 'M1.5 5.5 L-4 14 H0.5 L-1.5 20.5 L4.5 11 H0 Z', fill: true }]),
  },
  {
    id: 'pj-motor-grila', code: 'AST-PJ-16', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 240, power: 150,
    names: { sq: 'Motor grilash', en: 'Roller shutter motor', it: 'Motore tapparella', de: 'Rollladenmotor' },
    parts: [{ d: 'M0 0 V3' }, { d: circle(0, 11, 8) }, { d: strokeText('M', 0, 11, 7) }],
  },
  {
    id: 'pj-porte', code: 'AST-PJ-17', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 50, power: 400,
    names: { sq: 'Motor porte', en: 'Gate motor', it: 'Motore cancello', de: 'Torantrieb' },
    parts: [{ d: 'M0 0 V3' }, { d: circle(0, 10, 7) }, { d: strokeText('M', 0, 10, 6) }, { d: 'M-12 22 H12 M-9 19.5 L-12 22 L-9 24.5 M9 19.5 L12 22 L9 24.5' }],
  },
  {
    id: 'pj-pompe', code: 'AST-PJ-18', category: 'pajisje', layer: 'pajisje', mount: 'center', power: 750,
    names: { sq: 'Pompë uji', en: 'Water pump', it: 'Pompa', de: 'Pumpe' },
    parts: [{ d: circle(0, 0, 10) }, { d: 'M-5 -8.66 L10 0 L-5 8.66' }],
  },
  {
    id: 'pj-pv', code: 'AST-PJ-19', category: 'pajisje', layer: 'pajisje', mount: 'center', power: 400,
    names: { sq: 'Panel diellor', en: 'Solar panel', it: 'Pannello fotovoltaico', de: 'Solarmodul' },
    parts: [{ d: rect(-14, -9, 14, 9) }, { d: 'M-14 0 H14 M-7 -9 V9 M0 -9 V9 M7 -9 V9' }],
  },

  // ---- Sensorë dhe automatizim ----
  {
    id: 'sn-levizje', code: 'AST-SN-01', category: 'sensore', layer: 'pajisje', mount: 'wall', height: 220,
    names: { sq: 'Sensor lëvizjeje', en: 'Motion detector', it: 'Rilevatore di movimento', de: 'Bewegungsmelder' },
    parts: [{ d: 'M0 0 V4' }, { d: 'M-9 4 H9 A9 9 0 0 1 -9 4 Z' }, { d: 'M-5.5 17 L-8 22 M0 17.5 V23 M5.5 17 L8 22' }],
  },
  {
    id: 'sn-termostat', code: 'AST-SN-02', category: 'sensore', layer: 'pajisje', mount: 'wall', height: 150,
    names: { sq: 'Termostat dhome', en: 'Room thermostat', it: 'Termostato ambiente', de: 'Raumthermostat' },
    parts: [{ d: 'M0 0 V4' }, { d: rect(-8, 4, 8, 20) }, { d: 'M0 7 V14' }, { d: circle(0, 15.5, 2.2), fill: true }],
  },
  {
    id: 'sn-tymi', code: 'AST-SN-03', category: 'sensore', layer: 'pajisje', mount: 'center',
    names: { sq: 'Detektor tymi', en: 'Smoke detector', it: 'Rilevatore di fumo', de: 'Rauchmelder' },
    parts: [{ d: circle(0, 0, 9) }, { d: 'M-3 5 Q-6 1.5 -3 -1 Q0 -3.5 -2.5 -6.5 M2.5 5 Q-0.5 1.5 2.5 -1 Q5.5 -3.5 3 -6.5' }],
  },
  {
    id: 'sn-gazi', code: 'AST-SN-04', category: 'sensore', layer: 'pajisje', mount: 'wall', height: 30,
    names: { sq: 'Detektor gazi', en: 'Gas detector', it: 'Rilevatore gas', de: 'Gasmelder' },
    parts: [{ d: 'M0 0 V4' }, { d: circle(0, 12, 8) }, { d: strokeText('G', 0, 12, 7) }],
  },
  {
    id: 'sn-uji', code: 'AST-SN-05', category: 'sensore', layer: 'pajisje', mount: 'center',
    names: { sq: 'Sensor përmbytjeje', en: 'Flood sensor', it: 'Sensore allagamento', de: 'Wassermelder' },
    parts: [{ d: circle(0, 0, 9) }, { d: 'M0 -6 Q5 0.5 3.2 3.2 A3.8 3.8 0 0 1 -3.2 3.2 Q-5 0.5 0 -6 Z', fill: true }],
  },
  {
    id: 'sn-muzgu', code: 'AST-SN-06', category: 'sensore', layer: 'pajisje', mount: 'wall', height: 250,
    names: { sq: 'Sensor muzgu (dritë/errësirë)', en: 'Twilight switch', it: 'Interruttore crepuscolare', de: 'Dämmerungsschalter' },
    parts: [{ d: 'M0 0 V5' }, { d: circle(0, 12, 7) }, { d: 'M-7 12 A7 7 0 0 1 7 12 Z', fill: true }],
  },
  {
    id: 'sn-smart', code: 'AST-SN-07', category: 'sensore', layer: 'pajisje', mount: 'wall', height: 150,
    names: { sq: 'Panel automatizimi (smart home)', en: 'Home automation panel', it: 'Pannello domotica', de: 'Smart-Home-Zentrale' },
    parts: [{ d: 'M0 0 V4' }, { d: rect(-10, 4, 10, 22) }, { d: 'M0 13 L-5 8.5 M0 13 L5 8.5 M0 13 V18.5' }, { d: `${circle(0, 13, 1.8)} ${circle(-5, 8.5, 1.3)} ${circle(5, 8.5, 1.3)} ${circle(0, 18.5, 1.3)}`, fill: true }],
  },

  // ---- TV dhe komunikim ----
  {
    id: 'km-telefon', code: 'AST-KM-01', category: 'komunikim', layer: 'prizat', mount: 'wall', height: 30,
    names: { sq: 'Prizë telefoni', en: 'Telephone outlet', it: 'Presa telefonica', de: 'Telefondose' },
    parts: [{ d: 'M0 0 V6' }, { d: rect(-9, 6, 9, 20) }, { d: 'M-5 16 Q-5 10.5 0 10.5 Q5 10.5 5 16 M-6.5 16 H-3.5 M3.5 16 H6.5' }],
  },
  {
    id: 'km-rack', code: 'AST-KM-02', category: 'komunikim', layer: 'prizat', mount: 'wall', height: 180,
    names: { sq: 'Rack rrjeti', en: 'Network rack', it: 'Armadio rack', de: 'Netzwerkschrank' },
    parts: [{ d: rect(-12, 0, 12, 18) }, { d: 'M-9 4.5 H9 M-9 9 H9 M-9 13.5 H9' }],
  },
  {
    id: 'km-videocitofon', code: 'AST-KM-03', category: 'komunikim', layer: 'prizat', mount: 'wall', height: 150,
    names: { sq: 'Videocitofon', en: 'Video intercom', it: 'Videocitofono', de: 'Video-Sprechanlage' },
    parts: [{ d: 'M0 0 V4' }, { d: rect(-8, 4, 8, 22) }, { d: rect(-5, 7, 5, 14) }, { d: 'M-4 17 H4 M-4 19.5 H4' }],
  },
  {
    id: 'km-antena', code: 'AST-KM-04', category: 'komunikim', layer: 'prizat', mount: 'center',
    names: { sq: 'Antenë TV / SAT', en: 'TV / SAT antenna', it: 'Antenna TV / SAT', de: 'Antenne TV / SAT' },
    parts: [{ d: 'M0 11 V-11 M-8 -11 L0 0 L8 -11' }],
  },
  {
    id: 'km-amplifikator', code: 'AST-KM-05', category: 'komunikim', layer: 'prizat', mount: 'wall', height: 180,
    names: { sq: 'Amplifikator / multiswitch TV', en: 'TV amplifier / multiswitch', it: 'Amplificatore / multiswitch TV', de: 'Verstärker / Multischalter' },
    parts: [{ d: 'M0 0 V2' }, { d: rect(-10, 2, 10, 18) }, { d: 'M-5 5 L6 10 L-5 15 Z' }],
  },
  {
    id: 'km-fiber', code: 'AST-KM-06', category: 'komunikim', layer: 'prizat', mount: 'wall', height: 30,
    names: { sq: 'Prizë fibre optike', en: 'Fibre optic outlet', it: 'Presa fibra ottica', de: 'Glasfaserdose' },
    parts: [{ d: 'M0 0 V6' }, { d: rect(-9, 6, 9, 20) }, { d: strokeText('FO', 0, 13, 6) }],
  },
  // ---- Kamera (CCTV) ----
  {
    id: 'cc-bullet', code: 'AST-CC-01', category: 'cctv', layer: 'kamerat', mount: 'wall', height: 250, power: 6, cover: { fov: 85, range: 20 },
    names: { sq: 'Kamerë bullet IP', en: 'IP bullet camera', it: 'Telecamera bullet IP', de: 'IP-Bullet-Kamera' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-5, 3, 5, 15) }, { d: 'M-5 15 L-8.5 21 H8.5 L5 15' }],
  },
  {
    id: 'cc-dome', code: 'AST-CC-02', category: 'cctv', layer: 'kamerat', mount: 'center', power: 6, cover: { fov: 105, range: 12 },
    names: { sq: 'Kamerë dome IP', en: 'IP dome camera', it: 'Telecamera dome IP', de: 'IP-Dome-Kamera' },
    parts: [{ d: circle(0, 0, 9.5) }, { d: 'M-9.5 0 H9.5' }, { d: circle(0, 3.8, 2.6), fill: true }],
  },
  {
    id: 'cc-ptz', code: 'AST-CC-03', category: 'cctv', layer: 'kamerat', mount: 'wall', height: 300, power: 25, cover: { fov: 60, range: 50 },
    names: { sq: 'Kamerë PTZ (rrotulluese)', en: 'PTZ camera', it: 'Telecamera PTZ (brandeggiabile)', de: 'PTZ-Kamera (schwenkbar)' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-5, 3, 5, 14) }, { d: 'M-5 14 L-8 20 H8 L5 14' }, { d: 'M-9 5 Q-14 12 -9 19 M9 5 Q14 12 9 19 M-9 19 L-10.5 16.5 M9 19 L10.5 16.5' }],
  },
  {
    id: 'cc-fisheye', code: 'AST-CC-04', category: 'cctv', layer: 'kamerat', mount: 'center', power: 8, cover: { fov: 360, range: 8 },
    names: { sq: 'Kamerë fisheye 360°', en: '360° fisheye camera', it: 'Telecamera fisheye 360°', de: '360°-Fisheye-Kamera' },
    parts: [{ d: circle(0, 0, 10) }, { d: circle(0, 0, 6.5) }, { d: strokeText('360', 0, 0, 4.2) }],
  },
  {
    id: 'cc-nvr', code: 'AST-CC-05', category: 'cctv', layer: 'kamerat', mount: 'wall', height: 180, power: 30,
    names: { sq: 'Regjistrues NVR / DVR', en: 'NVR / DVR recorder', it: 'Videoregistratore NVR / DVR', de: 'Rekorder NVR / DVR' },
    parts: [{ d: rect(-12, 0, 12, 16) }, { d: strokeText('NVR', 0, 8, 6) }],
  },
  {
    id: 'cc-poe', code: 'AST-CC-06', category: 'cctv', layer: 'kamerat', mount: 'wall', height: 180,
    names: { sq: 'Switch PoE për kamerat', en: 'PoE switch for cameras', it: 'Switch PoE per telecamere', de: 'PoE-Switch für Kameras' },
    parts: [{ d: rect(-12, 0, 12, 16) }, { d: strokeText('POE', 0, 6.5, 5.5) }, { d: 'M-8 12.5 H-5 M-2 12.5 H1 M4 12.5 H7' }],
  },
  {
    id: 'cc-monitor', code: 'AST-CC-07', category: 'cctv', layer: 'kamerat', mount: 'wall', height: 150,
    names: { sq: 'Monitor vëzhgimi', en: 'Surveillance monitor', it: 'Monitor di sorveglianza', de: 'Überwachungsmonitor' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-11, 3, 11, 18) }, { d: rect(-8, 6, 8, 15) }, { d: 'M0 18 V21 M-5 21 H5' }],
  },
  {
    id: 'cc-ir', code: 'AST-CC-08', category: 'cctv', layer: 'kamerat', mount: 'wall', height: 250, power: 10, cover: { fov: 60, range: 30 },
    names: { sq: 'Ndriçues infra të kuq (IR)', en: 'Infrared illuminator', it: 'Illuminatore infrarosso', de: 'Infrarot-Strahler' },
    parts: [{ d: 'M0 0 V3' }, { d: 'M-8 3 H8 V9 A8 8 0 0 1 -8 9 Z' }, { d: strokeText('IR', 0, 8, 4.5) }, { d: 'M-6 19 L-8 22.5 M0 20 V24 M6 19 L8 22.5' }],
  },
  {
    id: 'cc-turret', code: 'AST-CC-09', category: 'cctv', layer: 'kamerat', mount: 'center', power: 6, cover: { fov: 105, range: 30 },
    names: { sq: 'Kamerë turret / eyeball IP', en: 'IP turret / eyeball camera', it: 'Telecamera turret / eyeball IP', de: 'IP-Turret-/Eyeball-Kamera' },
    parts: [{ d: circle(0, 0, 9.5) }, { d: circle(0, 0, 5) }, { d: circle(0, 0, 2), fill: true }],
  },
  {
    id: 'cc-box', code: 'AST-CC-10', category: 'cctv', layer: 'kamerat', mount: 'wall', height: 300, power: 8, cover: { fov: 40, range: 60 },
    names: { sq: 'Kamerë box me objektiv të ndërrueshëm', en: 'Box camera with interchangeable lens', it: 'Telecamera box con ottica intercambiabile', de: 'Boxkamera mit Wechselobjektiv' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-6, 3, 6, 15) }, { d: rect(-4, 15, 4, 20) }],
  },
  {
    id: 'cc-pano', code: 'AST-CC-11', category: 'cctv', layer: 'kamerat', mount: 'wall', height: 300, power: 10, cover: { fov: 180, range: 25 },
    names: { sq: 'Kamerë panoramike 180° (me dy objektivë)', en: '180° panoramic camera (dual lens)', it: 'Telecamera panoramica 180° (doppia ottica)', de: '180°-Panoramakamera (Doppelobjektiv)' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-10, 3, 10, 12) }, { d: circle(-4.5, 15.5, 3) }, { d: circle(4.5, 15.5, 3) }],
  },
  {
    id: 'cc-bullet-ahd', code: 'AST-CC-12', category: 'cctv', layer: 'kamerat', mount: 'wall', height: 250, power: 4, cover: { fov: 90, range: 20 },
    names: { sq: 'Kamerë bullet analoge HD (AHD/TVI/CVI)', en: 'Analog HD bullet camera (AHD/TVI/CVI)', it: 'Telecamera bullet analogica HD (AHD/TVI/CVI)', de: 'Analog-HD-Bullet-Kamera (AHD/TVI/CVI)' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-5, 3, 5, 15) }, { d: 'M-5 15 L-8.5 21 H8.5 L5 15' }, { d: strokeText('A', 0, 9, 5) }],
  },
  {
    id: 'cc-dome-ahd', code: 'AST-CC-13', category: 'cctv', layer: 'kamerat', mount: 'center', power: 4, cover: { fov: 100, range: 15 },
    names: { sq: 'Kamerë dome analoge HD (AHD/TVI/CVI)', en: 'Analog HD dome camera (AHD/TVI/CVI)', it: 'Telecamera dome analogica HD (AHD/TVI/CVI)', de: 'Analog-HD-Dome-Kamera (AHD/TVI/CVI)' },
    parts: [{ d: circle(0, 0, 9.5) }, { d: 'M-9.5 0 H9.5' }, { d: strokeText('A', 0, -4.5, 4.5) }, { d: circle(0, 3.8, 2.6), fill: true }],
  },
  {
    id: 'cc-dvr', code: 'AST-CC-14', category: 'cctv', layer: 'kamerat', mount: 'wall', height: 180, power: 25,
    names: { sq: 'Regjistrues DVR / XVR (analog dhe hibrid)', en: 'DVR / XVR recorder (analog and hybrid)', it: 'Videoregistratore DVR / XVR (analogico e ibrido)', de: 'Rekorder DVR / XVR (analog und hybrid)' },
    parts: [{ d: rect(-12, 0, 12, 16) }, { d: strokeText('DVR', 0, 8, 6) }],
  },
  {
    id: 'cc-intercom', code: 'AST-CC-15', category: 'cctv', layer: 'kamerat', mount: 'wall', height: 150, power: 5, cover: { fov: 110, range: 5 },
    names: { sq: 'Videocitofon / zile me kamerë', en: 'Video intercom / video doorbell', it: 'Videocitofono / campanello con telecamera', de: 'Videosprechanlage / Videotürklingel' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-6, 3, 6, 19) }, { d: circle(0, 7.5, 2) }, { d: circle(0, 14.5, 2), fill: true }],
  },

  // ---- Access point dhe rrjet ----
  {
    id: 'rj-ap-tavan', code: 'AST-RJ-01', category: 'rrjet', layer: 'rrjeti', mount: 'center', power: 12,
    names: { sq: 'Access point tavani (Wi-Fi)', en: 'Ceiling access point (Wi-Fi)', it: 'Access point a soffitto (Wi-Fi)', de: 'Access Point Decke (WLAN)' },
    parts: [{ d: circle(0, 0, 10) }, { d: 'M-6.5 -1.5 A9 9 0 0 1 6.5 -1.5 M-3.8 1.8 A5 5 0 0 1 3.8 1.8' }, { d: circle(0, 5, 1.4), fill: true }],
  },
  {
    id: 'rj-ap-mur', code: 'AST-RJ-02', category: 'rrjet', layer: 'rrjeti', mount: 'wall', height: 220, power: 10,
    names: { sq: 'Access point muri (Wi-Fi)', en: 'Wall access point (Wi-Fi)', it: 'Access point a parete (Wi-Fi)', de: 'Access Point Wand (WLAN)' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-10, 3, 10, 22) }, { d: 'M-6.5 13 A9 9 0 0 1 6.5 13 M-3.8 16 A5 5 0 0 1 3.8 16' }, { d: circle(0, 19, 1.3), fill: true }],
  },
  {
    id: 'rj-ap-jashte', code: 'AST-RJ-03', category: 'rrjet', layer: 'rrjeti', mount: 'wall', height: 300, power: 15,
    names: { sq: 'Access point i jashtëm', en: 'Outdoor access point', it: 'Access point da esterno', de: 'Access Point außen' },
    parts: [{ d: 'M0 0 V3' }, { d: circle(0, 13, 10) }, { d: 'M-6.5 12 A9 9 0 0 1 6.5 12 M-3.8 15 A5 5 0 0 1 3.8 15' }, { d: circle(0, 18, 1.3), fill: true }, { d: 'M-3 3 L-4.5 0 M3 3 L4.5 0' }],
  },
  {
    id: 'rj-rj45-dyfishe', code: 'AST-RJ-04', category: 'rrjet', layer: 'rrjeti', mount: 'wall', height: 30,
    names: { sq: 'Prizë rrjeti RJ45 dyfishe', en: 'Double data outlet RJ45', it: 'Presa dati RJ45 doppia', de: 'Datendose RJ45 zweifach' },
    parts: [{ d: 'M0 0 V5' }, { d: rect(-12, 5, 12, 20) }, { d: 'M-9 16 V12 H-2 V16 M-7 12 V10 H-4 V12 M2 16 V12 H9 V16 M4 12 V10 H7 V12' }],
  },
  {
    id: 'rj-switch', code: 'AST-RJ-05', category: 'rrjet', layer: 'rrjeti', mount: 'wall', height: 180, power: 20,
    names: { sq: 'Switch rrjeti', en: 'Network switch', it: 'Switch di rete', de: 'Netzwerk-Switch' },
    parts: [{ d: rect(-12, 0, 12, 16) }, { d: 'M-7 5 H6 L3.5 2.5 M7 11 H-6 L-3.5 13.5' }],
  },
  {
    id: 'rj-router', code: 'AST-RJ-06', category: 'rrjet', layer: 'rrjeti', mount: 'wall', height: 180, power: 15,
    names: { sq: 'Router / modem', en: 'Router / modem', it: 'Router / modem', de: 'Router / Modem' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-11, 3, 11, 15) }, { d: strokeText('R', 0, 9, 6) }, { d: 'M-7 15 L-9 22 M7 15 L9 22' }],
  },
  {
    id: 'rj-patch', code: 'AST-RJ-07', category: 'rrjet', layer: 'rrjeti', mount: 'wall', height: 180,
    names: { sq: 'Patch panel', en: 'Patch panel', it: 'Patch panel', de: 'Patchfeld' },
    parts: [{ d: rect(-12, 0, 12, 11) }, { d: 'M-9.5 4 H-6.5 V7 H-9.5 Z M-4.5 4 H-1.5 V7 H-4.5 Z M1.5 4 H4.5 V7 H1.5 Z M6.5 4 H9.5 V7 H6.5 Z', fill: true }],
  },
  {
    id: 'rj-rack', code: 'AST-RJ-08', category: 'rrjet', layer: 'rrjeti', mount: 'wall', height: 0, power: 100,
    names: { sq: 'Rack 19" (kabineti i rrjetit)', en: '19" rack (network cabinet)', it: 'Armadio rack 19"', de: '19"-Netzwerkschrank' },
    parts: [{ d: rect(-12, 0, 12, 18) }, { d: 'M-12 0 L12 18 M-9 4.5 H9 M-9 9 H9 M-9 13.5 H9' }],
  },
  {
    id: 'rj-ont', code: 'AST-RJ-09', category: 'rrjet', layer: 'rrjeti', mount: 'wall', height: 180, power: 10,
    names: { sq: 'Modem fibre / ONT', en: 'Fibre modem / ONT', it: 'Modem fibra / ONT', de: 'Glasfasermodem / ONT' },
    parts: [{ d: rect(-11, 0, 11, 14) }, { d: strokeText('ONT', 0, 7, 5.5) }],
  },
  {
    id: 'rj-mesh', code: 'AST-RJ-10', category: 'rrjet', layer: 'rrjeti', mount: 'center', power: 10,
    names: { sq: 'Wi-Fi mesh / repeater', en: 'Wi-Fi mesh / repeater', it: 'Wi-Fi mesh / ripetitore', de: 'WLAN-Mesh / Repeater' },
    parts: [{ d: rect(-8, -8, 8, 8) }, { d: 'M-5 -1 A7 7 0 0 1 5 -1 M-2.8 2 A3.6 3.6 0 0 1 2.8 2' }, { d: circle(0, 4.5, 1.2), fill: true }],
  },
  {
    id: 'rj-rj45', code: 'AST-RJ-11', category: 'rrjet', layer: 'rrjeti', mount: 'wall', height: 30,
    names: { sq: 'Prizë rrjeti RJ45 e thjeshtë', en: 'Single RJ45 data outlet', it: 'Presa dati RJ45 singola', de: 'Datendose RJ45 einfach' },
    parts: [{ d: 'M0 0 V5' }, { d: 'M-7 5 H7 L0 16 Z' }],
  },

  // ---- Sinjalizim zjarri ----
  {
    id: 'zj-tym', code: 'AST-ZJ-01', category: 'zjarr', layer: 'zjarri', mount: 'center', detector: { angle: 140, maxRadius: 7.5, maxHeight: 10.5 },
    names: { sq: 'Detektor optik tymi', en: 'Optical smoke detector', it: 'Rivelatore ottico di fumo', de: 'Optischer Rauchmelder' },
    parts: [{ d: circle(0, 0, 10) }, { d: strokeText('S', 0, 0, 9) }],
  },
  {
    id: 'zj-nxehtesi', code: 'AST-ZJ-02', category: 'zjarr', layer: 'zjarri', mount: 'center', detector: { angle: 126, maxRadius: 5.3, maxHeight: 9 },
    names: { sq: 'Detektor nxehtësie', en: 'Heat detector', it: 'Rivelatore di calore', de: 'Wärmemelder' },
    parts: [{ d: circle(0, 0, 10) }, { d: strokeText('T', 0, 0, 9) }],
  },
  {
    id: 'zj-multi', code: 'AST-ZJ-03', category: 'zjarr', layer: 'zjarri', mount: 'center', detector: { angle: 140, maxRadius: 7.5, maxHeight: 10.5 },
    names: { sq: 'Detektor multisensor (tym + nxehtësi)', en: 'Multisensor detector (smoke + heat)', it: 'Rivelatore multisensore (fumo + calore)', de: 'Multisensormelder (Rauch + Wärme)' },
    parts: [{ d: circle(0, 0, 10) }, { d: strokeText('ST', 0, 0, 7) }],
  },
  {
    id: 'zj-buton', code: 'AST-ZJ-04', category: 'zjarr', layer: 'zjarri', mount: 'wall', height: 140,
    names: { sq: 'Buton alarmi manual', en: 'Manual call point', it: 'Pulsante di allarme manuale', de: 'Handfeuermelder' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-9, 3, 9, 21) }, { d: circle(0, 12, 4), fill: true }],
  },
  {
    id: 'zj-sirene', code: 'AST-ZJ-05', category: 'zjarr', layer: 'zjarri', mount: 'wall', height: 250,
    names: { sq: 'Sirenë alarmi', en: 'Alarm sounder', it: 'Sirena di allarme', de: 'Alarmsirene' },
    parts: [{ d: 'M0 0 V3' }, { d: 'M-4 3 H4 L10 17 H-10 Z' }, { d: 'M-6 20.5 Q0 23.5 6 20.5' }],
  },
  {
    id: 'zj-flash', code: 'AST-ZJ-06', category: 'zjarr', layer: 'zjarri', mount: 'wall', height: 250,
    names: { sq: 'Sirenë me flash', en: 'Sounder with flasher', it: 'Sirena con lampeggiante', de: 'Sirene mit Blitzleuchte' },
    parts: [{ d: 'M0 0 V3' }, { d: 'M-4 3 H4 L10 17 H-10 Z' }, { d: 'M1.5 6.5 L-2 11.5 H2 L-1.5 16', fill: false }, { d: 'M-6 20.5 Q0 23.5 6 20.5' }],
  },
  {
    id: 'zj-qendra', code: 'AST-ZJ-07', category: 'zjarr', layer: 'zjarri', mount: 'wall', height: 150, power: 50,
    names: { sq: 'Qendër sinjalizimi zjarri', en: 'Fire alarm control panel', it: 'Centrale rivelazione incendi', de: 'Brandmelderzentrale' },
    parts: [{ d: rect(-13, 0, 13, 18) }, { d: strokeText('FACP', 0, 9, 5.5) }],
  },
  {
    id: 'zj-modul', code: 'AST-ZJ-08', category: 'zjarr', layer: 'zjarri', mount: 'center',
    names: { sq: 'Modul hyrje / dalje', en: 'Input / output module', it: 'Modulo ingresso / uscita', de: 'Ein- / Ausgangsmodul' },
    parts: [{ d: rect(-9, -8, 9, 8) }, { d: strokeText('IO', 0, 0, 7) }],
  },
  {
    id: 'zj-magnet', code: 'AST-ZJ-09', category: 'zjarr', layer: 'zjarri', mount: 'wall', height: 200,
    names: { sq: 'Mbajtës magnetik dere', en: 'Magnetic door holder', it: 'Elettromagnete per porte', de: 'Türhaftmagnet' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-8, 3, 8, 15) }, { d: strokeText('M', 0, 9, 6) }, { d: 'M-8 18 H8' }],
  },
  {
    id: 'zj-beam', code: 'AST-ZJ-10', category: 'zjarr', layer: 'zjarri', mount: 'wall', height: 600, beam: { range: 50, half: 7.5, maxHeight: 25 },
    names: { sq: 'Detektor linear me rreze', en: 'Beam smoke detector', it: 'Rivelatore lineare a barriera', de: 'Linienförmiger Rauchmelder' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-7, 3, 7, 11) }, { d: 'M0 11 V13.5 M0 16 V18.5 M0 21 V23.5' }],
  },
  {
    id: 'zj-gaz', code: 'AST-ZJ-11', category: 'zjarr', layer: 'zjarri', mount: 'wall', height: 30, power: 3,
    names: { sq: 'Detektor gazi (metan / GLP / CO)', en: 'Gas detector (methane / LPG / CO)', it: 'Rivelatore gas (metano / GPL / CO)', de: 'Gasmelder (Methan / Flüssiggas / CO)' },
    parts: [{ d: 'M0 0 V3' }, { d: circle(0, 12, 9) }, { d: strokeText('G', 0, 12, 8) }],
  },
  {
    id: 'zj-sprinkler', code: 'AST-ZJ-12', category: 'zjarr', layer: 'zjarri', mount: 'center',
    names: { sq: 'Sprinkler', en: 'Sprinkler head', it: 'Sprinkler', de: 'Sprinklerkopf' },
    parts: [{ d: circle(0, 0, 6) }, { d: 'M-10 0 H-6 M6 0 H10 M0 -10 V-6 M0 6 V10 M-7 -7 L-4.2 -4.2 M7 7 L4.2 4.2 M-7 7 L-4.2 4.2 M7 -7 L4.2 -4.2' }],
  },
  {
    id: 'zj-fikes', code: 'AST-ZJ-13', category: 'zjarr', layer: 'zjarri', mount: 'wall', height: 120,
    names: { sq: 'Zjarrfikës portativ', en: 'Portable fire extinguisher', it: 'Estintore portatile', de: 'Feuerlöscher' },
    parts: [{ d: 'M0 0 V3' }, { d: 'M-5 3 H5 V19 A5 2 0 0 1 -5 19 Z' }, { d: 'M-2 3 V0.5 H4' }],
  },
  {
    id: 'zj-hidrant', code: 'AST-ZJ-14', category: 'zjarr', layer: 'zjarri', mount: 'wall', height: 150,
    names: { sq: 'Hidrant / kuti zjarrfikëse me zorrë', en: 'Fire hose cabinet', it: 'Idrante a muro / naspo', de: 'Wandhydrant' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-10, 3, 10, 19) }, { d: circle(0, 11, 5) }, { d: circle(0, 11, 1.5), fill: true }],
  },

  // ---- Industriale (400 V) ----
  {
    id: 'in-cee16', code: 'AST-IN-01', category: 'industri', layer: 'prizat', mount: 'wall', height: 110, power: 4000, phases: 3,
    names: { sq: 'Prizë CEE 16 A 400 V (5P)', en: 'CEE socket 16 A 400 V (5P)', it: 'Presa CEE 16 A 400 V (5P)', de: 'CEE-Steckdose 16 A 400 V (5P)' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-10, 3, 10, 21) }, { d: strokeText('16', 0, 8, 5) }, { d: strokeText('3~', 0, 16, 5) }],
  },
  {
    id: 'in-cee32', code: 'AST-IN-02', category: 'industri', layer: 'prizat', mount: 'wall', height: 110, power: 8000, phases: 3,
    names: { sq: 'Prizë CEE 32 A 400 V (5P)', en: 'CEE socket 32 A 400 V (5P)', it: 'Presa CEE 32 A 400 V (5P)', de: 'CEE-Steckdose 32 A 400 V (5P)' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-10, 3, 10, 21) }, { d: strokeText('32', 0, 8, 5) }, { d: strokeText('3~', 0, 16, 5) }],
  },
  {
    id: 'in-cee63', code: 'AST-IN-03', category: 'industri', layer: 'prizat', mount: 'wall', height: 110, power: 16000, phases: 3,
    names: { sq: 'Prizë CEE 63 A 400 V (5P)', en: 'CEE socket 63 A 400 V (5P)', it: 'Presa CEE 63 A 400 V (5P)', de: 'CEE-Steckdose 63 A 400 V (5P)' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-10, 3, 10, 21) }, { d: strokeText('63', 0, 8, 5) }, { d: strokeText('3~', 0, 16, 5) }],
  },
  {
    id: 'in-cee230', code: 'AST-IN-04', category: 'industri', layer: 'prizat', mount: 'wall', height: 110, power: 2000,
    names: { sq: 'Prizë CEE 16 A 230 V (3P)', en: 'CEE socket 16 A 230 V (3P)', it: 'Presa CEE 16 A 230 V (3P)', de: 'CEE-Steckdose 16 A 230 V (3P)' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-10, 3, 10, 21) }, { d: strokeText('16', 0, 8, 5) }, { d: strokeText('1~', 0, 16, 5) }],
  },
  {
    id: 'in-motor', code: 'AST-IN-05', category: 'industri', layer: 'pajisje', mount: 'center', power: 5500, phases: 3,
    names: { sq: 'Motor trefazor', en: 'Three-phase motor', it: 'Motore trifase', de: 'Drehstrommotor' },
    parts: [{ d: circle(0, 0, 11) }, { d: strokeText('M', 0, -3, 6) }, { d: strokeText('3~', 0, 5, 4.5) }],
  },
  {
    id: 'in-izolator', code: 'AST-IN-06', category: 'industri', layer: 'pajisje', mount: 'wall', height: 150, phases: 3,
    names: { sq: 'Çelës sigurie rrotullues 3P', en: 'Rotary safety isolator 3P', it: 'Sezionatore rotativo 3P', de: 'Reparaturschalter 3P' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-9, 3, 9, 19) }, { d: circle(0, 11, 5) }, { d: 'M-3.5 14.5 L3.5 7.5' }],
  },
  {
    id: 'in-kuadri3f', code: 'AST-IN-07', category: 'industri', layer: 'pajisje', mount: 'wall', height: 160, phases: 3,
    names: { sq: 'Kuadër trefazor 400 V', en: 'Three-phase distribution board 400 V', it: 'Quadro trifase 400 V', de: 'Drehstromverteiler 400 V' },
    parts: [{ d: rect(-18, 0, 18, 16) }, { d: 'M-18 16 L18 0 L18 16 Z', fill: true }, { d: strokeText('3~', -9, 5, 5) }],
  },
  {
    id: 'in-highbay', code: 'AST-IN-08', category: 'industri', layer: 'ndricimi', mount: 'center', power: 150,
    names: { sq: 'Ndriçues high-bay LED', en: 'LED high-bay luminaire', it: 'Proiettore high-bay LED', de: 'LED-Hallenleuchte' },
    parts: [{ d: circle(0, 0, 12) }, { d: circle(0, 0, 6) }, { d: 'M-12 0 H-6 M6 0 H12 M0 -12 V-6 M0 6 V12' }],
  },
  {
    id: 'in-linear', code: 'AST-IN-09', category: 'industri', layer: 'ndricimi', mount: 'center', power: 50,
    names: { sq: 'Ndriçues linear industrial IP65', en: 'Industrial linear luminaire IP65', it: 'Plafoniera lineare industriale IP65', de: 'Feuchtraum-Wannenleuchte IP65' },
    parts: [{ d: rect(-18, -5, 18, 5) }, { d: 'M-18 0 H18' }, { d: 'M-12 -5 V5 M12 -5 V5' }],
  },

  // ---- Çelësa pulsantë dhe me çelës ----
  {
    id: 'cl-pulsant-dyfishe', code: 'AST-CL-15', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Çelës pulsant i dyfishtë', en: 'Double push-button switch', it: 'Pulsante doppio', de: 'Doppeltaster' },
    parts: [{ d: 'M0 0 V4 M-6 6 V4 H6 V6' }, { d: `${circle(-6, 11, 5)} ${circle(6, 11, 5)}` }, { d: `${circle(-6, 11, 1.8)} ${circle(6, 11, 1.8)}`, fill: true }],
  },
  {
    id: 'cl-pulsant-ip44', code: 'AST-CL-16', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Çelës pulsant IP44 (banjo, jashtë)', en: 'Push-button switch IP44 (wet areas)', it: 'Pulsante IP44', de: 'Feuchtraumtaster IP44' },
    parts: [{ d: 'M0 0 V5' }, { d: circle(0, 11, 6) }, { d: circle(0, 11, 2.2), fill: true }, { d: strokeText('IP', -12, 20, 5) }],
  },
  {
    id: 'cl-celes-kyc', code: 'AST-CL-17', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Çelës me kyç', en: 'Key-operated switch', it: 'Interruttore a chiave', de: 'Schlüsselschalter' },
    parts: [SWITCH_DOT, SWITCH_BLADE, { d: `${circle(-10, 17, 2.5)} M-7.5 17 H-3 M-4.5 17 V19` }],
  },

  // ---- Pajisje (230 V / 400 V) ----
  {
    id: 'pj-ups', code: 'AST-PJ-20', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 30, power: 1000,
    names: { sq: 'UPS (furnizim i pandërprerë)', en: 'UPS (uninterruptible power supply)', it: 'Gruppo di continuità (UPS)', de: 'USV (unterbrechungsfreie Stromversorgung)' },
    parts: APPLIANCE([{ d: strokeText('UPS', 0, 13, 5.5) }]),
  },
  {
    id: 'pj-ev22', code: 'AST-PJ-21', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 120, power: 22000, phases: 3,
    names: { sq: 'Karikues makine elektrike 22 kW 400 V', en: 'EV charger 22 kW 400 V', it: 'Wallbox ricarica auto 22 kW 400 V', de: 'Wallbox 22 kW 400 V' },
    parts: [...APPLIANCE([{ d: 'M1.5 5.5 L-4 14 H0.5 L-1.5 20.5 L4.5 11 H0 Z', fill: true }]), { d: strokeText('3~', 16, 21, 4) }],
  },
  {
    id: 'pj-pompe-nxehtesie', code: 'AST-PJ-22', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 30, power: 8000, phases: 3,
    names: { sq: 'Pompë nxehtësie 400 V', en: 'Heat pump 400 V', it: 'Pompa di calore 400 V', de: 'Wärmepumpe 400 V' },
    parts: [...APPLIANCE([{ d: circle(0, 13, 7) }, { d: 'M0 13 Q4 9 0 6.5 M0 13 Q-4 17 0 19.5 M0 13 Q4 17 6.5 13 M0 13 Q-4 9 -6.5 13' }]), { d: strokeText('3~', 16, 21, 4) }],
  },
  {
    id: 'pj-sobe3', code: 'AST-PJ-23', category: 'pajisje', layer: 'pajisje', mount: 'center', power: 7500, phases: 3,
    names: { sq: 'Sobë elektrike trefazore 400 V', en: 'Three-phase electric cooker 400 V', it: 'Piano cottura trifase 400 V', de: 'Elektroherd Drehstrom 400 V' },
    parts: [
      { d: 'M-12 -12 H12 V12 H-12 Z' },
      { d: `${circle(-5.5, -5.5, 3.5)} ${circle(5.5, -5.5, 3.5)} ${circle(-5.5, 5.5, 3.5)} ${circle(5.5, 5.5, 3.5)}` },
      { d: strokeText('3~', 16, -9, 4) },
    ],
  },

  // ---- Aparate mbrojtëse (IEC 60617) ----
  {
    id: 'mb-automat', code: 'AST-MB-01', category: 'mbrojtje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Automat (MCB) 1P+N 230 V', en: 'Circuit breaker (MCB) 1P+N 230 V', it: 'Interruttore magnetotermico 1P+N 230 V', de: 'Leitungsschutzschalter 1P+N 230 V' },
    parts: [{ d: 'M0 -13 V-5 M0 6 L-6 -4 M0 6 V13' }, CROSS(0, -5, 2)],
  },
  {
    id: 'mb-automat3', code: 'AST-MB-02', category: 'mbrojtje', layer: 'pajisje', mount: 'center', phases: 3,
    names: { sq: 'Automat (MCB) 3P+N 400 V', en: 'Circuit breaker (MCB) 3P+N 400 V', it: 'Interruttore magnetotermico 3P+N 400 V', de: 'Leitungsschutzschalter 3P+N 400 V' },
    parts: [{ d: 'M0 -13 V-5 M0 6 L-6 -4 M0 6 V13 M-3 11 L3 8.5' }, CROSS(0, -5, 2), { d: strokeText('3~', 9, 8, 4.5) }],
  },
  {
    id: 'mb-rcd', code: 'AST-MB-03', category: 'mbrojtje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Diferencial (RCD) 2P 30 mA 230 V', en: 'Residual current device (RCD) 2P 30 mA 230 V', it: 'Interruttore differenziale 2P 30 mA 230 V', de: 'FI-Schutzschalter 2P 30 mA 230 V' },
    parts: [{ d: 'M0 -13 V-5 M-2 -5 H2 M0 6 L-6 -4 M0 6 V13' }, { d: `${circle(0, 9.5, 2.8)} M-2.8 9.5 H-9 V0 L-4.5 0` }],
  },
  {
    id: 'mb-rcd4', code: 'AST-MB-04', category: 'mbrojtje', layer: 'pajisje', mount: 'center', phases: 3,
    names: { sq: 'Diferencial (RCD) 4P 400 V', en: 'Residual current device (RCD) 4P 400 V', it: 'Interruttore differenziale 4P 400 V', de: 'FI-Schutzschalter 4P 400 V' },
    parts: [{ d: 'M0 -13 V-5 M-2 -5 H2 M0 6 L-6 -4 M0 6 V13' }, { d: `${circle(0, 9.5, 2.8)} M-2.8 9.5 H-9 V0 L-4.5 0` }, { d: strokeText('3~', 9, -8, 4.5) }],
  },
  {
    id: 'mb-rcbo', code: 'AST-MB-05', category: 'mbrojtje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Automat diferencial (RCBO) 1P+N', en: 'RCBO 1P+N', it: 'Magnetotermico differenziale 1P+N', de: 'FI/LS-Schalter 1P+N' },
    parts: [{ d: 'M0 -13 V-5 M0 6 L-6 -4 M0 6 V13' }, CROSS(0, -5, 2), { d: `${circle(0, 9.5, 2.8)} M-2.8 9.5 H-9 V0 L-4.5 0` }],
  },
  {
    id: 'mb-siguresa', code: 'AST-MB-06', category: 'mbrojtje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Siguresë', en: 'Fuse', it: 'Fusibile', de: 'Sicherung' },
    parts: [{ d: rect(-3.5, -9, 3.5, 9) }, { d: 'M0 -13 V13' }],
  },
  {
    id: 'mb-siguresa3', code: 'AST-MB-07', category: 'mbrojtje', layer: 'pajisje', mount: 'center', phases: 3,
    names: { sq: 'Siguresa trefazore (NH) 400 V', en: 'Three-phase fuses (NH) 400 V', it: 'Fusibili trifase (NH) 400 V', de: 'NH-Sicherungen dreipolig 400 V' },
    parts: [{ d: `${rect(-11, -8, -5, 8)} ${rect(-3, -8, 3, 8)} ${rect(5, -8, 11, 8)}` }, { d: 'M-8 -12 V12 M0 -12 V12 M8 -12 V12' }],
  },
  {
    id: 'mb-spd', code: 'AST-MB-08', category: 'mbrojtje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Mbrojtëse nga mbitensioni (SPD)', en: 'Surge protective device (SPD)', it: 'Scaricatore di sovratensione (SPD)', de: 'Überspannungsschutz (SPD)' },
    parts: [{ d: rect(-5, -8, 5, 7) }, { d: 'M0 -13 V-8 M0 7 V10 M-6 10 H6 M-3.5 12 H3.5 M-1.2 14 H1.2' }, { d: 'M-7 4 H-3.5 L3.5 -5' }],
  },
  {
    id: 'mb-sezionator', code: 'AST-MB-09', category: 'mbrojtje', layer: 'pajisje', mount: 'center', phases: 3,
    names: { sq: 'Sezionator kryesor 4P 400 V', en: 'Main switch-disconnector 4P 400 V', it: 'Sezionatore generale 4P 400 V', de: 'Hauptschalter 4P 400 V' },
    parts: [{ d: 'M0 -13 V-5 M-3 -5 H3 M0 6 L-6 -4 M0 6 V13' }, { d: strokeText('3~', 9, 8, 4.5) }],
  },

  // ---- Rele dhe kontaktorë (IEC 60617) ----
  {
    id: 'kd-teleruptor', code: 'AST-KD-01', category: 'komandim', layer: 'pajisje', mount: 'center',
    names: { sq: 'Rele impulsi (teleruptor)', en: 'Impulse relay', it: 'Relè passo-passo (teleruttore)', de: 'Stromstoßschalter' },
    parts: [{ d: rect(-9, -6, 9, 6) }, { d: 'M0 -12 V-6 M0 6 V12' }, { d: 'M-6 3 H-2 V-3 H2 V3 H6' }],
  },
  {
    id: 'kd-kontaktor', code: 'AST-KD-02', category: 'komandim', layer: 'pajisje', mount: 'center',
    names: { sq: 'Kontaktor 230 V', en: 'Contactor 230 V', it: 'Contattore 230 V', de: 'Schütz 230 V' },
    parts: [{ d: rect(-9, -6, 9, 6) }, { d: 'M0 -12 V-6 M0 6 V12' }, { d: strokeText('KM', 0, 0, 5) }],
  },
  {
    id: 'kd-kontaktor3', code: 'AST-KD-03', category: 'komandim', layer: 'pajisje', mount: 'center', phases: 3,
    names: { sq: 'Kontaktor trefazor 400 V', en: 'Three-phase contactor 400 V', it: 'Contattore trifase 400 V', de: 'Leistungsschütz 400 V' },
    parts: [{ d: rect(-9, -6, 9, 6) }, { d: 'M0 -12 V-6 M0 6 V12' }, { d: strokeText('KM', 0, 0, 5) }, { d: strokeText('3~', 13, -10, 4) }],
  },
  {
    id: 'kd-rele', code: 'AST-KD-04', category: 'komandim', layer: 'pajisje', mount: 'center',
    names: { sq: 'Rele ndihmës', en: 'Auxiliary relay', it: 'Relè ausiliario', de: 'Hilfsrelais' },
    parts: [{ d: rect(-9, -6, 9, 6) }, { d: 'M0 -12 V-6 M0 6 V12' }, { d: strokeText('K', 0, 0, 5) }],
  },
  {
    id: 'kd-kohe', code: 'AST-KD-05', category: 'komandim', layer: 'pajisje', mount: 'center',
    names: { sq: 'Rele kohe', en: 'Timer relay', it: 'Relè temporizzato', de: 'Zeitrelais' },
    parts: [{ d: rect(-9, -6, 9, 6) }, { d: 'M0 -12 V-6 M0 6 V12' }, { d: strokeText('KT', 0, 0, 5) }],
  },
  {
    id: 'kd-termik', code: 'AST-KD-06', category: 'komandim', layer: 'pajisje', mount: 'center', phases: 3,
    names: { sq: 'Rele termik 400 V', en: 'Thermal overload relay 400 V', it: 'Relè termico 400 V', de: 'Motorschutzrelais 400 V' },
    parts: [{ d: rect(-9, -6, 9, 6) }, { d: 'M0 -12 V-6 M0 6 V12' }, { d: 'M-6 1.5 H-2.5 V-2.5 H2.5 V1.5 H6' }, { d: strokeText('3~', 13, -10, 4) }],
  },
  {
    id: 'kd-salvamotor', code: 'AST-KD-07', category: 'komandim', layer: 'pajisje', mount: 'center', phases: 3,
    names: { sq: 'Salvamotor (mbrojtje motori) 400 V', en: 'Motor protection breaker 400 V', it: 'Salvamotore 400 V', de: 'Motorschutzschalter 400 V' },
    parts: [{ d: rect(-10, -10, 10, 10) }, { d: strokeText('QM', 0, -3, 5) }, { d: strokeText('3~', 0, 4.5, 4) }],
  },
  {
    id: 'kd-yll-trekendesh', code: 'AST-KD-08', category: 'komandim', layer: 'pajisje', mount: 'center', phases: 3,
    names: { sq: 'Ndezës yll-trekëndësh 400 V', en: 'Star-delta starter 400 V', it: 'Avviatore stella-triangolo 400 V', de: 'Stern-Dreieck-Anlauf 400 V' },
    parts: [{ d: rect(-11, -9, 11, 9) }, { d: strokeText('Y', -4.5, 0, 7) }, { d: 'M1.5 3.5 L5 -3.5 L8.5 3.5 Z' }],
  },
  {
    id: 'kd-stop', code: 'AST-KD-09', category: 'komandim', layer: 'pajisje', mount: 'wall', height: 120,
    names: { sq: 'Buton ndalimi emergjent', en: 'Emergency stop button', it: 'Pulsante di arresto di emergenza', de: 'Not-Halt-Taster' },
    parts: [{ d: 'M0 0 V4' }, { d: rect(-9, 4, 9, 22) }, { d: 'M-7 16 A7 7 0 0 1 7 16 Z', fill: true }, { d: 'M0 16 V20' }],
  },
  {
    id: 'kd-programues', code: 'AST-KD-10', category: 'komandim', layer: 'pajisje', mount: 'center',
    names: { sq: 'Programues ore (orar)', en: 'Time switch', it: 'Interruttore orario', de: 'Zeitschaltuhr' },
    parts: [{ d: rect(-10, -10, 10, 10) }, { d: circle(0, 0, 6.5) }, { d: 'M0 0 V-4.5 M0 0 L3.5 2' }],
  },
  {
    id: 'kd-ats', code: 'AST-KD-11', category: 'komandim', layer: 'pajisje', mount: 'wall', height: 160, phases: 3,
    names: { sq: 'Ndërrues automatik rrjet-gjenerator (ATS) 400 V', en: 'Automatic transfer switch (ATS) 400 V', it: 'Commutatore automatico rete-gruppo (ATS) 400 V', de: 'Netzumschalter (ATS) 400 V' },
    parts: [{ d: rect(-13, 0, 13, 16) }, { d: strokeText('ATS', 0, 6, 5.5) }, { d: strokeText('3~', 0, 12.5, 4) }],
  },

  // ---- Matës dhe instrumente ----
  {
    id: 'mt-matesi3', code: 'AST-MT-01', category: 'matje', layer: 'pajisje', mount: 'wall', height: 160, phases: 3,
    names: { sq: 'Matës energjie trefazor 400 V', en: 'Three-phase electricity meter 400 V', it: 'Contatore trifase 400 V', de: 'Drehstromzähler 400 V' },
    parts: [{ d: rect(-12, 0, 12, 18) }, { d: strokeText('WH', 0, 6.5, 5) }, { d: strokeText('3~', 0, 13.5, 4) }],
  },
  {
    id: 'mt-ampermeter', code: 'AST-MT-02', category: 'matje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Ampermetër', en: 'Ammeter', it: 'Amperometro', de: 'Amperemeter' },
    parts: [{ d: circle(0, 0, 9) }, { d: strokeText('A', 0, 0, 8) }],
  },
  {
    id: 'mt-voltmeter', code: 'AST-MT-03', category: 'matje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Voltmetër', en: 'Voltmeter', it: 'Voltmetro', de: 'Voltmeter' },
    parts: [{ d: circle(0, 0, 9) }, { d: strokeText('V', 0, 0, 8) }],
  },
  {
    id: 'mt-analizator', code: 'AST-MT-04', category: 'matje', layer: 'pajisje', mount: 'center', phases: 3,
    names: { sq: 'Analizator rrjeti 400 V', en: 'Power analyser 400 V', it: 'Analizzatore di rete 400 V', de: 'Netzanalysator 400 V' },
    parts: [{ d: rect(-12, -9, 12, 9) }, { d: strokeText('PM', 0, -2.5, 5) }, { d: strokeText('3~', 0, 4.5, 4) }],
  },
  {
    id: 'mt-ct', code: 'AST-MT-05', category: 'matje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Transformator rryme (CT)', en: 'Current transformer (CT)', it: 'Trasformatore amperometrico (TA)', de: 'Stromwandler' },
    parts: [{ d: 'M0 -13 V13' }, { d: circle(0, 0, 5) }, { d: 'M5 -2 H10 M5 2 H10' }],
  },

  // ---- Sinjalizim dhe alarm ----
  {
    id: 'sg-llambe', code: 'AST-SG-01', category: 'sinjalizim', layer: 'pajisje', mount: 'center', power: 1,
    names: { sq: 'Llambë sinjalizimi', en: 'Indicator lamp', it: 'Lampada di segnalazione', de: 'Meldeleuchte' },
    parts: [{ d: circle(0, 0, 6) }, CROSS(0, 0, 4.2), { d: 'M-11 0 H-6 M6 0 H11' }],
  },
  {
    id: 'sg-bilbil', code: 'AST-SG-02', category: 'sinjalizim', layer: 'pajisje', mount: 'center', power: 2,
    names: { sq: 'Bilbil (buzzer)', en: 'Buzzer', it: 'Ronzatore (buzzer)', de: 'Summer' },
    parts: [{ d: 'M-8 -4 A8 8 0 0 0 8 -4 Z' }, { d: 'M-4 -4 V-10 M4 -4 V-10' }],
  },
  {
    id: 'sg-bori', code: 'AST-SG-03', category: 'sinjalizim', layer: 'pajisje', mount: 'wall', height: 250, power: 10,
    names: { sq: 'Bori (sirenë)', en: 'Horn', it: 'Avvisatore acustico (tromba)', de: 'Hupe' },
    parts: [{ d: 'M0 0 V4' }, { d: 'M-4 4 H4 V9 L10 20 H-10 L-4 9 Z' }],
  },
  {
    id: 'sg-sos', code: 'AST-SG-04', category: 'sinjalizim', layer: 'pajisje', mount: 'wall', height: 100,
    names: { sq: 'Thirrje ndihme SOS (tualet për persona me aftësi të kufizuara)', en: 'SOS call point (accessible toilet)', it: 'Chiamata di soccorso SOS (bagno disabili)', de: 'Notruf SOS (barrierefreies WC)' },
    parts: [{ d: 'M0 0 V4' }, { d: rect(-12, 4, 12, 18) }, { d: strokeText('SOS', 0, 11, 5.5) }],
  },
  {
    id: 'sg-fener', code: 'AST-SG-05', category: 'sinjalizim', layer: 'pajisje', mount: 'center', power: 5,
    names: { sq: 'Fener paralajmërues (rrotullues)', en: 'Warning beacon', it: 'Lampeggiante rotante', de: 'Rundumleuchte' },
    parts: [{ d: circle(0, 0, 5.5), fill: true }, { d: 'M0 -8 V-12 M0 8 V12 M-8 0 H-12 M8 0 H12 M-5.7 -5.7 L-8.5 -8.5 M5.7 -5.7 L8.5 -8.5 M-5.7 5.7 L-8.5 8.5 M5.7 5.7 L8.5 8.5' }],
  },

  // ---- Industriale (plotësim, 400 V) ----
  {
    id: 'in-cee125', code: 'AST-IN-10', category: 'industri', layer: 'prizat', mount: 'wall', height: 110, power: 32000, phases: 3,
    names: { sq: 'Prizë CEE 125 A 400 V (5P)', en: 'CEE socket 125 A 400 V (5P)', it: 'Presa CEE 125 A 400 V (5P)', de: 'CEE-Steckdose 125 A 400 V (5P)' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-10, 3, 10, 21) }, { d: strokeText('125', 0, 8, 4.5) }, { d: strokeText('3~', 0, 16, 5) }],
  },
  {
    id: 'in-ashensor', code: 'AST-IN-11', category: 'industri', layer: 'pajisje', mount: 'center', power: 7500, phases: 3,
    names: { sq: 'Ashensor 400 V', en: 'Lift 400 V', it: 'Ascensore 400 V', de: 'Aufzug 400 V' },
    parts: [{ d: rect(-12, -12, 12, 12) }, { d: 'M-12 -12 L12 12 M12 -12 L-12 12' }, { d: 'M-4 -6 L0 -9.5 L4 -6 M-4 6 L0 9.5 L4 6' }],
  },
  {
    id: 'in-kompresor', code: 'AST-IN-12', category: 'industri', layer: 'pajisje', mount: 'center', power: 4000, phases: 3,
    names: { sq: 'Kompresor 400 V', en: 'Compressor 400 V', it: 'Compressore 400 V', de: 'Kompressor 400 V' },
    parts: [{ d: circle(0, 0, 10) }, { d: 'M-8.7 -5 L8 -2.5 M-8.7 5 L8 2.5' }, { d: strokeText('3~', 14, -11, 4) }],
  },
  {
    id: 'in-ventilator', code: 'AST-IN-13', category: 'industri', layer: 'pajisje', mount: 'center', power: 3000, phases: 3,
    names: { sq: 'Ventilator industrial 400 V', en: 'Industrial fan 400 V', it: 'Ventilatore industriale 400 V', de: 'Industrieventilator 400 V' },
    parts: [{ d: circle(0, 0, 10) }, { d: 'M0 0 Q4 -5 0 -7.5 M0 0 Q-4 5 0 7.5 M0 0 Q5 4 7.5 0 M0 0 Q-5 -4 -7.5 0' }, { d: strokeText('3~', 14, -11, 4) }],
  },
  {
    id: 'in-gjenerator', code: 'AST-IN-14', category: 'industri', layer: 'pajisje', mount: 'center', phases: 3,
    names: { sq: 'Gjenerator 400 V', en: 'Generator 400 V', it: 'Gruppo elettrogeno 400 V', de: 'Stromaggregat 400 V' },
    parts: [{ d: circle(0, 0, 11) }, { d: strokeText('G', 0, -3, 6) }, { d: strokeText('3~', 0, 5, 4.5) }],
  },
  {
    id: 'in-transformator', code: 'AST-IN-15', category: 'industri', layer: 'pajisje', mount: 'center', phases: 3,
    names: { sq: 'Transformator 400/230 V', en: 'Transformer 400/230 V', it: 'Trasformatore 400/230 V', de: 'Transformator 400/230 V' },
    parts: [{ d: `${circle(0, -4.5, 7)} ${circle(0, 4.5, 7)}` }, { d: 'M0 -11.5 V-14 M0 11.5 V14' }],
  },
  {
    id: 'in-kondensator', code: 'AST-IN-16', category: 'industri', layer: 'pajisje', mount: 'wall', height: 160, phases: 3,
    names: { sq: 'Bateri kondensatorësh (rifazim) 400 V', en: 'Power factor correction capacitors 400 V', it: 'Batteria di rifasamento 400 V', de: 'Blindstromkompensation 400 V' },
    parts: [{ d: rect(-12, 0, 12, 18) }, { d: 'M-4 3 V8 M-9 8 H1 M-9 10.5 H1 M-4 10.5 V15' }, { d: strokeText('3~', 6.5, 9, 4) }],
  },

  // ---- Priza (plotësim 2) ----
  {
    id: 'pr-me-diferencial', code: 'AST-PR-14', category: 'priza', layer: 'prizat', mount: 'wall', height: 30,
    names: { sq: 'Prizë me diferencial (RCD)', en: 'Socket with RCD', it: 'Presa con differenziale', de: 'Steckdose mit FI-Schutz' },
    parts: [...SOCKET, EARTH, { d: `${circle(14, 13, 3)} M11 13 H8` }],
  },
  {
    id: 'pr-me-llambe', code: 'AST-PR-15', category: 'priza', layer: 'prizat', mount: 'wall', height: 30,
    names: { sq: 'Prizë me llambë sinjali', en: 'Socket with pilot lamp', it: 'Presa con spia', de: 'Steckdose mit Kontrollleuchte' },
    parts: [...SOCKET, EARTH, { d: circle(14, 13, 3.5) }, CROSS(14, 13, 2.4)],
  },
  {
    id: 'pr-ip67', code: 'AST-PR-16', category: 'priza', layer: 'prizat', mount: 'wall', height: 50,
    names: { sq: 'Prizë e jashtme IP67 me kapak', en: 'Outdoor socket IP67 with lid', it: 'Presa da esterno IP67 con coperchio', de: 'Außensteckdose IP67 mit Deckel' },
    parts: [{ d: 'M0 0 V8' }, { d: `${SOCKET_ARC} Z`, fill: true }, EARTH, { d: 'M-12 21 H12' }, { d: strokeText('IP67', 0, 25, 4) }],
  },
  {
    id: 'pr-pike-lidhje', code: 'AST-PR-17', category: 'priza', layer: 'prizat', mount: 'wall', height: 60,
    names: { sq: 'Pikë lidhjeje për pajisje fikse (dalje kablloje)', en: 'Fixed appliance connection point', it: 'Punto di allacciamento apparecchio fisso', de: 'Geräteanschlussdose' },
    parts: [{ d: 'M0 0 V8' }, { d: circle(0, 13, 5) }, { d: 'M-5 13 H5' }],
  },
  {
    id: 'pr-dedikuar', code: 'AST-PR-18', category: 'priza', layer: 'prizat', mount: 'wall', height: 30,
    names: { sq: 'Prizë e dedikuar (UPS / kompjuter)', en: 'Dedicated socket (UPS / IT)', it: 'Presa dedicata (UPS / IT)', de: 'Separate Steckdose (USV / EDV)' },
    parts: [{ d: 'M0 0 V8' }, { d: `${SOCKET_ARC} Z`, fill: true }, EARTH, { d: strokeText('UPS', 0, 22.5, 4.5) }],
  },

  // ---- Çelësa (plotësim 2) ----
  {
    id: 'cl-dypolar', code: 'AST-CL-18', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Çelës dypolar', en: 'Double-pole switch', it: 'Interruttore bipolare', de: 'Zweipoliger Schalter' },
    parts: [SWITCH_DOT, SWITCH_BLADE, { d: 'M4 17 L7 14 M6 19 L9 16' }],
  },
  {
    id: 'cl-tripolar', code: 'AST-CL-19', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110, phases: 3,
    names: { sq: 'Çelës tripolar 400 V', en: 'Three-pole switch 400 V', it: 'Interruttore tripolare 400 V', de: 'Dreipoliger Schalter 400 V' },
    parts: [SWITCH_DOT, SWITCH_BLADE, { d: 'M3 16 L6 13 M5 18 L8 15 M7 20 L10 17' }, { d: strokeText('3~', -10, 19, 4) }],
  },
  {
    id: 'cl-dimmer-devijator', code: 'AST-CL-20', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Dimmer devijator', en: 'Two-way dimmer', it: 'Dimmer deviatore', de: 'Wechsel-Dimmer' },
    parts: [SWITCH_DOT, { d: 'M-8 2 L8 18 L11 15 M-8 2 L-11 5' }, { d: 'M-14 22 L-7 15 L-7 22 Z', fill: true }],
  },
  {
    id: 'cl-prekje', code: 'AST-CL-21', category: 'celesa', layer: 'ndricimi', mount: 'wall', height: 110,
    names: { sq: 'Çelës me prekje (touch)', en: 'Touch switch', it: 'Interruttore touch', de: 'Berührungsschalter' },
    parts: [{ d: 'M0 0 V4' }, { d: rect(-8, 4, 8, 20) }, { d: `${circle(0, 12, 4)}` }, { d: circle(0, 12, 1.5), fill: true }],
  },

  // ---- Ndriçim (plotësim 2) ----
  {
    id: 'nd-binar', code: 'AST-ND-16', category: 'ndricim', layer: 'ndricimi', mount: 'center', power: 60,
    names: { sq: 'Binar me spote', en: 'Track lighting', it: 'Binario con faretti', de: 'Stromschiene mit Strahlern' },
    parts: [{ d: 'M-16 0 H16 M-16 -2 V2 M16 -2 V2' }, { d: `${circle(-9, 0, 3)} ${circle(0, 0, 3)} ${circle(9, 0, 3)}` }],
  },
  {
    id: 'nd-aplik-jashte', code: 'AST-ND-17', category: 'ndricim', layer: 'ndricimi', mount: 'wall', height: 220, power: 15,
    names: { sq: 'Aplik i jashtëm IP44', en: 'Outdoor wall light IP44', it: 'Applique da esterno IP44', de: 'Außenwandleuchte IP44' },
    parts: [{ d: 'M0 0 V4' }, { d: circle(0, 12, 8) }, CROSS(0, 12, 5.6), { d: 'M-8 12 A8 8 0 0 0 8 12 Z', fill: true }],
  },
  {
    id: 'nd-shtylle', code: 'AST-ND-18', category: 'ndricim', layer: 'ndricimi', mount: 'center', power: 60,
    names: { sq: 'Ndriçues rrugor në shtyllë', en: 'Street light on pole', it: 'Lampione stradale', de: 'Mastleuchte' },
    parts: [{ d: circle(0, 0, 3), fill: true }, { d: 'M0 0 H11' }, { d: circle(13, 0, 4) }, CROSS(13, 0, 2.8)],
  },
  {
    id: 'nd-ventilator-tavani', code: 'AST-ND-19', category: 'ndricim', layer: 'ndricimi', mount: 'center', power: 75,
    names: { sq: 'Ventilator tavani me dritë', en: 'Ceiling fan with light', it: 'Ventilatore a soffitto con luce', de: 'Deckenventilator mit Leuchte' },
    parts: [{ d: circle(0, 0, 4) }, CROSS(0, 0, 2.8), { d: 'M4 0 Q10 -4 13 0 Q10 3 4 0 M-4 0 Q-10 4 -13 0 Q-10 -3 -4 0 M0 4 Q-4 10 0 13 Q3 10 0 4 M0 -4 Q4 -10 0 -13 Q-3 -10 0 -4' }],
  },
  {
    id: 'nd-tavan-sensor', code: 'AST-ND-20', category: 'ndricim', layer: 'ndricimi', mount: 'center', power: 20,
    names: { sq: 'Ndriçues tavani me sensor lëvizjeje', en: 'Ceiling light with motion sensor', it: 'Plafoniera con sensore di movimento', de: 'Deckenleuchte mit Bewegungsmelder' },
    parts: [{ d: circle(0, 0, 10) }, CROSS(0, 0, 7), { d: 'M-5 12 L-7 15 M0 12.5 V15.5 M5 12 L7 15' }],
  },
  {
    id: 'nd-dysheme', code: 'AST-ND-21', category: 'ndricim', layer: 'ndricimi', mount: 'center', power: 10,
    names: { sq: 'Ndriçues i futur në dysheme / tokë', en: 'In-ground uplight', it: 'Faretto da incasso a pavimento', de: 'Bodeneinbauleuchte' },
    parts: [{ d: rect(-8, -8, 8, 8) }, { d: circle(0, 0, 5) }, CROSS(0, 0, 3.5)],
  },
  {
    id: 'nd-pishine', code: 'AST-ND-22', category: 'ndricim', layer: 'ndricimi', mount: 'center', power: 30,
    names: { sq: 'Ndriçues pishine (12 V)', en: 'Pool light (12 V)', it: 'Faro per piscina (12 V)', de: 'Poolscheinwerfer (12 V)' },
    parts: [{ d: circle(0, 0, 8) }, CROSS(0, 0, 5.6), { d: 'M-12 11 Q-9 9 -6 11 Q-3 13 0 11 Q3 9 6 11 Q9 13 12 11' }],
  },

  // ---- Kuadro, kuti, tokëzim (plotësim 2) ----
  {
    id: 'kp-kuti-ip', code: 'AST-KP-06', category: 'pajisje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Kuti shpërndarëse IP65', en: 'Junction box IP65', it: 'Scatola di derivazione IP65', de: 'Feuchtraum-Abzweigdose IP65' },
    parts: [{ d: 'M-6 -6 H6 V6 H-6 Z' }, { d: 'M-6 -6 L6 6 L6 -6 Z', fill: true }],
  },
  {
    id: 'kp-kuti-matesi', code: 'AST-KP-07', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 120,
    names: { sq: 'Kuti matësi (në hyrje të objektit)', en: 'Meter cabinet', it: 'Armadio contatori', de: 'Zählerschrank' },
    parts: [{ d: rect(-14, 0, 14, 18) }, { d: 'M0 0 V18' }, { d: strokeText('WH', -7, 9, 5) }, { d: 'M3 14 L11 4' }],
  },
  {
    id: 'kp-ngjitet', code: 'AST-KP-08', category: 'pajisje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Kabllo ngjitet lart', en: 'Wiring going up', it: 'Linea in salita', de: 'Leitung nach oben' },
    parts: [{ d: circle(0, 0, 2.5), fill: true }, { d: 'M0 0 L9 -9 M4 -9 H9 V-4' }],
  },
  {
    id: 'kp-zbret', code: 'AST-KP-09', category: 'pajisje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Kabllo zbret poshtë', en: 'Wiring going down', it: 'Linea in discesa', de: 'Leitung nach unten' },
    parts: [{ d: circle(0, 0, 2.5), fill: true }, { d: 'M0 0 L9 9 M4 9 H9 V4' }],
  },
  {
    id: 'kp-kalon', code: 'AST-KP-10', category: 'pajisje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Kabllo kalon vertikalisht', en: 'Wiring passing vertically', it: 'Linea passante verticale', de: 'Leitung durchgehend' },
    parts: [{ d: circle(0, 0, 2.5), fill: true }, { d: 'M-9 9 L9 -9 M4 -9 H9 V-4 M-4 9 H-9 V4' }],
  },
  {
    id: 'kp-barazim', code: 'AST-KP-11', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 50,
    names: { sq: 'Shinë barazimi potenciali', en: 'Equipotential bonding bar', it: 'Collettore equipotenziale', de: 'Potentialausgleichsschiene' },
    parts: [{ d: 'M0 0 V4' }, { d: rect(-13, 4, 13, 9), fill: true }, { d: 'M-9 9 V13 M-3 9 V13 M3 9 V13 M9 9 V13' }, { d: 'M-5 17 H5 M-3 19.5 H3 M-1 22 H1' }],
  },
  {
    id: 'kp-rrufe', code: 'AST-KP-12', category: 'pajisje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Rrufepritës', en: 'Lightning rod', it: 'Parafulmine', de: 'Fangstange (Blitzschutz)' },
    parts: [{ d: circle(0, 0, 9) }, { d: 'M2 -7 L-3 1 H2 L-2 7', fill: false }],
  },
  {
    id: 'kp-tokezues', code: 'AST-KP-13', category: 'pajisje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Elektrodë tokëzimi (kunj)', en: 'Earth electrode (rod)', it: 'Dispersore (picchetto)', de: 'Erder (Staberder)' },
    parts: [{ d: circle(0, 0, 9) }, { d: 'M0 -6 V0 M-6 0 H6 M-4 3 H4 M-2 6 H2' }],
  },
  {
    id: 'kp-kantier', code: 'AST-KP-14', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 100, phases: 3,
    names: { sq: 'Kuadër kantieri me priza 400 V', en: 'Construction site board 400 V', it: 'Quadro da cantiere 400 V', de: 'Baustromverteiler 400 V' },
    parts: [{ d: rect(-16, 0, 16, 16) }, { d: 'M-16 16 L16 0 L16 16 Z', fill: true }, { d: 'M-12 21 A4 4 0 0 1 -4 21 M4 21 A4 4 0 0 1 12 21' }, { d: strokeText('3~', -9, 5, 5) }],
  },

  // ---- Pajisje (plotësim 2) ----
  {
    id: 'pj-ngrohes-menjehershem', code: 'AST-PJ-24', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 150, power: 18000, phases: 3,
    names: { sq: 'Ngrohës uji i menjëhershëm 400 V', en: 'Instantaneous water heater 400 V', it: 'Scaldacqua istantaneo 400 V', de: 'Durchlauferhitzer 400 V' },
    parts: [...APPLIANCE([{ d: 'M-7 13 L-3.5 8 L0 18 L3.5 8 L7 13' }]), { d: strokeText('3~', 16, 21, 4) }],
  },
  {
    id: 'pj-ngrohje-dysheme', code: 'AST-PJ-25', category: 'pajisje', layer: 'pajisje', mount: 'center', power: 1500,
    names: { sq: 'Ngrohje elektrike në dysheme', en: 'Electric underfloor heating', it: 'Riscaldamento elettrico a pavimento', de: 'Elektrische Fußbodenheizung' },
    parts: [{ d: rect(-14, -10, 14, 10) }, { d: 'M-10 -6 H10 V-2 H-10 V2 H10 V6 H-10' }],
  },
  {
    id: 'pj-peshqir', code: 'AST-PJ-26', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 60, power: 500,
    names: { sq: 'Ngrohës peshqirësh', en: 'Towel heater', it: 'Scaldasalviette', de: 'Handtuchheizkörper' },
    parts: [{ d: 'M0 0 V4' }, { d: rect(-9, 4, 9, 22) }, { d: 'M-9 8.5 H9 M-9 13 H9 M-9 17.5 H9' }],
  },
  {
    id: 'pj-mikrovale', code: 'AST-PJ-27', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 150, power: 1200,
    names: { sq: 'Mikrovalë', en: 'Microwave oven', it: 'Forno a microonde', de: 'Mikrowelle' },
    parts: APPLIANCE([{ d: 'M-7 10 Q-5 8 -3 10 Q-1 12 1 10 Q3 8 5 10 M-7 16 Q-5 14 -3 16 Q-1 18 1 16 Q3 14 5 16' }]),
  },
  {
    id: 'pj-saune', code: 'AST-PJ-28', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 30, power: 9000, phases: 3,
    names: { sq: 'Ngrohës saune 400 V', en: 'Sauna heater 400 V', it: 'Stufa per sauna 400 V', de: 'Saunaofen 400 V' },
    parts: [...APPLIANCE([{ d: 'M-5 20 Q-8 15 -5 11 Q-2 7 -5 4 M2 20 Q-1 15 2 11 Q5 7 2 4' }]), { d: strokeText('3~', 16, 21, 4) }],
  },
  {
    id: 'pj-kaldaje', code: 'AST-PJ-29', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 150, power: 150,
    names: { sq: 'Kaldajë (ngrohje qendrore)', en: 'Central heating boiler', it: 'Caldaia', de: 'Heizkessel' },
    parts: APPLIANCE([{ d: 'M0 20 Q-6 15 -3 10 Q-1 13 0 8 Q4 13 4 16 Q4 20 0 20 Z' }]),
  },
  {
    id: 'pj-tharese-duarsh', code: 'AST-PJ-30', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 120, power: 1800,
    names: { sq: 'Tharëse duarsh', en: 'Hand dryer', it: 'Asciugamani elettrico', de: 'Händetrockner' },
    parts: [{ d: 'M0 0 V4' }, { d: rect(-9, 4, 9, 14) }, { d: 'M-4 17 V22 M0 17 V23 M4 17 V22' }],
  },
  {
    id: 'pj-transformator-zile', code: 'AST-PJ-31', category: 'pajisje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Transformator sigurie 230/12 V', en: 'Safety transformer 230/12 V', it: 'Trasformatore di sicurezza 230/12 V', de: 'Sicherheitstransformator 230/12 V' },
    parts: [{ d: `${circle(-4, 0, 6.5)} ${circle(4, 0, 6.5)}` }, { d: 'M-12 0 H-10.5 M10.5 0 H12' }],
  },
  {
    id: 'pj-vrf', code: 'AST-PJ-32', category: 'pajisje', layer: 'pajisje', mount: 'center', power: 12000, phases: 3,
    names: { sq: 'Njësi e jashtme klime VRF 400 V', en: 'VRF outdoor unit 400 V', it: 'Unità esterna VRF 400 V', de: 'VRF-Außengerät 400 V' },
    parts: [{ d: rect(-14, -11, 14, 11) }, { d: circle(-5, 0, 6) }, { d: 'M-5 0 L-1 -4 M-5 0 L-9 4 M-5 0 L-1 4 M-5 0 L-9 -4' }, { d: strokeText('3~', 7, 0, 4.5) }],
  },
  {
    id: 'pj-bateri-ruajtje', code: 'AST-PJ-33', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 30,
    names: { sq: 'Bateri ruajtëse energjie (fotovoltaik)', en: 'Battery energy storage', it: 'Batteria di accumulo', de: 'Batteriespeicher' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-11, 3, 11, 21) }, { d: 'M-5 9 V15 M-2 10.5 V13.5 M2 9 V15 M5 10.5 V13.5 M-8 12 H-5 M5 12 H8' }],
  },
  {
    id: 'pj-brave', code: 'AST-PJ-34', category: 'pajisje', layer: 'pajisje', mount: 'wall', height: 100,
    names: { sq: 'Bravë elektrike (hapëse dere)', en: 'Electric door opener', it: 'Elettroserratura', de: 'Türöffner' },
    parts: [{ d: 'M0 0 V4' }, { d: rect(-6, 4, 6, 20) }, { d: 'M-3 8 H3 L-1 12 H3 L-2 17' }],
  },

  // ---- Sensorë (plotësim 2) ----
  {
    id: 'sn-prezence', code: 'AST-SN-08', category: 'sensore', layer: 'pajisje', mount: 'center',
    names: { sq: 'Sensor prezence tavani 360°', en: 'Ceiling presence detector 360°', it: 'Rilevatore di presenza a soffitto 360°', de: 'Präsenzmelder Decke 360°' },
    parts: [{ d: circle(0, 0, 9) }, { d: 'M-9 0 A9 9 0 0 0 9 0 Z', fill: true }, { d: 'M-12 -6 L-15 -9 M12 -6 L15 -9 M0 -12 V-15' }],
  },
  {
    id: 'sn-ere-shi', code: 'AST-SN-09', category: 'sensore', layer: 'pajisje', mount: 'wall', height: 300,
    names: { sq: 'Sensor ere dhe shiu (grila, tenda)', en: 'Wind and rain sensor', it: 'Sensore vento e pioggia', de: 'Wind- und Regensensor' },
    parts: [{ d: 'M0 0 V4' }, { d: circle(0, 12, 8) }, { d: 'M-5 10 Q-2 8 1 10 Q4 12 6 10 M-5 14 Q-2 12 1 14 Q4 16 6 14' }],
  },
  {
    id: 'sn-co', code: 'AST-SN-10', category: 'sensore', layer: 'pajisje', mount: 'wall', height: 150,
    names: { sq: 'Detektor monoksidi karboni (CO)', en: 'Carbon monoxide detector (CO)', it: 'Rilevatore di monossido di carbonio (CO)', de: 'Kohlenmonoxidmelder (CO)' },
    parts: [{ d: 'M0 0 V4' }, { d: circle(0, 12, 8) }, { d: strokeText('CO', 0, 12, 6) }],
  },
  {
    id: 'sn-temperature', code: 'AST-SN-11', category: 'sensore', layer: 'pajisje', mount: 'wall', height: 150,
    names: { sq: 'Sensor temperature', en: 'Temperature sensor', it: 'Sonda di temperatura', de: 'Temperaturfühler' },
    parts: [{ d: 'M0 0 V4' }, { d: circle(0, 12, 8) }, { d: 'M0 7 V13' }, { d: circle(0, 14.5, 2), fill: true }],
  },
  {
    id: 'sn-kontakt-dere', code: 'AST-SN-12', category: 'sensore', layer: 'pajisje', mount: 'wall', height: 200,
    names: { sq: 'Kontakt magnetik dere / dritareje', en: 'Magnetic door / window contact', it: 'Contatto magnetico porta / finestra', de: 'Magnetkontakt Tür / Fenster' },
    parts: [{ d: 'M0 0 V4' }, { d: `${rect(-8, 4, -1, 12)} ${rect(1, 4, 8, 12)}` }, { d: rect(-8, 4, -1, 12), fill: true }],
  },

  // ---- Aparate mbrojtëse (plotësim 2) ----
  {
    id: 'mb-automat2p', code: 'AST-MB-10', category: 'mbrojtje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Automat 2P 230 V (fazë + neutër)', en: 'Circuit breaker 2P 230 V', it: 'Interruttore magnetotermico 2P 230 V', de: 'Leitungsschutzschalter 2P 230 V' },
    parts: [{ d: 'M0 -13 V-5 M0 6 L-6 -4 M0 6 V13 M-3 10.5 L3 8 M-3 12.5 L3 10' }, CROSS(0, -5, 2)],
  },
  {
    id: 'mb-mccb', code: 'AST-MB-11', category: 'mbrojtje', layer: 'pajisje', mount: 'center', phases: 3,
    names: { sq: 'Ndërprerës fuqie (MCCB) 400 V', en: 'Moulded case circuit breaker (MCCB) 400 V', it: 'Interruttore scatolato (MCCB) 400 V', de: 'Leistungsschalter (MCCB) 400 V' },
    parts: [{ d: rect(-12, -12, 12, 12) }, { d: 'M0 -12 V-5 M0 6 L-6 -4 M0 6 V12' }, CROSS(0, -5, 2), { d: strokeText('3~', 7, 7, 4) }],
  },
  {
    id: 'mb-spd3', code: 'AST-MB-12', category: 'mbrojtje', layer: 'pajisje', mount: 'center', phases: 3,
    names: { sq: 'Mbrojtëse nga mbitensioni (SPD) 3P+N 400 V', en: 'Surge protective device (SPD) 3P+N 400 V', it: 'Scaricatore di sovratensione (SPD) 3P+N 400 V', de: 'Überspannungsschutz (SPD) 3P+N 400 V' },
    parts: [{ d: rect(-5, -8, 5, 7) }, { d: 'M0 -13 V-8 M0 7 V10 M-6 10 H6 M-3.5 12 H3.5 M-1.2 14 H1.2' }, { d: 'M-7 4 H-3.5 L3.5 -5' }, { d: strokeText('3~', 10, -9, 4) }],
  },
  {
    id: 'mb-sezionator-siguresa', code: 'AST-MB-13', category: 'mbrojtje', layer: 'pajisje', mount: 'center', phases: 3,
    names: { sq: 'Sezionator me siguresa 400 V', en: 'Fuse switch-disconnector 400 V', it: 'Sezionatore portafusibili 400 V', de: 'Sicherungslasttrennschalter 400 V' },
    parts: [{ d: 'M0 -13 V-7 M-3 -7 H3 M0 8 L-7 -5' }, { d: 'M-2.6 5.3 L-6.3 -0.6 L-3.9 -2 L-0.2 3.9 Z' }, { d: 'M0 8 V13' }, { d: strokeText('3~', 9, 8, 4.5) }],
  },
  {
    id: 'mb-tension', code: 'AST-MB-14', category: 'mbrojtje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Rele mbrojtje tensioni (U< U>)', en: 'Voltage protection relay (U< U>)', it: 'Relè di protezione tensione (U< U>)', de: 'Spannungsschutzrelais (U< U>)' },
    parts: [{ d: rect(-11, -8, 11, 8) }, { d: strokeText('U<>', 0, 0, 6) }],
  },
  {
    id: 'mb-faza', code: 'AST-MB-15', category: 'mbrojtje', layer: 'pajisje', mount: 'center', phases: 3,
    names: { sq: 'Rele kontrolli i fazave 400 V', en: 'Phase monitoring relay 400 V', it: 'Relè controllo fasi 400 V', de: 'Phasenüberwachungsrelais 400 V' },
    parts: [{ d: rect(-11, -9, 11, 9) }, { d: strokeText('L123', 0, -2.5, 4.5) }, { d: strokeText('3~', 0, 4.5, 4) }],
  },

  // ---- Rele dhe komandim (plotësim 2) ----
  {
    id: 'kd-vfd', code: 'AST-KD-12', category: 'komandim', layer: 'pajisje', mount: 'wall', height: 160, power: 200, phases: 3,
    names: { sq: 'Variator frekuence (inverter motori) 400 V', en: 'Variable frequency drive (VFD) 400 V', it: 'Inverter per motore 400 V', de: 'Frequenzumrichter 400 V' },
    parts: [{ d: rect(-12, 0, 12, 18) }, { d: 'M-12 18 L12 0' }, { d: 'M-9 6 Q-7.5 4 -6 6 Q-4.5 8 -3 6' }, { d: 'M3 13 Q4.5 11 6 13 Q7.5 15 9 13' }, { d: strokeText('3~', 16, 21, 4) }],
  },
  {
    id: 'kd-softstarter', code: 'AST-KD-13', category: 'komandim', layer: 'pajisje', mount: 'center', phases: 3,
    names: { sq: 'Ndezës i butë (soft starter) 400 V', en: 'Soft starter 400 V', it: 'Avviatore statico (soft starter) 400 V', de: 'Sanftanlasser 400 V' },
    parts: [{ d: rect(-11, -9, 11, 9) }, { d: 'M-7 5 L-2 5 L3 -5 L7 -5' }, { d: strokeText('3~', 14, -11, 4) }],
  },
  {
    id: 'kd-trafo-komandimi', code: 'AST-KD-14', category: 'komandim', layer: 'pajisje', mount: 'center',
    names: { sq: 'Transformator komandimi 230/24 V', en: 'Control transformer 230/24 V', it: 'Trasformatore di comando 230/24 V', de: 'Steuertransformator 230/24 V' },
    parts: [{ d: `${circle(0, -4.5, 6.5)} ${circle(0, 4.5, 6.5)}` }, { d: strokeText('24', 12, 6, 4) }],
  },
  {
    id: 'kd-ushqyes', code: 'AST-KD-15', category: 'komandim', layer: 'pajisje', mount: 'center',
    names: { sq: 'Ushqyes 24 V DC', en: 'Power supply 24 V DC', it: 'Alimentatore 24 V DC', de: 'Netzteil 24 V DC' },
    parts: [{ d: rect(-11, -9, 11, 9) }, { d: 'M-11 9 L11 -9' }, { d: 'M-9 -4 Q-7.5 -6 -6 -4 Q-4.5 -2 -3 -4' }, { d: 'M3 4 H9 M3 6.5 H4.5 M6 6.5 H7.5' }],
  },
  {
    id: 'kd-plc', code: 'AST-KD-16', category: 'komandim', layer: 'pajisje', mount: 'center',
    names: { sq: 'Kontrollues programues (PLC)', en: 'Programmable logic controller (PLC)', it: 'Controllore programmabile (PLC)', de: 'Speicherprogrammierbare Steuerung (SPS)' },
    parts: [{ d: rect(-13, -9, 13, 9) }, { d: strokeText('PLC', 0, 0, 6) }],
  },
  {
    id: 'kd-fundkursi', code: 'AST-KD-17', category: 'komandim', layer: 'pajisje', mount: 'center',
    names: { sq: 'Çelës fundkursi (limit)', en: 'Limit switch', it: 'Finecorsa', de: 'Endschalter' },
    parts: [{ d: 'M0 -13 V-5 M0 6 L-6 -4 M0 6 V13' }, { d: 'M-6 -4 L-9 -1 M-6 -4 H-10' }],
  },
  {
    id: 'kd-notues', code: 'AST-KD-18', category: 'komandim', layer: 'pajisje', mount: 'center',
    names: { sq: 'Çelës notues (niveli i ujit)', en: 'Float switch', it: 'Interruttore a galleggiante', de: 'Schwimmerschalter' },
    parts: [{ d: 'M0 -13 V-5 M0 6 L-6 -4 M0 6 V13' }, { d: `M-3 -4 H-9 ${circle(-12, -4, 3)}` }],
  },
  {
    id: 'kd-selektor', code: 'AST-KD-19', category: 'komandim', layer: 'pajisje', mount: 'wall', height: 150,
    names: { sq: 'Selektor Man-0-Auto', en: 'Selector switch Man-0-Auto', it: 'Selettore Man-0-Aut', de: 'Wahlschalter Hand-0-Auto' },
    parts: [{ d: 'M0 0 V4' }, { d: rect(-10, 4, 10, 22) }, { d: circle(0, 15, 4) }, { d: 'M0 15 L0 8.5' }, { d: 'M-7 8 L-5 10 M7 8 L5 10' }],
  },
  {
    id: 'kd-start-stop', code: 'AST-KD-20', category: 'komandim', layer: 'pajisje', mount: 'wall', height: 150,
    names: { sq: 'Kuti butonash START / STOP', en: 'START / STOP push-button station', it: 'Pulsantiera MARCIA / ARRESTO', de: 'Tasterkombination EIN / AUS' },
    parts: [{ d: 'M0 0 V4' }, { d: rect(-12, 4, 12, 20) }, { d: circle(-5.5, 12, 3.5), fill: true }, { d: circle(5.5, 12, 3.5) }],
  },
  {
    id: 'kd-prioritet', code: 'AST-KD-21', category: 'komandim', layer: 'pajisje', mount: 'center',
    names: { sq: 'Rele prioriteti i ngarkesës', en: 'Load shedding relay', it: 'Relè di distacco carichi', de: 'Lastabwurfrelais' },
    parts: [{ d: rect(-9, -6, 9, 6) }, { d: 'M0 -12 V-6 M0 6 V12' }, { d: strokeText('P', -3, 0, 5) }, { d: 'M2 -3 L6 0 L2 3' }],
  },

  // ---- Matës (plotësim 2) ----
  {
    id: 'mt-dydrejtimesh', code: 'AST-MT-06', category: 'matje', layer: 'pajisje', mount: 'wall', height: 160,
    names: { sq: 'Matës energjie dydrejtimësh (fotovoltaik)', en: 'Bidirectional energy meter (PV)', it: 'Contatore bidirezionale (FV)', de: 'Zweirichtungszähler (PV)' },
    parts: [{ d: rect(-12, 0, 12, 18) }, { d: strokeText('WH', 0, 6, 5) }, { d: 'M-7 13.5 H7 M-4 11 L-7 13.5 L-4 16 M4 11 L7 13.5 L4 16' }],
  },
  {
    id: 'mt-vatmeter', code: 'AST-MT-07', category: 'matje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Vatmetër', en: 'Wattmeter', it: 'Wattmetro', de: 'Wattmeter' },
    parts: [{ d: circle(0, 0, 9) }, { d: strokeText('W', 0, 0, 8) }],
  },
  {
    id: 'mt-frekuence', code: 'AST-MT-08', category: 'matje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Frekuencmetër', en: 'Frequency meter', it: 'Frequenzimetro', de: 'Frequenzmesser' },
    parts: [{ d: circle(0, 0, 9) }, { d: strokeText('HZ', 0, 0, 6) }],
  },
  {
    id: 'mt-ore', code: 'AST-MT-09', category: 'matje', layer: 'pajisje', mount: 'center',
    names: { sq: 'Numërues orësh pune', en: 'Hour counter', it: 'Contaore', de: 'Betriebsstundenzähler' },
    parts: [{ d: rect(-11, -8, 11, 8) }, { d: strokeText('H', -5, 0, 6) }, { d: circle(5, 0, 4) }, { d: 'M5 0 V-2.5 M5 0 L7 1' }],
  },

  // ---- Sinjalizim (plotësim 2) ----
  {
    id: 'sg-ore', code: 'AST-SG-06', category: 'sinjalizim', layer: 'pajisje', mount: 'wall', height: 250, power: 3,
    names: { sq: 'Orë elektrike (sistem orësh)', en: 'Slave clock', it: 'Orologio elettrico', de: 'Nebenuhr' },
    parts: [{ d: 'M0 0 V4' }, { d: circle(0, 13, 9) }, { d: 'M0 13 V7 M0 13 L4 15' }],
  },
  {
    id: 'sg-tabele', code: 'AST-SG-07', category: 'sinjalizim', layer: 'pajisje', mount: 'wall', height: 220, power: 5,
    names: { sq: 'Tabelë e ndriçuar njoftimi', en: 'Illuminated indicator panel', it: 'Pannello luminoso di segnalazione', de: 'Leuchttableau' },
    parts: [{ d: 'M0 0 V4' }, { d: rect(-14, 4, 14, 16) }, { d: `${circle(-8, 10, 2.5)} ${circle(0, 10, 2.5)} ${circle(8, 10, 2.5)}` }],
  },

  // ---- Industriale (plotësim 2) ----
  {
    id: 'in-motor1', code: 'AST-IN-17', category: 'industri', layer: 'pajisje', mount: 'center', power: 1500,
    names: { sq: 'Motor njëfazor 230 V', en: 'Single-phase motor 230 V', it: 'Motore monofase 230 V', de: 'Wechselstrommotor 230 V' },
    parts: [{ d: circle(0, 0, 11) }, { d: strokeText('M', 0, -3, 6) }, { d: strokeText('1~', 0, 5, 4.5) }],
  },
  {
    id: 'in-pompe3', code: 'AST-IN-18', category: 'industri', layer: 'pajisje', mount: 'center', power: 5500, phases: 3,
    names: { sq: 'Pompë trefazore 400 V', en: 'Three-phase pump 400 V', it: 'Pompa trifase 400 V', de: 'Drehstrompumpe 400 V' },
    parts: [{ d: circle(0, 0, 10) }, { d: 'M-5 -8.66 L10 0 L-5 8.66' }, { d: strokeText('3~', 14, -11, 4) }],
  },
  {
    id: 'in-ngrohes', code: 'AST-IN-19', category: 'industri', layer: 'pajisje', mount: 'wall', height: 250, power: 9000, phases: 3,
    names: { sq: 'Ngrohës industrial me ajër 400 V', en: 'Industrial fan heater 400 V', it: 'Aerotermo elettrico 400 V', de: 'Elektro-Heizlüfter 400 V' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-11, 3, 11, 21) }, { d: 'M-8 9 L-5 6 L-2 9 L1 6 L4 9 L7 6' }, { d: 'M-6 14 H6 M-6 17 H6' }, { d: strokeText('3~', 16, 21, 4) }],
  },
  {
    id: 'in-saldim', code: 'AST-IN-20', category: 'industri', layer: 'prizat', mount: 'wall', height: 110, power: 10000, phases: 3,
    names: { sq: 'Makinë saldimi 400 V', en: 'Welding machine 400 V', it: 'Saldatrice 400 V', de: 'Schweißgerät 400 V' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-10, 3, 10, 21) }, { d: 'M-6 18 L0 8 L6 18 M-3 13 H3' }, { d: strokeText('3~', 15, 21, 4) }],
  },
  {
    id: 'in-vinc', code: 'AST-IN-21', category: 'industri', layer: 'pajisje', mount: 'center', power: 7500, phases: 3,
    names: { sq: 'Vinç / urë ngritëse 400 V', en: 'Overhead crane 400 V', it: 'Carroponte 400 V', de: 'Brückenkran 400 V' },
    parts: [{ d: 'M-15 -8 H15 M-15 8 H15' }, { d: rect(-5, -5, 5, 5) }, { d: 'M0 5 V9 M-2 9 Q-2 12 0 12 Q2 12 2 10' }, { d: strokeText('3~', 11, -12, 4) }],
  },
  {
    id: 'in-furre', code: 'AST-IN-22', category: 'industri', layer: 'pajisje', mount: 'center', power: 15000, phases: 3,
    names: { sq: 'Furrë industriale 400 V', en: 'Industrial oven 400 V', it: 'Forno industriale 400 V', de: 'Industrieofen 400 V' },
    parts: [{ d: rect(-13, -10, 13, 10) }, { d: rect(-9, -6, 9, 6) }, { d: 'M-6 3 L-4 -3 L-2 3 L0 -3 L2 3 L4 -3 L6 3' }, { d: strokeText('3~', 0, -13, 3.5) }],
  },
  {
    id: 'in-ups3', code: 'AST-IN-23', category: 'industri', layer: 'pajisje', mount: 'wall', height: 30, power: 2000, phases: 3,
    names: { sq: 'UPS trefazor 400 V', en: 'Three-phase UPS 400 V', it: 'UPS trifase 400 V', de: 'USV dreiphasig 400 V' },
    parts: [{ d: 'M0 0 V2' }, { d: rect(-13, 2, 13, 24) }, { d: strokeText('UPS', 0, 9, 5) }, { d: strokeText('3~', 0, 17, 4.5) }],
  },
  {
    id: 'in-inverter3', code: 'AST-IN-24', category: 'industri', layer: 'pajisje', mount: 'wall', height: 160, phases: 3,
    names: { sq: 'Inverter fotovoltaik trefazor 400 V', en: 'Three-phase PV inverter 400 V', it: 'Inverter fotovoltaico trifase 400 V', de: 'PV-Wechselrichter dreiphasig 400 V' },
    parts: [{ d: rect(-12, 0, 12, 16) }, { d: 'M-12 16 L12 0' }, { d: 'M-9 4 H-3 M-9 6.5 H-3' }, { d: 'M3 11.5 Q4.5 9.5 6 11.5 Q7.5 13.5 9 11.5' }, { d: strokeText('3~', 16, 19, 4) }],
  },

  // ---- Ndriçim emergjence (EN 1838) ----
  {
    id: 'em-tavan', code: 'AST-EM-01', category: 'emergjence', layer: 'emergjenca', mount: 'center', emergency: { lumens: 200 },
    names: { sq: 'Ndriçues emergjence tavani', en: 'Ceiling emergency luminaire', it: 'Lampada di emergenza a soffitto', de: 'Notleuchte Decke' },
    parts: [{ d: circle(0, 0, 10) }, { d: 'M-7 -7 L7 7 M-7 7 L7 -7' }, { d: circle(0, 0, 3), fill: true }],
  },
  {
    id: 'em-mur', code: 'AST-EM-02', category: 'emergjence', layer: 'emergjenca', mount: 'wall', height: 250, emergency: { lumens: 200 },
    names: { sq: 'Ndriçues emergjence muri', en: 'Wall emergency luminaire', it: 'Lampada di emergenza a parete', de: 'Notleuchte Wand' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-11, 3, 11, 15) }, { d: 'M-11 3 L11 15 M-11 15 L11 3' }, { d: circle(0, 9, 2.5), fill: true }],
  },
  {
    id: 'em-ip65', code: 'AST-EM-03', category: 'emergjence', layer: 'emergjenca', mount: 'center', emergency: { lumens: 300 },
    names: { sq: 'Ndriçues emergjence IP65', en: 'Emergency bulkhead IP65', it: 'Plafoniera di emergenza IP65', de: 'Notleuchte IP65' },
    parts: [{ d: rect(-13, -7, 13, 7) }, { d: 'M-13 -7 L13 7 M-13 7 L13 -7' }, { d: circle(0, 0, 3), fill: true }],
  },
  {
    id: 'em-spot', code: 'AST-EM-04', category: 'emergjence', layer: 'emergjenca', mount: 'wall', height: 300, emergency: { lumens: 1000 },
    names: { sq: 'Projektor emergjence me dy drita', en: 'Twin-spot emergency floodlight', it: 'Proiettore di emergenza a due fari', de: 'Not-Doppelscheinwerfer' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-6, 3, 6, 9) }, { d: circle(-6, 14, 4.5) }, { d: circle(6, 14, 4.5) }],
  },
  {
    id: 'em-exit-mur', code: 'AST-EM-05', category: 'emergjence', layer: 'emergjenca', mount: 'wall', height: 230, sign: { size: 150 },
    names: { sq: 'Tabelë EXIT muri', en: 'Wall exit sign', it: 'Segnaletica di uscita a parete', de: 'Rettungszeichenleuchte Wand' },
    parts: [{ d: 'M0 0 V3' }, { d: rect(-14, 3, 14, 15) }, { d: strokeText('EXIT', 0, 9, 5.5) }],
  },
  {
    id: 'em-exit-tavan', code: 'AST-EM-06', category: 'emergjence', layer: 'emergjenca', mount: 'center', sign: { size: 200 },
    names: { sq: 'Tabelë EXIT tavani me dy faqe', en: 'Double-sided ceiling exit sign', it: 'Segnaletica di uscita bifacciale a soffitto', de: 'Rettungszeichenleuchte Decke, beidseitig' },
    parts: [{ d: rect(-15, -6, 15, 6) }, { d: strokeText('EXIT', 0, 0, 5.5) }, { d: 'M-15 -9 H15 M-15 9 H15' }],
  },
  {
    id: 'em-bateri', code: 'AST-EM-07', category: 'emergjence', layer: 'emergjenca', mount: 'wall', height: 150, power: 100,
    names: { sq: 'Bateri qendrore emergjence', en: 'Central battery system', it: 'Soccorritore centralizzato', de: 'Zentralbatterieanlage' },
    parts: [{ d: rect(-13, 0, 13, 18) }, { d: strokeText('CB', 0, 9, 7) }],
  },
];

const BY_ID = new Map(SYMBOLS.map((s) => [s.id, s]));

/** Simbolet e krijuara nga përdoruesi në projektin aktual (shih symbols/custom.ts). */
let customDefs: SymbolDef[] = [];
const customById = new Map<string, SymbolDef>();

export function setCustomSymbols(defs: SymbolDef[]): void {
  customDefs = defs;
  customById.clear();
  for (const d of defs) customById.set(d.id, d);
}

/** Të gjithë simbolet: të krijuarit nga përdoruesi së pari, pastaj libraria standarde. */
export function allSymbols(): SymbolDef[] {
  return [...customDefs, ...SYMBOLS];
}

/** Emri i simbolit në gjuhën aktuale. */
export function symbolName(def: SymbolDef): string {
  return localName(def.names, def.id, 'symbols');
}

/** Emri i kategorisë në gjuhën aktuale. */
export function categoryName(cat: { id: CategoryId; names: Names }): string {
  return localName(cat.names, cat.id, 'categories');
}

export function symbolDef(id: string): SymbolDef | undefined {
  return BY_ID.get(id) ?? customById.get(id);
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
