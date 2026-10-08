import type { CircuitKind } from './core/types';
import type { LibraryId } from './symbols/library';
import type { StringKey } from './i18n/strings';

/**
 * Programet e AllSolutionTech CAD 2D: i njëjti motor vizatimi (muret, dyert, dhomat),
 * por secili me emrin, simbolet, linjat dhe ruajtjen e vet.
 * Programi zgjidhet gjatë ndërtimit (build.mjs → __EDITION__); pa të është ai elektrik.
 */
export type EditionId = 'civil' | 'cctv' | 'network' | 'fire' | 'emergency';

/** Programi i ndërtuar: një nga të veçantët ose 'all', të gjitha bashkë në një. */
export type ProgramId = EditionId | 'all';

export interface Edition<I extends ProgramId = ProgramId> {
  id: I;
  /** Shenja pas emrit "AllSolutionTech CAD 2D", e njëjtë në çdo gjuhë. */
  badge: string;
  /** Nëntitulli i përkthyer. */
  subKey: StringKey;
  lib: LibraryId;
  /** Vetëm te programi "të gjitha bashkë": libraritë e të gjithë programeve. */
  libs?: LibraryId[];
  /** Llojet e qarqeve/linjave; i pari është ai i qarkut të ri. */
  kinds: CircuitKind[];
  /** Shtresat e simboleve të programit (përveç atyre të ndërtimit). */
  layers: string[];
  /** Çelësi i ruajtjes automatike në shfletues, që programet të mos përziejnë projektet. */
  storage: string;
}

export const EDITIONS: { [K in EditionId]: Edition<K> } = {
  civil: { id: 'civil', badge: '', subKey: 'brandSub', lib: 'civil', kinds: ['sockets', 'lighting', 'appliance'], layers: ['ndricimi', 'prizat', 'pajisje'], storage: 'astcad.autosave.v1' },
  cctv: { id: 'cctv', badge: 'CCTV', subKey: 'brandSubCctv', lib: 'cctv', kinds: ['cctv'], layers: ['kamerat'], storage: 'astcad.cctv.autosave.v1' },
  network: { id: 'network', badge: 'AP', subKey: 'brandSubAp', lib: 'network', kinds: ['network'], layers: ['rrjeti'], storage: 'astcad.ap.autosave.v1' },
  fire: { id: 'fire', badge: 'FIRE', subKey: 'brandSubFire', lib: 'fire', kinds: ['fire'], layers: ['zjarri'], storage: 'astcad.fire.autosave.v1' },
  emergency: { id: 'emergency', badge: 'EMERGENCY', subKey: 'brandSubEm', lib: 'emergency', kinds: ['emergency'], layers: ['emergjenca'], storage: 'astcad.em.autosave.v1' },
};

const SINGLE = Object.values(EDITIONS);

/** Të gjitha programet bashkë: çdo librari, çdo lloj linje dhe çdo shtresë, me ruajtjen e vet. */
export const ALL_IN_ONE: Edition = {
  id: 'all',
  badge: 'ALL-IN-ONE',
  subKey: 'brandSub',
  lib: 'civil',
  libs: SINGLE.map((e) => e.lib),
  kinds: SINGLE.flatMap((e) => e.kinds),
  layers: SINGLE.flatMap((e) => e.layers),
  storage: 'astcad.all.autosave.v1',
};

declare const __EDITION__: string | undefined;

const chosen = typeof __EDITION__ === 'string' && __EDITION__ in EDITIONS ? (__EDITION__ as EditionId) : 'civil';
export const EDITION: Edition = typeof __EDITION__ === 'string' && __EDITION__ === 'all' ? ALL_IN_ONE : EDITIONS[chosen];

/** Libraritë e simboleve që tregon programi. */
export const editionLibs = (e: Edition = EDITION): LibraryId[] => e.libs ?? [e.lib];

/** Plani shembull: programi "të gjitha bashkë" nis me atë elektrik. */
export const sampleEdition = (e: Edition = EDITION): EditionId => (e.id === 'all' ? 'civil' : e.id);

/** Emri i plotë i programit, p.sh. "AllSolutionTech CAD 2D CCTV". */
export const productName = (e: Edition = EDITION) => `AllSolutionTech CAD 2D${e.badge ? ` ${e.badge}` : ''}`;
