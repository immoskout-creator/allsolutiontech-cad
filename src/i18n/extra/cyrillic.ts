import type { ExtraLocale } from '.';

const DIGRAPHS: [RegExp, string][] = [
  [/LJ|Lj/g, 'Љ'],
  [/lj/g, 'љ'],
  [/NJ|Nj/g, 'Њ'],
  [/nj/g, 'њ'],
  [/DŽ|Dž/g, 'Џ'],
  [/dž/g, 'џ'],
];

const LETTERS: Record<string, string> = {
  a: 'а', b: 'б', c: 'ц', č: 'ч', ć: 'ћ', d: 'д', đ: 'ђ', e: 'е', f: 'ф', g: 'г', h: 'х', i: 'и', j: 'ј', k: 'к',
  l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р', s: 'с', š: 'ш', t: 'т', u: 'у', v: 'в', z: 'з', ž: 'ж',
};

/** Fjalë që mbeten me shkronja latine edhe në cirilicë: njësi, taste, emra teknikë. */
const KEEP = new Set(['cm', 'mm', 'm', 'm²', 'W', 'kW', 'V', 'Ctrl', 'Shift', 'Esc', 'Enter', 'Delete', 'Backspace', 'Alt', 'mA', 'Schuko', 'Snap', 'smart', 'home', 'wallbox', 'Wallbox', 'multiswitch']);

function word(w: string): string {
  // shkurtime (IP44, USB, LED, RJ45, TV/SAT, AST-PR-01) dhe shkronja të vetme të tasteve (W, D, N, M)
  if (KEEP.has(w) || /\d/.test(w) || /^[A-Z]+$/.test(w)) return w;
  let s = w;
  for (const [re, c] of DIGRAPHS) s = s.replace(re, c);
  return [...s]
    .map((ch) => {
      const low = ch.toLowerCase();
      const c = LETTERS[low];
      if (!c) return ch;
      return ch === low ? c : c.toUpperCase();
    })
    .join('');
}

/** Kthen tekstin serb nga latinishtja në cirilicë, pa prekur {vlerat} dhe <etiketat>. */
export function toCyrillic(text: string): string {
  return text
    .split(/(\{\w+\}|<\/?\w+>)/)
    .map((part, i) => (i % 2 ? part : part.replace(/[\p{L}\p{N}²]+/gu, word)))
    .join('');
}

export function cyrillicLocale(src: ExtraLocale): ExtraLocale {
  const map = <T extends Record<string, string>>(o: T): T =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toCyrillic(v)])) as T;
  // shkurtimet me shkronja të mëdha mbeten latinisht, por etiketa e murit është fjalë e zakonshme
  const ui = { ...map(src.ui), seWall: toCyrillic(src.ui.seWall.toLowerCase()).toUpperCase() };
  return { ui, symbols: map(src.symbols), categories: map(src.categories) };
}
