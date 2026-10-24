import { it, expect } from 'vitest';
import { licenseGate } from './licenseGate.ts';
const source = {
  id: 'test',
  name: 'Test',
  url: 'https://example.org',
  license: 'CC0-1.0',
  license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
  attribution: 'Test',
  retrieved_at: '2026-10-24',
  checksum: 'a'.repeat(64),
  commercial_ok: true,
  status: 'draft',
  display_rules: {},
};
it('requires all license and provenance fields before publishing', () => {
  expect(licenseGate(source).id).toBe('test');
  for (const key of ['license', 'license_url', 'attribution', 'retrieved_at', 'checksum'])
    expect(() => licenseGate({ ...source, [key]: '' })).toThrow();
  expect(() => licenseGate({ ...source, status: 'blocked' })).toThrow();
});
