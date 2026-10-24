import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const counts = [47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 34, 27, 20, 24, 28, 78];
/** Quarantined legacy snapshot. Never publishes or imports unidentified translations. */
export async function archiveLegacyApi(cacheDirectory: string) {
  await mkdir(cacheDirectory, { recursive: true });
  for (let chapter = 1; chapter <= 18; chapter++)
    for (let verse = 1; verse <= counts[chapter - 1]; verse++) {
      const path = resolve(cacheDirectory, `legacy-${chapter}-${verse}.json`);
      try {
        await readFile(path);
        continue;
      } catch {
        /* cache miss */
      }
      const response = await fetch(`https://geeta-api.vercel.app/shlok/${chapter}/${verse}`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new Error(`Legacy archive failed ${chapter}.${verse}: ${response.status}`);
      await writeFile(path, JSON.stringify(await response.json()));
      await new Promise((r) => setTimeout(r, 500));
    }
}
