// Ndërton programin si një faqe HTML të vetme (pa skedarë të jashtëm përveç fonteve).
//   node build.mjs         -> pesë programet, secili me index.html (hapet direkt në shfletues) dhe artifact.html:
//                             dist/ (elektrik), dist/cctv/, dist/ap/, dist/fire/, dist/em/
//   node build.mjs --test  -> përpilon testet në dist-test/
import { build } from 'esbuild';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">';
const EDITIONS = [
  { id: 'civil', dir: 'dist', title: 'AllSolutionTech CAD 2D' },
  { id: 'cctv', dir: 'dist/cctv', title: 'AllSolutionTech CAD 2D CCTV' },
  { id: 'network', dir: 'dist/ap', title: 'AllSolutionTech CAD 2D AP' },
  { id: 'fire', dir: 'dist/fire', title: 'AllSolutionTech CAD 2D FIRE' },
  { id: 'emergency', dir: 'dist/em', title: 'AllSolutionTech CAD 2D EMERGENCY' },
];

if (process.argv.includes('--test')) {
  const tests = (await readdir('test')).filter((f) => f.endsWith('.test.ts')).map((f) => `test/${f}`);
  await build({ entryPoints: tests, bundle: true, platform: 'node', format: 'esm', outdir: 'dist-test', outExtension: { '.js': '.mjs' }, logLevel: 'warning' });
} else {
  const css = await readFile('src/styles.css', 'utf8');
  const body = await readFile('src/index.html', 'utf8');
  for (const ed of EDITIONS) {
    const js = await build({
      entryPoints: ['src/main.ts'], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false, logLevel: 'warning',
      define: { __EDITION__: JSON.stringify(ed.id) },
    });
    const script = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
    const TITLE = `<title>${ed.title}</title>`;
    const fragment = `${TITLE}\n${FONTS}\n<style>\n${css}</style>\n${body}\n<script>\n${script}</script>\n`;
    const page =
      '<!doctype html>\n<html lang="sq">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
      `${TITLE}\n${FONTS}\n<style>\n${css}</style>\n</head>\n<body>\n${body}\n<script>\n${script}</script>\n</body>\n</html>\n`;
    await mkdir(ed.dir, { recursive: true });
    await writeFile(`${ed.dir}/index.html`, page);
    await writeFile(`${ed.dir}/artifact.html`, fragment);
    console.log(`${ed.dir}/index.html ${(page.length / 1024).toFixed(1)} KB`);
  }
}
