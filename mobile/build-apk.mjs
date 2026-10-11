// Ndërton programet si aplikacione Android (.apk) me Capacitor, nga faqet që nxjerr build.mjs (dist/...).
//   node build-apk.mjs                     -> të gjashtë programet në release/
//   node build-apk.mjs --edition all       -> vetëm All in One
//   node build-apk.mjs --edition all --prepare   -> vetëm projekti android/, pa Gradle (për Android Studio)
// Duhen: `npm run build` në rrënjë, `npm ci` këtu, JDK 21 dhe Android SDK (ANDROID_HOME).
// Versioni merret nga APP_VERSION (p.sh. 0.1.42); versionCode është numri i fundit.
// Nënshkrimi: AST_KEYSTORE / AST_KEYSTORE_PASSWORD / AST_KEY_ALIAS / AST_KEY_PASSWORD, ose çelësi i provës test-signing.keystore.
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { EDITIONS } from '../desktop/editions.mjs';

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? null : process.argv[i + 1];
};
const only = arg('--edition');
const prepareOnly = process.argv.includes('--prepare');
const editions = only ? EDITIONS.filter((e) => e.id === only) : EDITIONS;
if (!editions.length) throw new Error(`Program i panjohur: ${only}`);

const version = process.env.APP_VERSION || '0.1.0';
const versionCode = Number(version.split('.').pop()) || 1;
const signing = {
  storeFile: process.env.AST_KEYSTORE || join(process.cwd(), 'test-signing.keystore'),
  storePassword: process.env.AST_KEYSTORE_PASSWORD || 'allsolutiontech-test',
  keyAlias: process.env.AST_KEY_ALIAS || 'ast-test',
  keyPassword: process.env.AST_KEY_PASSWORD || process.env.AST_KEYSTORE_PASSWORD || 'allsolutiontech-test',
};

const run = (cmd, args, cwd = '.') => execFileSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });

/** Emri i skedarit .apk, si te instaluesit e Windows: AllSolutionTech-CAD-All-in-One.apk */
export const apkName = (name) => `${name.replace(/\s+/g, '-')}.apk`;

await mkdir('release', { recursive: true });
for (const ed of editions) {
  // paketa Android e programit, e njëjtë me appId e Windows: com.allsolutiontech.cad.<id>
  const appId = `com.allsolutiontech.cad.${ed.id}`;
  console.log(`\n== ${ed.name} (${appId}) ${version}`);

  await rm('www', { recursive: true, force: true });
  await rm('android', { recursive: true, force: true });
  await mkdir('www', { recursive: true });
  await copyFile(join('..', ed.dir, 'index.html'), 'www/index.html');
  await writeFile('capacitor.config.json', JSON.stringify({ appId, appName: ed.name, webDir: 'www', android: { allowMixedContent: false } }, null, 2));
  run('npx', ['cap', 'add', 'android']);

  // ura e ruajtjes së skedarëve (native/AstFilesPlugin.java) dhe aktiviteti që e regjistron
  const javaDir = join('android/app/src/main/java', ...appId.split('.'));
  for (const f of ['AstFilesPlugin.java', 'MainActivity.java']) {
    await writeFile(join(javaDir, f), (await readFile(join('native', f), 'utf8')).replace('__PACKAGE__', appId));
  }

  // ikona: logoja AST e programeve të Windows në vend të ikonës së Capacitor
  const res = 'android/app/src/main/res';
  for (const dir of await readdir(res)) {
    if (dir.startsWith('mipmap-anydpi')) await rm(join(res, dir), { recursive: true, force: true });
    else if (dir.startsWith('mipmap-')) {
      for (const f of ['ic_launcher.png', 'ic_launcher_round.png']) await copyFile('../desktop/icon.png', join(res, dir, f));
      await rm(join(res, dir, 'ic_launcher_foreground.png'), { force: true });
    } else if (dir.startsWith('drawable')) await rm(join(res, dir, 'splash.png'), { force: true });
  }
  // ekrani i hapjes: logoja në mes, mbi ngjyrën e sfondit të programit
  await copyFile('../desktop/icon.png', join(res, 'drawable', 'ast_logo.png'));
  await writeFile(
    join(res, 'drawable', 'splash.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n' +
      '    <item android:drawable="@color/ast_background" />\n    <item><bitmap android:gravity="center" android:src="@drawable/ast_logo" /></item>\n</layer-list>\n',
  );
  await writeFile(join(res, 'values', 'ast_colors.xml'), '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ast_background">#16191E</color>\n</resources>\n');

  // versioni dhe nënshkrimi
  const gradleFile = 'android/app/build.gradle';
  let gradle = await readFile(gradleFile, 'utf8');
  gradle = gradle.replace(/versionCode \d+/, `versionCode ${versionCode}`).replace(/versionName "[^"]*"/, `versionName "${version}"`);
  gradle += `
android.signingConfigs {
    ast {
        storeFile file(${JSON.stringify(signing.storeFile)})
        storePassword ${JSON.stringify(signing.storePassword)}
        keyAlias ${JSON.stringify(signing.keyAlias)}
        keyPassword ${JSON.stringify(signing.keyPassword)}
    }
}
android.buildTypes.release.signingConfig android.signingConfigs.ast
`;
  await writeFile(gradleFile, gradle);
  if (prepareOnly) continue;

  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  run(gradlew, ['assembleRelease', '--no-daemon', '-q'], 'android');
  const apk = 'android/app/build/outputs/apk/release/app-release.apk';
  if (!existsSync(apk)) throw new Error(`Nuk u krijua ${apk}`);
  await copyFile(apk, join('release', apkName(ed.name)));
  console.log(`release/${apkName(ed.name)}`);
}
