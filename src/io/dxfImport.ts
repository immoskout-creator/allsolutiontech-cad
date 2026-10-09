import { WALL_LAYER, emptyDoc, newId, type Doc, type Vec, type Wall } from '../core/types';

/** Njësitë e DXF ($INSUNITS) në mm. */
const UNIT_MM: Record<number, number> = { 1: 25.4, 2: 304.8, 4: 1, 5: 10, 6: 1000 };

/** Çiftet (kodi, vlera) të skedarit DXF ASCII. */
function pairs(text: string): [number, string][] {
  const lines = text.split(/\r?\n/);
  const out: [number, string][] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i].trim());
    if (!Number.isFinite(code)) continue;
    out.push([code, lines[i + 1].trim()]);
  }
  return out;
}

/** Vijat e planit nga DXF: LINE, LWPOLYLINE dhe POLYLINE (me VERTEX), në njësitë e skedarit. */
export function dxfSegments(text: string): { segs: [Vec, Vec][]; unitMm: number | null } {
  const p = pairs(text);
  let unitMm: number | null = null;
  for (let i = 0; i < p.length; i++) {
    if (p[i][0] === 9 && p[i][1] === '$INSUNITS' && p[i + 1]?.[0] === 70) unitMm = UNIT_MM[Number(p[i + 1][1])] ?? null;
  }
  const start = p.findIndex(([c, v], i) => c === 2 && v === 'ENTITIES' && p[i - 1]?.[1] === 'SECTION');
  if (start < 0) throw new Error('DXF pa seksionin ENTITIES.');
  const segs: [Vec, Vec][] = [];
  // ndaj entitetet sipas kodit 0
  const ents: [number, string][][] = [];
  for (let i = start + 1; i < p.length; i++) {
    if (p[i][0] === 0) {
      if (p[i][1] === 'ENDSEC') break;
      ents.push([p[i]]);
    } else ents[ents.length - 1]?.push(p[i]);
  }
  const num = (e: [number, string][], code: number) => Number(e.find(([c]) => c === code)?.[1] ?? 0);
  const poly = (pts: Vec[], closed: boolean) => {
    for (let k = 0; k + 1 < pts.length; k++) segs.push([pts[k], pts[k + 1]]);
    if (closed && pts.length > 2) segs.push([pts[pts.length - 1], pts[0]]);
  };
  for (let k = 0; k < ents.length; k++) {
    const e = ents[k];
    const type = e[0][1];
    if (type === 'LINE') segs.push([{ x: num(e, 10), y: num(e, 20) }, { x: num(e, 11), y: num(e, 21) }]);
    else if (type === 'LWPOLYLINE') {
      const pts: Vec[] = [];
      for (let j = 0; j < e.length; j++) if (e[j][0] === 10) pts.push({ x: Number(e[j][1]), y: Number(e.slice(j).find(([c]) => c === 20)?.[1] ?? 0) });
      poly(pts, (num(e, 70) & 1) === 1);
    } else if (type === 'POLYLINE') {
      const pts: Vec[] = [];
      while (ents[k + 1] && ents[k + 1][0][1] === 'VERTEX') {
        k++;
        pts.push({ x: num(ents[k], 10), y: num(ents[k], 20) });
      }
      poly(pts, (num(e, 70) & 1) === 1);
    }
  }
  return { segs, unitMm };
}

/**
 * Importon planin nga DXF (AutoCAD, ActCAD, BricsCAD…): çdo vijë bëhet mur i hollë (2 cm) në shtresën Muret,
 * që mund të zgjidhet dhe t'i ndryshohet trashësia. Njësitë merren nga $INSUNITS; pa to, plani i vogël (< 200)
 * quhet në metra, ndryshe në mm.
 */
export function importDxf(text: string, name: string): Doc {
  const { segs, unitMm } = dxfSegments(text);
  if (!segs.length) throw new Error('DXF nuk ka vija (LINE / POLYLINE) për t’u importuar.');
  let k = unitMm;
  if (k === null) {
    const xs = segs.flatMap(([a, b]) => [a.x, b.x]);
    const ys = segs.flatMap(([a, b]) => [a.y, b.y]);
    const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    k = size < 200 ? 1000 : 1;
  }
  const doc = emptyDoc(name);
  for (const [a, b] of segs) {
    const A = { x: Math.round(a.x * k), y: Math.round(a.y * k) };
    const B = { x: Math.round(b.x * k), y: Math.round(b.y * k) };
    if (Math.hypot(B.x - A.x, B.y - A.y) < 5) continue;
    const w: Wall = { id: newId('w'), kind: 'wall', layer: WALL_LAYER, a: A, b: B, thickness: 20 };
    doc.entities.push(w);
  }
  return doc;
}
