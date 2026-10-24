'use client';
import { useState } from 'react';
import Link from 'next/link';
import { compareRecall, nextReview, recallQuiz, type WordChange } from '@core/shared/src/practice';
import { addActivity } from '@core/shared/src/device-data';
import type { Passage } from '@core/shared/src/index';
import { changeDeviceData } from '../lib/device-store';
import { changeLearningData, useLearningData } from '../lib/learning-store';
import { SpeechInput } from './speech';

export function Practice({
  passage,
  onHide,
}: {
  passage: Passage;
  onHide: (hidden: boolean) => void;
}) {
  const learning = useLearningData(),
    saved = learning.revision.find((c) => c.id === passage.id);
  const [layer, setLayer] = useState('original'),
    [hidden, setHidden] = useState(false),
    [attempt, setAttempt] = useState(''),
    [changes, setChanges] = useState<WordChange[] | null>(null),
    [notice, setNotice] = useState('');
  const [quizOpen, setQuizOpen] = useState(false),
    [choice, setChoice] = useState('');
  const target =
    layer === 'original'
      ? passage.original_text
      : layer === 'roman'
        ? passage.transliteration
        : (passage.translations.find((t) => t.id === layer)?.text ?? passage.original_text);
  const quiz = recallQuiz(target);
  function schedule(rating: 'again' | 'good' | 'easy') {
    try {
      changeLearningData((data) => ({
        ...data,
        revision: [
          {
            id: passage.id,
            work: passage.work,
            ref: passage.ref,
            title: passage.work_title,
            ...nextReview(saved?.level ?? 0, rating),
          },
          ...data.revision.filter((c) => c.id !== passage.id),
        ].slice(0, 2000),
      }));
      changeDeviceData((data) => addActivity(data, 'practice', crypto.randomUUID()));
      setNotice('Review saved. Find your next session in Study → Study tools → Revision.');
    } catch {
      setNotice('Could not save the review on this device.');
    }
  }
  return (
    <details
      className="practice-section"
      onToggle={(e) => {
        if (!e.currentTarget.open) {
          setHidden(false);
          onHide(false);
        }
      }}
    >
      <summary>Practice this passage</summary>
      <div className="practice-content">
        <p>
          Read, hide, then recall the words. Spoken input is experimental: recognition errors can
          look like missing or changed words. This checks text, not pronunciation.
        </p>
        <label>
          Practice text
          <select
            aria-label="Practice text"
            value={layer}
            onChange={(e) => {
              setLayer(e.target.value);
              setChanges(null);
              setHidden(false);
              onHide(false);
              setChoice('');
              setQuizOpen(false);
            }}
          >
            <option value="original">Primary text</option>
            {passage.transliteration && <option value="roman">Transliteration</option>}
            {passage.translations.map((t) => (
              <option key={t.id} value={t.id}>
                {t.translator} · {t.lang}
              </option>
            ))}
          </select>
        </label>
        <button
          className="quiet-button"
          onClick={() => {
            setHidden(!hidden);
            onHide(!hidden);
          }}
          aria-pressed={hidden}
        >
          {hidden ? 'Reveal practice text' : 'Hide practice text'}
        </button>
        <p
          className="practice-target"
          dir={passage.original_script === 'Arabic' && layer === 'original' ? 'rtl' : 'auto'}
        >
          {hidden ? 'Recall the passage from memory…' : target}
        </p>
        <label>
          Your recall
          <textarea
            aria-label="Your recall"
            value={attempt}
            maxLength={5000}
            onChange={(e) => {
              setAttempt(e.target.value);
              setChanges(null);
            }}
            placeholder="Type, paste or speak the words you remember…"
            rows={4}
          />
        </label>
        <SpeechInput
          onTranscript={(text) => {
            setAttempt(text.slice(0, 5000));
            setChanges(null);
          }}
        />
        <button
          className="button secondary"
          disabled={!attempt.trim()}
          onClick={() => {
            setChanges(compareRecall(target, attempt));
            setHidden(false);
            onHide(false);
          }}
        >
          Compare wording
        </button>
        {changes && (
          <div className="recall-result" role="status">
            <strong>
              {changes.every((c) => c.kind === 'same')
                ? 'The normalized words match.'
                : 'Review these text differences.'}
            </strong>
            <p>
              Comparison ignores punctuation, Latin accents and Arabic vowel marks. Displayed
              scripture stays unchanged.
            </p>
            <ul>
              {changes
                .filter((c) => c.kind !== 'same')
                .slice(0, 30)
                .map((c, i) => (
                  <li key={i}>
                    {c.kind === 'missing'
                      ? `Missing: ${c.expected}`
                      : c.kind === 'extra'
                        ? `Extra: ${c.actual}`
                        : `Changed: ${c.expected} → ${c.actual}`}
                  </li>
                ))}
            </ul>
          </div>
        )}
        <div className="practice-rating" role="group" aria-label="Schedule your next review">
          <button className="quiet-button" onClick={() => schedule('again')}>
            Again · 10 min
          </button>
          <button className="quiet-button" onClick={() => schedule('good')}>
            Remembered
          </button>
          <button className="quiet-button" onClick={() => schedule('easy')}>
            Easy
          </button>
        </div>
        {quiz && (
          <div className="recall-quiz">
            <button
              className="quiet-button"
              aria-expanded={quizOpen}
              onClick={() => {
                setQuizOpen(!quizOpen);
                setChoice('');
                if (!quizOpen) {
                  setHidden(true);
                  onHide(true);
                }
              }}
            >
              Try a word-order quiz
            </button>
            {quizOpen && (
              <>
                <p>
                  Which word follows <strong>{quiz.cue}</strong> in this practice text?
                </p>
                <div role="group" aria-label="Quiz choices">
                  {quiz.choices.map((word) => (
                    <button
                      className="button secondary"
                      key={word}
                      disabled={Boolean(choice)}
                      onClick={() => setChoice(word)}
                    >
                      {word}
                    </button>
                  ))}
                </div>
                {choice && (
                  <p role="status">
                    {choice === quiz.answer
                      ? 'Correct.'
                      : `The recorded next word is ${quiz.answer}.`}{' '}
                    Reveal the passage to check the surrounding words.
                  </p>
                )}
              </>
            )}
          </div>
        )}
        <p className="source-inline">
          Rate your own recall to schedule another review. <Link href="/study">Open Study</Link>
        </p>
        {notice && <p role="status">{notice}</p>}
      </div>
    </details>
  );
}
