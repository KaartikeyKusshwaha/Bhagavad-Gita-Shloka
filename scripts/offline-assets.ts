import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
const base = resolve('apps/web/.next/static'),
  assets: string[] = [];
async function walk(dir: string) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (/\.(?:js|css|woff2?|svg|png)$/.test(entry.name))
      assets.push('/_next/static/' + relative(base, path).replace(/\\/g, '/'));
  }
}
await walk(base);
assets.sort();
const version = createHash('sha256').update(assets.join('\n')).digest('hex').slice(0, 20);
await writeFile('apps/web/public/offline-assets.json', JSON.stringify({ version, assets }));
const template = await readFile('apps/web/offline-worker.js', 'utf8');
await writeFile('apps/web/public/sw.js', template.replaceAll('__OFFLINE_VERSION__', version));
console.log(`Prepared offline shell: ${assets.length} assets, revision ${version}`);
