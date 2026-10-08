import { CABLE_LAYER, isCable, type Circuit, type CircuitKind, type Doc } from './types';

/**
 * Sistemet e tensionit të ulët: kamerat (CCTV), rrjeti / AP dhe zjarri.
 * Linjat e tyre përdorin të njëjtat "qarqe" si energjia, por pa siguresë dhe seksion:
 * kablloja zgjidhet nga lista e sistemit dhe kontrollohet gjatësia e çdo kablloje.
 */
export type SystemKind = 'cctv' | 'network' | 'fire';
export const SYSTEM_KINDS: SystemKind[] = ['cctv', 'network', 'fire'];

export const isSystemKind = (k: CircuitKind): k is SystemKind => (SYSTEM_KINDS as string[]).includes(k);

export interface CableType {
  id: string;
  /** Përshkrimi pa gjuhë, del në listën e materialeve. */
  spec: string;
  /** Gjatësia maksimale e një kablloje, m. */
  maxRun?: number;
  /** Kablloja mbaron me konektorë RJ45 në të dy skajet. */
  rj45?: boolean;
}

const CAT6: CableType = { id: 'cat6', spec: 'U/UTP Cat6', maxRun: 90, rj45: true };
const CAT5E: CableType = { id: 'cat5e', spec: 'U/UTP Cat5e', maxRun: 90, rj45: true };

/** Kabllot e secilit sistem; i pari është i paracaktuari. */
export const SYSTEM_CABLES: Record<SystemKind, CableType[]> = {
  cctv: [CAT6, { id: 'cat6-pe', spec: 'F/UTP Cat6 PE', maxRun: 90, rj45: true }, CAT5E, { id: 'rg59', spec: 'RG59 + 2×0.75 mm²', maxRun: 300 }],
  network: [CAT6, { id: 'cat6a', spec: 'U/FTP Cat6A', maxRun: 90, rj45: true }, CAT5E, { id: 'om3', spec: 'OM3 4F', maxRun: 300 }],
  fire: [
    { id: 'ph30', spec: 'FE180 PH30 2×1.5 mm²' },
    { id: 'ph120', spec: 'FE180 PH120 2×1.5 mm²' },
    { id: 'jy', spec: 'J-Y(St)Y 2×2×0.8 mm' },
  ],
};

/** Numri maksimal i pajisjeve në një zonë zjarri. */
export const ZONE_MAX_DEVICES = 32;

/** Parashtesa e emrit të linjës: Q1 për energjinë, CAM1, NET1, FA1 për sistemet. */
export function circuitPrefix(kind: CircuitKind): string {
  return kind === 'cctv' ? 'CAM' : kind === 'network' ? 'NET' : kind === 'fire' ? 'FA' : 'Q';
}

/** Shtresa e simboleve dhe kabllove të çdo sistemi. */
export const SYSTEM_LAYER: Record<SystemKind, string> = { cctv: 'kamerat', network: 'rrjeti', fire: 'zjarri' };

export function cableTypeOf(c: Circuit): CableType {
  const list = isSystemKind(c.kind) ? SYSTEM_CABLES[c.kind] : [];
  return list.find((t) => t.id === c.cableType) ?? list[0];
}

/** Shtresa ku shkon kablloja sipas qarkut të saj. */
export function cableLayer(kind: CircuitKind | undefined): string {
  return kind && isSystemKind(kind) ? SYSTEM_LAYER[kind] : CABLE_LAYER;
}

/** Vendos çdo kabllo në shtresën e sistemit të qarkut të saj. */
export function syncCableLayers(doc: Doc): void {
  const kinds = new Map((doc.circuits ?? []).map((c) => [c.id, c.kind]));
  for (const e of doc.entities) if (isCable(e)) e.layer = cableLayer(e.circuit ? kinds.get(e.circuit) : undefined);
}
