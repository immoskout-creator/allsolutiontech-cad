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

export type Entity = Wall | SymbolEntity;

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
  layers: Layer[];
  entities: Entity[];
}

export const WALL_LAYER = 'muret';

export function defaultLayers(): Layer[] {
  return [
    { id: WALL_LAYER, name: 'Muret', color: '#2A2F37', visible: true, locked: false },
    { id: 'ndricimi', name: 'Ndriçimi', color: '#D97706', visible: true, locked: false },
    { id: 'prizat', name: 'Prizat', color: '#2563EB', visible: true, locked: false },
    { id: 'pajisje', name: 'Kuadro dhe pajisje', color: '#7C3AED', visible: true, locked: false },
    { id: 'kabllot', name: 'Kabllot', color: '#6B7380', visible: true, locked: false },
    { id: 'kuotat', name: 'Kuotat', color: '#4B5563', visible: true, locked: false },
    { id: 'tekstet', name: 'Tekstet', color: '#9AA3AF', visible: true, locked: false },
  ];
}

export function emptyDoc(name = 'Projekt i ri'): Doc {
  return { format: 'astcad', version: 1, name, layers: defaultLayers(), entities: [] };
}

export const isWall = (e: Entity): e is Wall => e.kind === 'wall';
export const isSymbol = (e: Entity): e is SymbolEntity => e.kind === 'symbol';

let counter = 0;
export function newId(prefix = 'e'): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
