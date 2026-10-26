import { z } from 'zod';

export const assessmentSchema = z.object({
  verdict: z.enum(['supported', 'contradicted', 'mixed', 'insufficient_evidence']),
  scope: z.enum(['scripture', 'historical', 'mixed']),
});
export const webSourceSchema = z.object({
  id: z.string().max(150),
  title: z.string().max(300),
  url: z
    .string()
    .url()
    .regex(/^https:\/\//),
  retrieved_at: z.string().max(40),
  kind: z.enum(['encyclopedia', 'referenced_report']),
  attribution: z.string().max(250),
});
export type WebSource = z.infer<typeof webSourceSchema>;
export type WebEvidence = WebSource & { text: string };
