import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installerName, isNewer, versionFromTitle } from '../desktop/version.cjs';

test('përditësimi: versioni lexohet nga titulli i publikimit dhe krahasohet si numra', () => {
  assert.equal(versionFromTitle('Programet për Windows (0.1.42)'), '0.1.42');
  assert.equal(versionFromTitle('pa version'), null);
  assert.equal(isNewer('0.1.12', '0.1.9'), true);
  assert.equal(isNewer('0.1.9', '0.1.12'), false);
  assert.equal(isNewer('0.1.9', '0.1.9'), false);
  assert.equal(isNewer('0.2', '0.1.99'), true);
  assert.equal(installerName('AllSolutionTech CAD All in One'), 'AllSolutionTech-CAD-All-in-One-Setup.exe');
});

test('përditësimi: versioni vetëm nga allsolutiontech.de, faqja e shkruar në kod', async () => {
  const { siteVersion, VERSION_URL, DOWNLOAD_PAGE } = await import('../desktop/version.cjs');
  const json = { produkti: 'allsolutiontech-cad', windows: '0.1.23', android: '0.1.6', faqja: 'https://x.example/' };
  assert.equal(siteVersion(json, 'windows'), '0.1.23');
  assert.equal(siteVersion(json, 'android'), '0.1.6');
  assert.equal(siteVersion({ ...json, produkti: 'tjeter' }, 'android'), null);
  assert.equal(siteVersion({ ...json, android: 'x' }, 'android'), null);
  assert.equal(siteVersion(null, 'android'), null);
  assert.equal(VERSION_URL, 'https://allsolutiontech.de/soft/cad/versioni.json');
  assert.equal(DOWNLOAD_PAGE, 'https://allsolutiontech.de/soft/#cad');
});

test('programi nuk lidhet më me GitHub (përditësimi, simbolet e komunitetit)', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const f of ['src/io/androidUpdate.ts', 'desktop/update.cjs', 'desktop/main.cjs', 'src/symbols/community.ts', 'src/main.ts'])
    assert.doesNotMatch((await readFile(f, 'utf8')).replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, ''), /github(usercontent)?\.com/, f);
});
