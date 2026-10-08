import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { LIFETIME, createCode, dayOf, expiryFor, fromBase32, readCode, toBase32, type License } from '../src/license/code';
import { checkCode } from '../src/license/gate';
import { LICENSE_KEYS, LICENSE_TEXTS } from '../src/license/strings';
import { PUBLIC_KEY } from '../src/license/publicKey';
import { LANGS } from '../src/i18n/strings';
import { ALL_IN_ONE, EDITIONS, editionLibs } from '../src/edition';
import { sampleDoc } from '../src/core/sample';

const subtle = webcrypto.subtle as unknown as SubtleCrypto;
const pair = (await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])) as CryptoKeyPair;
const day = (iso: string) => dayOf(Date.parse(`${iso}T00:00:00Z`));

test('kohëzgjatjet: 7 ditë, 1 muaj, 6 muaj, 1 vit, përjetë', () => {
  const start = day('2026-10-08');
  assert.equal(expiryFor('7d', start), day('2026-10-14'));
  assert.equal(expiryFor('1m', start), day('2026-11-07'));
  assert.equal(expiryFor('6m', start), day('2027-04-07'));
  assert.equal(expiryFor('1y', start), day('2027-10-07'));
  assert.equal(expiryFor('life', start), LIFETIME);
});

test('base32 shkon dhe kthehet, edhe me O/I/L dhe viza', () => {
  const bytes = new Uint8Array([0, 1, 2, 250, 255, 7, 99, 128, 64]);
  const s = toBase32(bytes);
  assert.deepEqual(fromBase32(s.toLowerCase().replace(/0/g, 'o').replace(/1/g, 'l')), bytes);
  assert.equal(fromBase32('AB!C'), null);
});

test('kodi i nënshkruar lexohet; një shkronjë e ndryshuar e prish', async () => {
  const l: License = { program: 'cctv', duration: '6m', expiry: expiryFor('6m', day('2026-10-08')), serial: 0xabcdef };
  const code = await createCode(l, pair.privateKey);
  assert.match(code, /^[0-9A-Z]{4}(-[0-9A-Z]{1,4})+$/);
  assert.deepEqual(await readCode(code, pair.publicKey), l);
  assert.deepEqual(await readCode(` ${code.toLowerCase()} `, pair.publicKey), l);
  const i = 6;
  const bad = code.slice(0, i) + (code[i] === 'A' ? 'B' : 'A') + code.slice(i + 1);
  assert.equal(await readCode(bad, pair.publicKey), null);
  assert.equal(await readCode('ABCD-EFGH', pair.publicKey), null);
  // kodi i një çelësi tjetër nuk vlen me çelësin publik të programeve
  const real = await subtle.importKey('jwk', PUBLIC_KEY, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  assert.equal(await readCode(code, real), null);
});

test('kontrolli: secili program me kodin e vet, dhe skadimi', async () => {
  const today = day('2026-10-08');
  const make = (program: License['program'], expiry: number) => createCode({ program, duration: '1m', expiry, serial: 1 }, pair.privateKey);
  const fire = await make('fire', today + 10);
  assert.equal((await checkCode(fire, 'fire', pair.publicKey, today)).ok, true);
  assert.deepEqual(await checkCode(fire, 'cctv', pair.publicKey, today).then((c) => !c.ok && c.reason), 'wrongProgram');
  assert.deepEqual(await checkCode(fire, 'all', pair.publicKey, today).then((c) => !c.ok && c.reason), 'wrongProgram');
  // çdo kod hap vetëm programin e vet; kodi All in One vetëm programin All in One
  const programs = ['civil', 'cctv', 'network', 'fire', 'emergency', 'all'] as const;
  for (const owner of programs) {
    const code = await make(owner, today + 1);
    for (const p of programs) assert.equal((await checkCode(code, p, pair.publicKey, today)).ok, p === owner, `${owner} te ${p}`);
  }
  const all = await make('all', today);
  // dita e fundit vlen, të nesërmen jo
  assert.deepEqual(await checkCode(all, 'all', pair.publicKey, today + 1).then((c) => !c.ok && c.reason), 'expired');
  const life = await createCode({ program: 'civil', duration: 'life', expiry: LIFETIME, serial: 2 }, pair.privateKey);
  assert.equal((await checkCode(life, 'civil', pair.publicKey, today + 20000)).ok, true);
  assert.deepEqual(await checkCode('jo-kod', 'civil', pair.publicKey, today).then((c) => !c.ok && c.reason), 'invalid');
});

test('tekstet e aktivizimit janë në të 31 gjuhët', () => {
  const tokens = (s: string) => [...s.matchAll(/\{\w+\}/g)].map((m) => m[0]).sort();
  for (const { id } of LANGS) {
    const texts = LICENSE_TEXTS[id];
    assert.ok(texts, id);
    for (const k of LICENSE_KEYS) {
      assert.ok(texts[k]?.trim(), `${id}: ${k}`);
      assert.deepEqual(tokens(texts[k]), tokens(LICENSE_TEXTS.en[k]), `${id}: ${k}`);
    }
  }
  assert.equal(LICENSE_TEXTS['sr-Cyrl'].activate, 'Активирај');
});

test('programi "të gjitha bashkë" ka libraritë, linjat dhe shtresat e çdo programi', () => {
  const singles = Object.values(EDITIONS);
  assert.deepEqual(editionLibs(ALL_IN_ONE), singles.map((e) => e.lib));
  for (const e of singles) {
    for (const k of e.kinds) assert.ok(ALL_IN_ONE.kinds.includes(k), k);
    for (const l of e.layers) assert.ok(ALL_IN_ONE.layers.includes(l), l);
    assert.notEqual(e.storage, ALL_IN_ONE.storage);
  }
  assert.deepEqual(editionLibs(EDITIONS.cctv), ['cctv']);
  assert.ok(sampleDoc().entities.length > 0);
});
