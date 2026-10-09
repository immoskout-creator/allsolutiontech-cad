// Ndërton instaluesit e Windows (NSIS .exe), një për çdo program.
//   (në rrënjë) npm run build                 -> faqet e programeve në dist/
//   (këtu) node build-installers.mjs           -> të gjithë instaluesit në desktop/release/
//   node build-installers.mjs --edition fire   -> vetëm një program
//   node build-installers.mjs --dir            -> pa instalues, vetëm dosja e programit (për provë)
//   node build-installers.mjs --stage          -> vetëm desktop/stage/<id>/, që hapet me `npx electron stage/<id>`
// Versioni merret nga APP_VERSION, përndryshe nga package.json. Emri i skedarit .exe nuk ka version,
// që lidhjet e shkarkimit të mbeten të njëjta pas çdo ndërtimi.
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Arch, build, Platform } from 'electron-builder';
import { EDITIONS } from './editions.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const pkg = JSON.parse(await readFile(join(here, 'package.json'), 'utf8'));
const version = process.env.APP_VERSION || pkg.version;
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
};
const only = arg('--edition');
const dirOnly = process.argv.includes('--dir');
const stageOnly = process.argv.includes('--stage');

const list = only ? EDITIONS.filter((e) => e.id === only) : EDITIONS;
if (!list.length) throw new Error(`Nuk ka program me id "${only}". Zgjidh: ${EDITIONS.map((e) => e.id).join(', ')}`);

for (const ed of list) {
  const slug = ed.name.replace(/\s+/g, '-');
  const appId = `com.allsolutiontech.cad.${ed.id}`;
  const stage = join(here, 'stage', ed.id);
  await rm(stage, { recursive: true, force: true });
  await mkdir(join(stage, 'app'), { recursive: true });
  await copyFile(join(root, ed.dir, 'index.html'), join(stage, 'app', 'index.html'));
  await copyFile(join(here, 'main.cjs'), join(stage, 'main.cjs'));
  await copyFile(join(here, 'preload.cjs'), join(stage, 'preload.cjs'));
  await copyFile(join(here, 'icon.png'), join(stage, 'app', 'icon.png'));
  await writeFile(join(stage, 'app', 'edition.json'), JSON.stringify({ id: ed.id, name: ed.name, appId }, null, 2));
  await writeFile(
    join(stage, 'package.json'),
    JSON.stringify({ name: `allsolutiontech-cad-${ed.id}`, productName: ed.name, version, description: ed.name, author: 'AllSolutionTech', main: 'main.cjs' }, null, 2),
  );
  const iconPath = join(here, 'icon.png');

  if (stageOnly) continue;
  console.log(`\n== ${ed.name} ${version}`);
  await build({
    targets: Platform.WINDOWS.createTarget(dirOnly ? 'dir' : 'nsis', Arch.x64),
    projectDir: here,
    config: {
      appId,
      productName: ed.name,
      copyright: 'AllSolutionTech',
      electronVersion: pkg.devDependencies.electron,
      directories: { app: stage, output: join(here, 'release') },
      files: ['**/*'],
      asar: true,
      win: { icon: iconPath, artifactName: `${slug}-Setup.exe` },
      nsis: {
        oneClick: false,
        perMachine: false,
        allowToChangeInstallationDirectory: true,
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        shortcutName: ed.name,
        uninstallDisplayName: ed.name,
        deleteAppDataOnUninstall: false,
        installerLanguages: ['sq_AL', 'en_US'],
      },
      publish: null,
    },
  });
}
