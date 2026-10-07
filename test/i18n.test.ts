import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXTRA } from '../src/i18n/extra';
import { toCyrillic } from '../src/i18n/extra/cyrillic';
import { LANGS, STRINGS, setLang, t } from '../src/i18n/strings';
import { CATEGORIES, SYMBOLS, categoryName, symbolName } from '../src/symbols/library';

const tokens = (s: string) => [...s.matchAll(/\{\w+\}|<\/?\w+>/g)].map((m) => m[0]).sort();

test('çdo gjuhë ka gjithë tekstet, me të njëjtat {vlera} dhe <etiketa>', () => {
  for (const [lang, loc] of Object.entries(EXTRA)) {
    for (const [key, src] of Object.entries(STRINGS)) {
      const v = (loc.ui as Record<string, string>)[key];
      assert.ok(typeof v === 'string' && v.trim(), `${lang}: mungon ${key}`);
      assert.deepEqual(tokens(v), tokens(src.en), `${lang}: ${key}`);
    }
    for (const s of SYMBOLS) assert.ok(loc.symbols[s.id]?.trim(), `${lang}: mungon simboli ${s.id}`);
    for (const c of CATEGORIES) assert.ok(loc.categories[c.id]?.trim(), `${lang}: mungon kategoria ${c.id}`);
  }
});

test('zgjedhësi ka 31 gjuhë dhe secila përkthen ndërfaqen dhe simbolet', () => {
  assert.equal(LANGS.length, 31);
  assert.equal(new Set(LANGS.map((l) => l.id)).size, 31);
  setLang('fr');
  assert.notEqual(t('save'), '');
  assert.ok(symbolName(SYMBOLS[0]).length > 0);
  assert.ok(categoryName(CATEGORIES[0]).length > 0);
  setLang('sq');
});

test('serbishtja me cirilicë ruan shkurtimet dhe vlerat', () => {
  assert.equal(toCyrillic('Utičnica sa prekidačem IP44 {n} <b>LED</b> (W) 30 cm, ljuljaška Džep'), 'Утичница са прекидачем IP44 {n} <b>LED</b> (W) 30 cm, љуљашка Џеп');
});
