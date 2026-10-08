// Krijon çelësat e kodeve të aktivizimit (vetëm një herë):
//   admin-key.json            çelësi privat i administratorit (NUK futet në git; ruaje mirë)
//   src/license/publicKey.ts  çelësi publik që futet në programe
// Me një çelës të ri, kodet e vjetra nuk vlejnë më.
import { webcrypto as crypto } from 'node:crypto';
import { access, writeFile } from 'node:fs/promises';

const force = process.argv.includes('--force');
if (!force && (await access('admin-key.json').then(() => true, () => false))) {
  console.error('admin-key.json ekziston. Përdor --force vetëm nëse do çelës të ri (kodet e vjetra nuk vlejnë më).');
  process.exit(1);
}
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const priv = await crypto.subtle.exportKey('jwk', pair.privateKey);
const pub = await crypto.subtle.exportKey('jwk', pair.publicKey);
const strip = ({ kty, crv, x, y, d }) => (d ? { kty, crv, x, y, d } : { kty, crv, x, y });
await writeFile('admin-key.json', JSON.stringify(strip(priv), null, 2) + '\n');
await writeFile(
  'src/license/publicKey.ts',
  '// Çelësi publik i kodeve të aktivizimit (krijuar nga scripts/keygen.mjs). Çelësi privat nuk është në kod.\n' +
    `export const PUBLIC_KEY: JsonWebKey = ${JSON.stringify(strip(pub))};\n`,
);
console.log('U krijuan admin-key.json dhe src/license/publicKey.ts');
