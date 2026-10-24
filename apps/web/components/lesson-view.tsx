'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { decodeLesson, type Lesson } from '@core/shared/src/lessons';
import { parseExploreReply } from '@core/shared/src/device-data';
import type { Passage } from '@core/shared/src/index';
import { PassageCard } from './passage';
export function LessonView() {
  const [lesson, setLesson] = useState<Lesson | null>(null),
    [passages, setPassages] = useState<Passage[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const parsed = decodeLesson(location.hash.slice(1));
        setLesson(parsed);
        const entries = await Promise.all(
          parsed.passages.map(async (p) => {
            const response = await fetch(
              `/v1/passages/${encodeURIComponent(p.work)}/${encodeURIComponent(p.ref.replace(' ', '-'))}`,
              { signal: controller.signal },
            );
            if (!response.ok)
              throw new Error(`Could not load ${p.ref}. The edition may be unavailable.`);
            return (await response.json()).passage;
          }),
        );
        setPassages(
          parseExploreReply({
            hits: entries.map((p) => ({ passage: p, score: 1, match_type: 'reference' })),
          }).hits!.map((h) => h.passage),
        );
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : 'This lesson link could not be read.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, []);
  return (
    <div className="page-shell lesson-page">
      <div className="page-heading">
        <span className="eyebrow">A SHARED CLASSROOM READING</span>
        <h1>{lesson?.title ?? 'Open a reading set.'}</h1>
        <p>
          The author chose these passages and questions. Their selection does not establish that
          traditions teach the same thing.
        </p>
      </div>
      {loading && <p role="status">Loading the attributed passages…</p>}
      {error && <p role="alert">{error}</p>}
      <div className="stack">
        {passages.map((p) => (
          <PassageCard key={`${p.work}-${p.id}`} passage={p} compact />
        ))}
      </div>
      {lesson && (
        <section className="lesson-questions">
          <h2>Questions for discussion</h2>
          <ol>
            {lesson.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
          <button className="button secondary" onClick={() => window.print()}>
            Print reading set
          </button>
        </section>
      )}
      <Link className="text-link" href="/study">
        Make your own set in Study →
      </Link>
    </div>
  );
}
