import { it, expect, vi } from 'vitest';
import { cachedRead } from './read-cache.ts';
import type { Database } from './index.ts';
it('shares simultaneous public reads, expires them, and retries failures', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.useFakeTimers();
  try {
    const db = {} as Database;
    const read = vi.fn(async () => ['published']);
    const results = await Promise.all([
      cachedRead(db, 'catalog', read),
      cachedRead(db, 'catalog', read),
    ]);
    expect(results).toEqual([['published'], ['published']]);
    expect(read).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60001);
    await cachedRead(db, 'catalog', read);
    expect(read).toHaveBeenCalledTimes(2);
    const failure = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('recovered');
    await expect(cachedRead(db, 'failure', failure)).rejects.toThrow('offline');
    expect(await cachedRead(db, 'failure', failure)).toBe('recovered');
  } finally {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  }
});
