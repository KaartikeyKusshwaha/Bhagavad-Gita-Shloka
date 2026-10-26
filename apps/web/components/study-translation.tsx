'use client';
import { useState } from 'react';
import type { Passage } from '@core/shared/src/index';
export const studyLanguages = {
  en: 'English',
  hi: 'Hindi',
  bn: 'Bengali',
  ta: 'Tamil',
  te: 'Telugu',
  mr: 'Marathi',
  gu: 'Gujarati',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
  ur: 'Urdu',
  or: 'Odia',
  as: 'Assamese',
  ne: 'Nepali',
  ar: 'Arabic',
  he: 'Hebrew',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
  pt: 'Portuguese',
  ru: 'Russian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
};
export function StudyTranslation({ passage }: { passage: Passage }) {
  const [language, setLanguage] = useState('hi'),
    [pending, setPending] = useState(false),
    [result, setResult] = useState(''),
    [error, setError] = useState('');
  if (
    passage.source.display_rules.machine_translation_allowed !== true ||
    passage.source.display_rules.no_generative_ai === true ||
    passage.source.display_rules.preserve_verbatim === true
  )
    return null;
  return (
    <details className="study-translation">
      <summary>Read a study translation in another language</summary>
      <p>
        AI-assisted and unreviewed. Meaning, names and religious terminology may be inaccurate. Keep
        the source edition alongside it.
      </p>
      <div className="translation-controls">
        <select
          aria-label="Study translation language"
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            setResult('');
            setError('');
          }}
        >
          {Object.entries(studyLanguages)
            .filter(([code]) => code !== passage.source.display_rules.lang)
            .map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
        </select>
        <button
          className="button"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            setError('');
            try {
              const r = await fetch('/v1/study-translation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passage_id: passage.id, target_lang: language }),
                signal: AbortSignal.timeout(90000),
              });
              const d = await r.json();
              if (!r.ok) throw new Error(d.error?.message ?? 'Translation unavailable.');
              setResult(d.text);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Translation unavailable.');
            } finally {
              setPending(false);
            }
          }}
        >
          {pending ? 'Translating…' : 'Translate this passage'}
        </button>
      </div>
      {result && (
        <section aria-label="Unreviewed AI study translation">
          <span className="layer-label">AI study translation · unreviewed</span>
          <p lang={language} dir={['ar', 'he', 'ur'].includes(language) ? 'rtl' : 'ltr'}>
            {result}
          </p>
          <small>
            Generated from {passage.source.name}. This is not a published scripture edition.
          </small>
        </section>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </details>
  );
}
