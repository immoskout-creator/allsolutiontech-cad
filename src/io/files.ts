import { DEFAULT_SCALE, defaultLayers, type Doc, type Entity, type Layer } from '../core/types';
import { setCustomSymbols, symbolDef } from '../symbols/library';
import { parseCustomSymbols, toSymbolDef } from '../symbols/custom';

const AUTOSAVE_KEY = 'astcad.autosave.v1';

export function serialize(doc: Doc): string {
  return JSON.stringify(doc, null, 2);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isVec = (v: unknown): boolean =>
  typeof v === 'object' && v !== null && isNum((v as { x: unknown }).x) && isNum((v as { y: unknown }).y);

/** Lexon një skedar projekti dhe hedh gabim të qartë nëse nuk është i vlefshëm. */
export function parse(text: string): Doc {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Skedari nuk është projekt AllSolutionTech CAD (JSON i pavlefshëm).');
  }
  const d = raw as Partial<Doc>;
  if (!d || d.format !== 'astcad') throw new Error('Skedari nuk është projekt AllSolutionTech CAD.');
  if (d.version !== 1) throw new Error(`Versioni ${String(d.version)} i skedarit nuk mbështetet ende.`);
  // simbolet e përdoruesit duhen njohur para se të kontrollohen objektet që i përdorin
  const symbols = parseCustomSymbols(d.symbols);
  setCustomSymbols(symbols.map(toSymbolDef));
  const raw2 = Array.isArray(d.entities) ? (d.entities as unknown[]) : [];
  const entities = raw2.filter((x): x is Entity => {
    const e = x as Partial<Entity> | null;
    if (!e || typeof e.id !== 'string' || typeof e.layer !== 'string') return false;
    if (e.kind === 'wall') return isVec(e.a) && isVec(e.b) && isNum(e.thickness);
    if (e.kind === 'symbol') return typeof e.symbol === 'string' && !!symbolDef(e.symbol) && isVec(e.pos) && isNum(e.angle);
    if (e.kind === 'room') return typeof e.name === 'string' && isVec(e.pos);
    if (e.kind === 'opening') {
      return (
        (e.type === 'door' || e.type === 'window') &&
        typeof e.wall === 'string' &&
        isNum(e.t) &&
        isNum(e.width) &&
        e.width > 0 &&
        (e.height === undefined || (isNum(e.height) && e.height > 0)) &&
        (e.sill === undefined || (isNum(e.sill) && e.sill >= 0)) &&
        (e.side === 1 || e.side === -1) &&
        (e.hinge === 'a' || e.hinge === 'b')
      );
    }
    return false;
  });
  // derë/dritare pa murin e vet nuk ka kuptim
  const wallIds = new Set(entities.filter((e) => e.kind === 'wall').map((e) => e.id));
  const kept = entities.filter((e) => e.kind !== 'opening' || wallIds.has(e.wall));
  // Shto shtresat standarde që mungojnë në skedarët më të vjetër.
  const layers: Layer[] = Array.isArray(d.layers) && d.layers.length ? d.layers : [];
  for (const l of defaultLayers()) if (!layers.some((x) => x.id === l.id)) layers.push(l);
  return {
    format: 'astcad',
    version: 1,
    name: typeof d.name === 'string' && d.name.trim() ? d.name : 'Projekt',
    scale: isNum(d.scale) && d.scale >= 1 && d.scale <= 1000 ? d.scale : DEFAULT_SCALE,
    layers,
    entities: kept,
    ...(symbols.length ? { symbols } : {}),
  };
}

export function loadAutosave(): Doc | null {
  try {
    const text = localStorage.getItem(AUTOSAVE_KEY);
    return text ? parse(text) : null;
  } catch {
    return null;
  }
}

export function writeAutosave(doc: Doc): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(doc));
  } catch {
    // Ruajtja lokale mund të mos lejohet (dritare private); programi punon edhe pa të.
  }
}

export function fileName(doc: Doc): string {
  const base = doc.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 _-]+/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${base || 'projekt'}.astcad.json`;
}

interface DownloadsApi {
  save(req: { filename: string; data: string }): Promise<unknown>;
}

declare global {
  interface Window {
    claude?: { use(name: string): Promise<unknown> };
  }
}

let downloads: Promise<DownloadsApi | null> | null = null;

function getDownloads(): Promise<DownloadsApi | null> {
  if (!downloads) {
    downloads = window.claude?.use
      ? (window.claude.use('downloads') as Promise<DownloadsApi | null>).catch(() => null)
      : Promise.resolve(null);
  }
  return downloads;
}

/**
 * Ruan të dhëna si skedar. Brenda claude.ai kalon nga konfirmimi i shkarkimit;
 * jashtë tij (kur programi hapet si skedar lokal) shkarkon direkt.
 */
export async function saveData(filename: string, data: string): Promise<'saved' | 'declined'> {
  const api = await getDownloads();
  if (api) {
    try {
      await api.save({ filename, data });
      return 'saved';
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'declined') return 'declined';
      throw new Error('Ruajtja e skedarit nuk u lejua këtu.');
    }
  }
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved';
}

export function saveFile(doc: Doc): Promise<'saved' | 'declined'> {
  return saveData(fileName(doc), serialize(doc));
}

export function readFile(file: File): Promise<Doc> {
  return file.text().then(parse);
}
