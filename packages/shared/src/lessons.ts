import { z } from 'zod';
export const lessonSchema = z.object({
  version: z.literal(1),
  title: z.string().trim().min(1).max(150),
  passages: z
    .array(
      z.object({
        work: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .max(100),
        ref: z.string().min(1).max(150),
      }),
    )
    .min(1)
    .max(10),
  questions: z.array(z.string().trim().min(1).max(500)).max(8),
});
export type Lesson = z.infer<typeof lessonSchema>;
export function encodeLesson(input: Lesson) {
  const json = JSON.stringify(lessonSchema.parse(input));
  const bytes = new TextEncoder().encode(json);
  if (bytes.length > 9000)
    throw new Error('Lesson is too large for a share link. Shorten the questions.');
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
export function decodeLesson(encoded: string): Lesson {
  if (encoded.length > 12000) throw new Error('Lesson link is too large.');
  const raw = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
  return lessonSchema.parse(
    JSON.parse(new TextDecoder().decode(Uint8Array.from(raw, (c) => c.charCodeAt(0)))),
  );
}
