import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANDROID_FOLDER, androidFileName, saveAndroidData, writeAndroidFile } from '../src/io/androidFiles';

const day = new Date(2026, 9, 14, 9, 30);

test('Android: emri i skedarit me datën, pa shkronja të ndaluara', () => {
  assert.equal(androidFileName('Shtepi-1-kat.astcad.json', day), 'Shtepi-1-kat – 2026-10-14.astcad.json');
  assert.equal(androidFileName('Plani: kati 1/2?.pdf', day), 'Plani kati 1 2 – 2026-10-14.pdf');
  assert.equal(androidFileName('simbolet.astlib.json', day), 'simbolet – 2026-10-14.astlib.json');
  assert.equal(androidFileName('Plan.dxf', day), 'Plan – 2026-10-14.dxf');
  assert.equal(androidFileName('<>.png', day), 'projekt – 2026-10-14.png');
});

type Call = { plugin: string; method: string; options: Record<string, unknown> };

test('Android: skedari shkruhet te Dokumentet / AllSolutionTech CAD si base64', async () => {
  const calls: Call[] = [];
  const native = async (plugin: string, method: string, options: unknown) => {
    calls.push({ plugin, method, options: options as Record<string, unknown> });
    return { uri: 'file:///storage/emulated/0/Documents/x.pdf' };
  };
  const saved = await writeAndroidFile(native, 'Plan.pdf', 'QUJD', day);
  assert.deepEqual(saved, { name: 'Plan – 2026-10-14.pdf', uri: 'file:///storage/emulated/0/Documents/x.pdf', where: 'documents' });
  assert.deepEqual(calls, [
    { plugin: 'Filesystem', method: 'writeFile', options: { path: `${ANDROID_FOLDER}/Plan – 2026-10-14.pdf`, data: 'QUJD', directory: 'DOCUMENTS', recursive: true } },
  ]);
});

test('Android: pa leje te Dokumentet, ruan te Cache dhe hap menjëherë "Ndaj"', async () => {
  const calls: string[] = [];
  const native = async (plugin: string, method: string, options: unknown) => {
    const o = options as { directory?: string; files?: string[] };
    calls.push(`${plugin}.${method}${o.directory ? ':' + o.directory : ''}`);
    if (o.directory === 'DOCUMENTS') throw new Error('Permission denied');
    if (plugin === 'Share') {
      assert.deepEqual(o.files, ['file:///cache/x.pdf']);
      return {};
    }
    return { uri: 'file:///cache/x.pdf' };
  };
  assert.equal(await saveAndroidData(native, 'Plan.pdf', 'QUJD'), 'saved');
  assert.deepEqual(calls, ['Filesystem.writeFile:DOCUMENTS', 'Filesystem.writeFile:CACHE', 'Share.share']);
});

test('Android: mbyllja e "Ndaj" nuk është gabim; dështimi i plotë jep arsyen', async () => {
  const cancel = async (plugin: string, _m: string, options: unknown) => {
    if ((options as { directory?: string }).directory === 'DOCUMENTS') throw new Error('denied');
    if (plugin === 'Share') throw new Error('Share canceled');
    return { uri: 'file:///cache/x.pdf' };
  };
  assert.equal(await saveAndroidData(cancel, 'Plan.pdf', 'QUJD'), 'declined');
  const fail = async () => {
    throw new Error('No space left on device');
  };
  await assert.rejects(writeAndroidFile(fail, 'Plan.pdf', 'QUJD'), /dështoi: No space left on device|failed: No space left on device/);
});
