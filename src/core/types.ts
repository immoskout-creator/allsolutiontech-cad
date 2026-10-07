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

export type Entity = Wall;

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
    { id: 'kabllot', name: 'Kabllot', color: '#6B7380', visible: true, locked: false },
    { id: 'kuotat', name: 'Kuotat', color: '#4B5563', visible: true, locked: false },
    { id: 'tekstet', name: 'Tekstet', color: '#9AA3AF', visible: true, locked: false },
  ];
}

export function emptyDoc(name = 'Projekt i ri'): Doc {
  return { format: 'astcad', version: 1, name, layers: defaultLayers(), entities: [] };
}

let counter = 0;
export function newId(prefix = 'e'): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
