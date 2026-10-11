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

test('përditësimi në Android: gjen APK-në e programit kur publikimi është më i ri', async () => {
  const { apkName, newerApk } = await import('../src/io/androidUpdate');
  const name = 'AllSolutionTech CAD All in One';
  assert.equal(apkName(name), 'AllSolutionTech-CAD-All-in-One.apk');
  const release = {
    name: 'Programet për Android (0.1.7)',
    assets: [
      { name: 'AllSolutionTech-CAD-AP.apk', browser_download_url: 'https://x/ap.apk' },
      { name: 'AllSolutionTech-CAD-All-in-One.apk', browser_download_url: 'https://x/all.apk' },
    ],
  };
  assert.deepEqual(newerApk(release, '0.1.3', name), { version: '0.1.7', url: 'https://x/all.apk' });
  assert.equal(newerApk(release, '0.1.7', name), null);
  assert.equal(newerApk(release, '0.1.3', 'AllSolutionTech CAD Fire'), null);
});
