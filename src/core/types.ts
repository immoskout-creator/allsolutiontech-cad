// Të gjitha koordinatat janë në milimetra, me boshtin Y lart (si në CAD).

export interface Vec {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  kind: 'wall';
  layer: string;
  a: Vec;
  b: Vec;
  /** Trashësia e murit në mm. */
  thickness: number;
}

/** Një simbol i vendosur në plan (prizë, çelës, ndriçues...). */
export interface SymbolEntity {
  id: string;
  kind: 'symbol';
  layer: string;
  /** Id e simbolit në librari, p.sh. "pr-schuko". */
  symbol: string;
  /** Pika e vendosjes: faqja e murit për simbolet e murit, qendra për të tjerët. */
  pos: Vec;
  /** Drejtimi nga muri drejt dhomës, në gradë (0 = djathtas, 90 = lart). */
  angle: number;
  /** Lartësia e montimit nga dyshemeja, cm. */
  height?: number;
  /** Fuqia, W. */
  power?: number;
}

/** Derë ose dritare e vendosur në një mur; ndjek murin kur ai lëviz. */
export interface Opening {
  id: string;
  kind: 'opening';
  layer: string;
  type: 'door' | 'window';
  /** Id e murit ku ndodhet. */
  wall: string;
  /** Largësia e qendrës nga fillimi i murit (a), mm. */
  t: number;
  /** Gjerësia e hapjes, mm. */
  width: number;
  /** Lartësia e hapjes, mm (skedarët e vjetër mund të mos e kenë). */
  height?: number;
  /** Parapeti i dritares: lartësia nga dyshemeja, mm. */
  sill?: number;
  /** Nga cila anë e murit hapet dera: 1 = majtas nga a te b, -1 = djathtas. */
  side: 1 | -1;
  /** Ku janë menteshat: te skaji nga a ose nga b. */
  hinge: 'a' | 'b';
}

/** Dhomë: emri dhe pika e etiketës; kontura dhe m² llogariten nga muret përreth. */
export interface Room {
  id: string;
  kind: 'room';
  layer: string;
  name: string;
  pos: Vec;
}

export type Entity = Wall | SymbolEntity | Opening | Room;

export interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
}

export interface Doc {
  format: 'astcad';
  version: 1;
  name: string;
  /** Shkalla e fletës, p.sh. 50 për 1:50. Përcakton madhësinë e simboleve, teksteve dhe kuotave. */
  scale: number;
  layers: Layer[];
  entities: Entity[];
}

export const WALL_LAYER = 'muret';
export const DIM_LAYER = 'kuotat';
export const OPENING_LAYER = 'hapjet';
export const ROOM_LAYER = 'dhomat';
export const SCALES = [20, 50, 100, 200] as const;
export const DEFAULT_SCALE = 50;

export function defaultLayers(): Layer[] {
  return [
    { id: WALL_LAYER, name: 'Muret', color: '#2A2F37', visible: true, locked: false },
    { id: OPENING_LAYER, name: 'Dyer dhe dritare', color: '#2A2F37', visible: true, locked: false },
    { id: ROOM_LAYER, name: 'Dhomat', color: '#0F766E', visible: true, locked: false },
    { id: 'ndricimi', name: 'Ndriçimi', color: '#D97706', visible: true, locked: false },
    { id: 'prizat', name: 'Prizat', color: '#2563EB', visible: true, locked: false },
    { id: 'pajisje', name: 'Kuadro dhe pajisje', color: '#7C3AED', visible: true, locked: false },
    { id: 'kabllot', name: 'Kabllot', color: '#6B7380', visible: true, locked: false },
    { id: 'kuotat', name: 'Kuotat', color: '#4B5563', visible: true, locked: false },
    { id: 'tekstet', name: 'Tekstet', color: '#9AA3AF', visible: true, locked: false },
  ];
}

export function emptyDoc(name = 'Projekt i ri'): Doc {
  return { format: 'astcad', version: 1, name, scale: DEFAULT_SCALE, layers: defaultLayers(), entities: [] };
}

export const isWall = (e: Entity): e is Wall => e.kind === 'wall';
export const isSymbol = (e: Entity): e is SymbolEntity => e.kind === 'symbol';
export const isOpening = (e: Entity): e is Opening => e.kind === 'opening';
export const isRoom = (e: Entity): e is Room => e.kind === 'room';

let counter = 0;
export function newId(prefix = 'e'): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
