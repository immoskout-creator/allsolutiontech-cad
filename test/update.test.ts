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
