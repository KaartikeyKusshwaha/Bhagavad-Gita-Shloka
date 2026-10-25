'use client';
import { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PassageCard } from './passage';
import type { Passage } from '@core/shared/src/index';
import type { CitedAnswer } from '@core/llm/src/provider';
interface Result {
  verdict?: string;
  review_required?: boolean;
  matches: { passage: Passage; context?: { before: Passage[]; after: Passage[] } }[];
  explanation?: string;
  answer?: CitedAnswer | null;
  note?: string;
  quote_check?: string;
  coverage_note?: string;
  safety?: { kind: string; message: string };
  error?: { message: string };
}
export function VerifyForm() {
  const [claim, setClaim] = useState(''),
    [source, setSource] = useState(''),
    [pending, setPending] = useState(false),
    [result, setResult] = useState<Result | null>(null),
    [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setResult(null);
    setError('');
    try {
      const response = await fetch('/v1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim, claimed_source: source || undefined, lang: 'en' }),
        signal: AbortSignal.timeout(90000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? 'Could not check this quotation.');
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to connect. Please try again.');
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <form className="form-panel" onSubmit={submit}>
        <div className="field">
          <label htmlFor="claim">Paste what you heard</label>
          <textarea
            id="claim"
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="A quotation, with its source or verse number if you know it…"
            minLength={2}
            maxLength={5000}
            required
          />
          <small>
            Your claim is not stored as raw text. Verification logs contain a hash, verdict, and
            language only.
          </small>
        </div>
        <div className="field">
          <label htmlFor="claimed-source">
            Attributed to <span className="results-count">(optional)</span>
          </label>
          <select id="claimed-source" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Find the source</option>
            <option value="bhagavad-gita">Bhagavad Gita</option>
            <option value="quran">Quran · Arabic</option>
            <option value="dhammapada">Dhammapada</option>
            <option value="bible">Bible (not yet loaded)</option>
          </select>
        </div>
        <button type="submit" className="button primary" disabled={pending}>
          {pending ? 'Checking the published texts…' : 'Check the quotation'}
          <ArrowRight size={16} />
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
      <div aria-live="polite" aria-busy={pending}>
        {result && (
          <section className="verify-result">
            {result.safety ? (
              <div className="notice" role="alert">
                <strong>
                  {result.safety.kind === 'distress'
                    ? 'Your safety comes first'
                    : 'A note before checking'}
                </strong>
                {result.safety.message}
              </div>
            ) : (
              <>
                <div className="verdict">
                  <span className="badge">
                    <Check size={16} />
                  </span>
                  {result.verdict === 'accurate'
                    ? 'Wording found'
                    : result.verdict === 'misattributed'
                      ? 'Attribution differs'
                      : result.review_required
                        ? 'No exact match · review suggested'
                        : 'Not found in the loaded texts'}
                </div>
                {result.matches?.map((hit, i) => (
                  <div className="stack" key={hit.passage.id}>
                    <PassageCard passage={hit.passage} />
                    {i === 0 && hit.context && (
                      <details className="notice">
                        <summary>Read the surrounding passages</summary>
                        <div className="context-grid">
                          {[...hit.context.before, ...hit.context.after].map((p) => (
                            <Link
                              className="context-item"
                              key={p.id}
                              href={`/read/${p.work}/${p.ref.replace(' ', '-')}`}
                            >
                              <strong>{p.ref}</strong>
                              <p>{p.translations[0]?.text ?? p.original_text}</p>
                            </Link>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
                {result.answer && (
                  <div className="explanation">
                    <span className="eyebrow">AI EVIDENCE ASSESSMENT · CHECK THE SOURCES</span>
                    {result.answer.paragraphs.map((p, i) => (
                      <div key={i}>
                        <p>{p.text}</p>
                        {p.citations.map((id) => {
                          const hit = result.matches.find((h) => h.passage.id === id);
                          return hit ? (
                            <Link
                              key={id}
                              href={`/read/${hit.passage.work}/${encodeURIComponent(hit.passage.ref.replace(' ', '-'))}`}
                            >
                              {hit.passage.work_title} · {hit.passage.ref} ↗{' '}
                            </Link>
                          ) : null;
                        })}
                      </div>
                    ))}
                  </div>
                )}
                <div className="explanation">
                  <span className="eyebrow">TEXT CHECK · DETERMINISTIC</span>
                  <h2>What this result tells you</h2>
                  <p>{result.explanation}</p>
                  {result.note && <p>{result.note}</p>}
                  <p className="coverage">{result.coverage_note}</p>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </>
  );
}
