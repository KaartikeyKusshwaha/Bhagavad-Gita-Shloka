'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { addActivity, localDay, parseExploreReply } from '@core/shared/src/device-data';
import { encodeLesson } from '@core/shared/src/lessons';
import type { Passage } from '@core/shared/src/index';
import { changeLearningData, useLearningData } from '../lib/learning-store';
import { changeDeviceData, useDeviceData } from '../lib/device-store';
import { PassageCard } from './passage';
export interface StudyWork {
  slug: string;
  title: string;
  passage_count: number;
}
export function StudyTools({ works }: { works: StudyWork[] }) {
  const learning = useLearningData(),
    device = useDeviceData();
  const [tool, setTool] = useState('plan'),
    [work, setWork] = useState(works[0]?.slug ?? ''),
    [daily, setDaily] = useState(5),
    [passages, setPassages] = useState<Passage[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false),
    [title, setTitle] = useState('A shared reading'),
    [questions, setQuestions] = useState(
      'What do you notice in the words?\nWhat does the surrounding passage add?',
    ),
    [selected, setSelected] = useState<string[]>([]),
    [share, setShare] = useState(''),
    [today, setToday] = useState('');
  const plan = learning.plan;
  useEffect(() => {
    setToday(localDay(new Date()));
  }, []);
  useEffect(() => {
    setPassages([]);
    setError('');
    if (tool !== 'plan' || !plan || plan.cursor >= plan.total || plan.completedDay === today)
      return;
    const controller = new AbortController();
    setLoading(true);
    fetch(
      `/v1/works/${encodeURIComponent(plan.work)}/reading?after=${plan.cursor}&limit=${plan.daily}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load the reading. Try reopening Study tools.');
        return response.json();
      })
      .then((body) =>
        setPassages(
          parseExploreReply({
            hits: body.passages.map((p: Passage) => ({
              passage: p,
              score: 1,
              match_type: 'reference',
            })),
          }).hits!.map((h) => h.passage),
        ),
      )
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : 'Could not load reading.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [tool, plan?.work, plan?.cursor, plan?.daily, plan?.completedDay, plan?.total, today]);
  function createPlan() {
    const selectedWork = works.find((w) => w.slug === work);
    if (!selectedWork) return;
    try {
      changeLearningData((data) => ({
        ...data,
        plan: {
          work,
          title: selectedWork.title,
          daily,
          cursor: 0,
          total: selectedWork.passage_count,
        },
      }));
    } catch {
      setError('Could not save the reading plan on this device.');
    }
  }
  function completeReading() {
    if (!plan || !passages.length) return;
    try {
      changeDeviceData((data) =>
        passages.reduce(
          (state, p) =>
            addActivity(
              { ...state, readPassages: Array.from(new Set([...state.readPassages, p.id])) },
              'read',
              p.id,
            ),
          data,
        ),
      );
      changeLearningData((data) => ({
        ...data,
        plan: data.plan
          ? { ...data.plan, cursor: passages.at(-1)!.ordinal, completedDay: localDay(new Date()) }
          : null,
      }));
    } catch {
      setError('Could not save reading progress on this device.');
    }
  }
  function makeLesson() {
    try {
      const lesson = {
        version: 1 as const,
        title,
        passages: device.bookmarks
          .filter((b) => selected.includes(b.id))
          .map((b) => ({ work: b.work, ref: b.ref })),
        questions: questions
          .split('\n')
          .map((q) => q.trim())
          .filter(Boolean),
      };
      setShare(`${location.origin}/lesson#${encodeLesson(lesson)}`);
      setError('');
    } catch {
      setError('Choose 1–10 saved passages, a title, and up to 8 questions (500 characters each).');
    }
  }
  return (
    <section className="study-tools-card">
      <label className="study-tool-choice">
        Choose a tool
        <select
          aria-label="Choose a study tool"
          value={tool}
          onChange={(e) => {
            setTool(e.target.value);
            setError('');
          }}
        >
          <option value="plan">Reading plan</option>
          <option value="revision">Spaced revision</option>
          <option value="lesson">Classroom set</option>
        </select>
      </label>
      {tool === 'plan' && (
        <div className="learning-tool">
          <h2>A few passages each day.</h2>
          {plan ? (
            <>
              <p>
                {plan.title} · {plan.cursor} of {plan.total} passages complete
              </p>
              <progress aria-label="Reading plan progress" value={plan.cursor} max={plan.total} />
              {plan.cursor >= plan.total ? (
                <p role="status">
                  You have finished this edition. Choose another whenever you are ready.
                </p>
              ) : plan.completedDay === today ? (
                <p role="status">
                  Today’s reading is complete. Your next passages will be ready tomorrow. You can
                  keep reading freely in Read.
                </p>
              ) : (
                <>
                  <p>
                    Today’s reading · up to {plan.daily} passages. Mark complete when you finish.
                  </p>
                  {loading && <p role="status">Loading your reading…</p>}
                  {passages.map((p) => (
                    <PassageCard key={p.id} passage={p} compact />
                  ))}
                  <button
                    className="button primary"
                    disabled={!passages.length || loading}
                    onClick={completeReading}
                  >
                    Complete today’s reading
                  </button>
                </>
              )}
              <button
                className="quiet-button"
                onClick={() => {
                  try {
                    changeLearningData((data) => ({ ...data, plan: null }));
                  } catch {
                    setError('Could not remove the plan.');
                  }
                }}
              >
                Remove reading plan
              </button>
            </>
          ) : (
            <>
              <p>
                Start from the beginning of one edition. Your place stays on this device; missed
                days carry no penalty.
              </p>
              <label>
                Text
                <select
                  aria-label="Reading plan text"
                  value={work}
                  onChange={(e) => setWork(e.target.value)}
                >
                  {works.map((w) => (
                    <option key={w.slug} value={w.slug}>
                      {w.title} · {w.passage_count} passages
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Daily pace
                <select
                  aria-label="Daily pace"
                  value={daily}
                  onChange={(e) => setDaily(Number(e.target.value))}
                >
                  {[1, 3, 5, 10, 20].map((n) => (
                    <option key={n} value={n}>
                      {n} passage{n === 1 ? '' : 's'}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button primary" onClick={createPlan}>
                Start reading plan
              </button>
            </>
          )}
        </div>
      )}
      {tool === 'revision' && (
        <div className="learning-tool">
          <h2>Return to the words.</h2>
          <p>
            Open “Practice this passage” in the reader, then rate your recall to add it here. Again
            schedules 10 minutes; remembered and easy gradually increase the interval.
          </p>
          {!learning.revision.length ? (
            <Link href="/library" className="text-link">
              Choose a passage to practise →
            </Link>
          ) : (
            [...learning.revision]
              .sort((a, b) => a.due.localeCompare(b.due))
              .map((card) => (
                <div key={card.id} className="revision-row">
                  <Link
                    href={`/read/${card.work}/${encodeURIComponent(card.ref.replace(' ', '-'))}`}
                  >
                    <strong>
                      {card.title} · {card.ref}
                    </strong>
                    <span>
                      {new Date(card.due) <= new Date()
                        ? 'Ready to review'
                        : `Next review ${new Date(card.due).toLocaleString()}`}
                    </span>
                  </Link>
                  <button
                    className="quiet-button"
                    aria-label={`Remove ${card.ref} from revision`}
                    onClick={() => {
                      try {
                        changeLearningData((data) => ({
                          ...data,
                          revision: data.revision.filter((c) => c.id !== card.id),
                        }));
                      } catch {
                        setError('Could not update revision.');
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))
          )}
        </div>
      )}
      {tool === 'lesson' && (
        <div className="learning-tool">
          <h2>A reading to share.</h2>
          <p>
            Choose saved passages and write discussion questions. The share link contains this set;
            it does not publish a server record. Anyone with the link can read it. Avoid personal
            information.
          </p>
          <label>
            Set title
            <input
              aria-label="Classroom set title"
              value={title}
              maxLength={150}
              onChange={(e) => {
                setTitle(e.target.value);
                setShare('');
              }}
            />
          </label>
          <fieldset>
            <legend>Choose up to 10 saved passages</legend>
            {device.bookmarks.length ? (
              device.bookmarks.map((b) => (
                <label className="lesson-passage-choice" key={b.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(b.id)}
                    onChange={(e) => {
                      setSelected(
                        e.target.checked
                          ? [...selected, b.id]
                          : selected.filter((id) => id !== b.id),
                      );
                      setShare('');
                    }}
                  />
                  {b.title} · {b.ref}
                </label>
              ))
            ) : (
              <p>Bookmark passages in the reader first.</p>
            )}
          </fieldset>
          <label>
            Discussion questions · one per line
            <textarea
              aria-label="Discussion questions"
              value={questions}
              rows={5}
              maxLength={4000}
              onChange={(e) => {
                setQuestions(e.target.value);
                setShare('');
              }}
            />
          </label>
          <button
            className="button primary"
            disabled={!selected.length || selected.length > 10 || !title.trim()}
            onClick={makeLesson}
          >
            Create share link
          </button>
          {share && (
            <div className="lesson-share">
              <label>
                Your classroom link
                <input
                  aria-label="Classroom share link"
                  readOnly
                  value={share}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <a className="text-link" href={share}>
                Preview classroom set →
              </a>
              <button
                className="quiet-button"
                onClick={() =>
                  navigator.clipboard
                    .writeText(share)
                    .then(() => setError('Link copied.'))
                    .catch(() => setError('Select and copy the link manually.'))
                }
              >
                Copy link
              </button>
            </div>
          )}
        </div>
      )}
      {error && <p role="status">{error}</p>}
    </section>
  );
}
