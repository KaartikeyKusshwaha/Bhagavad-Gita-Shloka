import { z } from 'zod';
import { parseDeviceData, retainHistory } from './device-data.ts';
const reference = z.object({
  id: z.string().max(150),
  work: z.string().max(150),
  ref: z.string().max(150),
  title: z.string().max(200),
});
export const learningSchema = z.object({
  version: z.literal(1),
  revision: z
    .array(reference.extend({ due: z.iso.datetime(), level: z.number().int().min(0).max(6) }))
    .max(2000),
  plan: z
    .object({
      work: z.string().max(150),
      title: z.string().max(200),
      daily: z.number().int().min(1).max(20),
      cursor: z.number().int().nonnegative(),
      total: z.number().int().positive(),
      completedDay: z.string().optional(),
    })
    .nullable(),
});
export const emptyLearning = { version: 1 as const, revision: [], plan: null };
export function parseAccountData(input: unknown) {
  const body = z.object({ device: z.unknown(), learning: learningSchema }).parse(input);
  return {
    device: retainHistory(parseDeviceData(JSON.stringify(body.device))),
    learning: body.learning,
  };
}
