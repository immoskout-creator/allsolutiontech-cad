// Ndërton programin si një faqe HTML të vetme (pa skedarë të jashtëm përveç fonteve).
//   node build.mjs         -> dist/index.html (hapet direkt në shfletues) dhe dist/artifact.html
//   node build.mjs --test  -> përpilon testet në dist-test/
import { build } from 'esbuild';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">';
const TITLE = '<title>AllSolutionTech CAD 2D</title>';

if (process.argv.includes('--test')) {
  const tests = (await readdir('test')).filter((f) => f.endsWith('.test.ts')).map((f) => `test/${f}`);
  await build({ entryPoints: tests, bundle: true, platform: 'node', format: 'esm', outdir: 'dist-test', outExtension: { '.js': '.mjs' }, logLevel: 'warning' });
} else {
  const js = await build({ entryPoints: ['src/main.ts'], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false, logLevel: 'warning' });
  const script = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const css = await readFile('src/styles.css', 'utf8');
  const body = await readFile('src/index.html', 'utf8');
  const fragment = `${TITLE}\n${FONTS}\n<style>\n${css}</style>\n${body}\n<script>\n${script}</script>\n`;
  const page =
    '<!doctype html>\n<html lang="sq">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
    `${TITLE}\n${FONTS}\n<style>\n${css}</style>\n</head>\n<body>\n${body}\n<script>\n${script}</script>\n</body>\n</html>\n`;
  await mkdir('dist', { recursive: true });
  await writeFile('dist/index.html', page);
  await writeFile('dist/artifact.html', fragment);
  console.log(`dist/index.html ${(page.length / 1024).toFixed(1)} KB`);
}
