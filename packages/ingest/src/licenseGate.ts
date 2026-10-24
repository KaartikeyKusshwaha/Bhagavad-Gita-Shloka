import { z } from 'zod';
export const sourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.url(),
  license: z.string().min(1),
  license_url: z.url(),
  attribution: z.string().min(1),
  retrieved_at: z.iso.date(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  commercial_ok: z.boolean(),
  status: z.enum(['draft', 'approved', 'blocked']),
  display_rules: z.record(z.string(), z.unknown()),
});
export function licenseGate(source: unknown) {
  const result = sourceSchema.parse(source);
  if (result.status === 'blocked') throw new Error('Blocked source cannot publish');
  return result;
}
