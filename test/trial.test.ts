import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { checkTrial, deviceHash, parseTrialResponse, verifyTrial, type SignedTrial } from '../src/license/trial';

const subtle = webcrypto.subtle as unknown as SubtleCrypto;
const pair = (await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])) as CryptoKeyPair;
const other = (await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])) as CryptoKeyPair;

const DAY = 86_400;
const F = Date.parse('2026-10-13T08:00:00Z') / 1000;
const DEVICE = createHash('sha256').update('ast-cad|7f3a1c52-0d4e-4b8a-9c11-2e6f5a0b9d33').digest('hex');

/** Si serveri: teksti me renditjen fikse të çelësave dhe nënshkrimi 64 bajt r||s në base64. */
async function sign(fields: { d?: string; f?: number; g?: string; l?: number; p?: string; v?: number } = {}, key = pair.privateKey): Promise<SignedTrial> {
  const t = { d: DEVICE, f: F, g: 'cctv', l: F, p: 'ast-cad-prova', v: 1, ...fields };
  const prova = JSON.stringify({ d: t.d, f: t.f, g: t.g, l: t.l, p: t.p, v: t.v });
  const sig = new Uint8Array(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(prova)));
  return { prova, nenshkrimi: Buffer.from(sig).toString('base64') };
}

test('pajisja: SHA-256 hex e "ast-cad|" + identifikuesi', async () => {
  const h = await deviceHash('7f3a1c52-0d4e-4b8a-9c11-2e6f5a0b9d33');
  assert.equal(h, DEVICE);
  assert.match(h, /^[0-9a-f]{64}$/);
});

test('prova e vlefshme: 7 ditë nga kërkesa e parë', async () => {
  const s = await sign();
  const first = await checkTrial(s, pair.publicKey, DEVICE, 'cctv', F + 60);
  assert.ok(first.ok);
  assert.equal(first.ok && first.daysLeft, 7);
  assert.equal(first.ok && first.end, F + 7 * DAY);
  const later = await checkTrial(s, pair.publicKey, DEVICE, 'cctv', F + 6 * DAY + 3600);
  assert.equal(later.ok && later.daysLeft, 1);
});

test('prova e skaduar pas 7 ditëve', async () => {
  const s = await sign();
  const st = await checkTrial(s, pair.publicKey, DEVICE, 'cctv', F + 7 * DAY);
  assert.equal(!st.ok && st.reason, 'expired');
  // koha e serverit te prova vlen edhe kur ora e pajisjes është mbrapa
  const fromServer = await sign({ l: F + 8 * DAY });
  const st2 = await checkTrial(fromServer, pair.publicKey, DEVICE, 'cctv', F + DAY);
  assert.equal(!st2.ok && st2.reason, 'expired');
});

test('nënshkrimi i rremë ose teksti i ndryshuar nuk vlejnë', async () => {
  const forged = await sign({}, other.privateKey);
  assert.equal(await verifyTrial(forged, pair.publicKey), null);
  assert.equal((await checkTrial(forged, pair.publicKey, DEVICE, 'cctv', F)).ok, false);
  const s = await sign();
  const changed = { ...s, prova: s.prova.replace(`"f":${F}`, `"f":${F + 30 * DAY}`) };
  assert.equal(await verifyTrial(changed, pair.publicKey), null);
  assert.equal(await verifyTrial({ ...s, nenshkrimi: 'AAAA' }, pair.publicKey), null);
  assert.equal(await verifyTrial({ ...s, nenshkrimi: '***' }, pair.publicKey), null);
  const wrongPurpose = await sign({ p: 'ast-cad-kod' });
  const st0 = await checkTrial(wrongPurpose, pair.publicKey, DEVICE, 'cctv', F);
  assert.equal(!st0.ok && st0.reason, 'invalid');
  const wrongVersion = await sign({ v: 2 });
  const st = await checkTrial(wrongVersion, pair.publicKey, DEVICE, 'cctv', F);
  assert.equal(!st.ok && st.reason, 'invalid');
});

test('prova e një programi tjetër nuk hap këtë program', async () => {
  const s = await sign({ g: 'fire' });
  const st = await checkTrial(s, pair.publicKey, DEVICE, 'cctv', F);
  assert.equal(!st.ok && st.reason, 'program');
  assert.ok((await checkTrial(s, pair.publicKey, DEVICE, 'fire', F)).ok);
  const all = await sign({ g: 'all' });
  assert.equal((await checkTrial(all, pair.publicKey, DEVICE, 'civil', F)).ok, false);
});

test('prova e një pajisjeje tjetër nuk vlen këtu', async () => {
  const s = await sign({ d: await deviceHash('pajisje-tjeter') });
  const st = await checkTrial(s, pair.publicKey, DEVICE, 'cctv', F);
  assert.equal(!st.ok && st.reason, 'device');
});

test('ora mbrapa nuk e zgjat provën', async () => {
  const s = await sign();
  // programi ka parë më parë ditën e 8-të; ora e pajisjes kthehet te dita e 2-të
  const st = await checkTrial(s, pair.publicKey, DEVICE, 'cctv', F + DAY, F + 8 * DAY);
  assert.equal(!st.ok && st.reason, 'expired');
  // brenda provës, ditët llogariten nga koha më e madhe e parë
  const st2 = await checkTrial(s, pair.publicKey, DEVICE, 'cctv', F + DAY, F + 5 * DAY);
  assert.equal(st2.ok && st2.daysLeft, 2);
  assert.equal(st2.ok && st2.now, F + 5 * DAY);
});

test('përgjigjet e serverit', async () => {
  const s = await sign();
  assert.deepEqual(parseTrialResponse(200, JSON.stringify({ ok: true, ...s })), s);
  assert.equal(parseTrialResponse(400, '{"gabim":"keq"}'), 'bad');
  assert.equal(parseTrialResponse(429, ''), 'busy');
  assert.equal(parseTrialResponse(503, ''), 'offline');
  assert.equal(parseTrialResponse(200, 'jo json'), 'offline');
  assert.equal(parseTrialResponse(200, '{"ok":false}'), 'offline');
});
