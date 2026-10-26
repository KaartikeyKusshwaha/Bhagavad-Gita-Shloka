'use client';
import { DashboardAccount, useAccount } from './account-provider';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Bookmark, Check, ChevronRight, Download, Flame, Trash2 } from 'lucide-react';
import { activityDays, calendarDays, learningStats, localDay } from '@core/shared/src/device-data';
import { useDeviceData, changeDeviceData } from '../lib/device-store';
import { StudyTools, type StudyWork } from './study-tools';
export function Study({ works }: { works: StudyWork[] }) {
  const { user } = useAccount();
  const data = useDeviceData(),
    [today, setToday] = useState<Date | null>(null),
    [selected, setSelected] = useState(''),
    [tab, setTab] = useState<'activity' | 'saved' | 'tools'>('activity'),
    [error, setError] = useState('');
  const graph = useRef<HTMLDivElement>(null),
    cells = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    const now = new Date();
    setToday(now);
    setSelected(localDay(now));
  }, []);
  useEffect(() => {
    if (tab === 'activity' && graph.current) graph.current.scrollLeft = graph.current.scrollWidth;
  }, [today, tab]);
  const days = today ? calendarDays(today) : [],
    events = activityDays(data),
    stats = learningStats(data, today ?? new Date()),
    chosen = events.get(selected) ?? [];
  const selectedDate = days.find((day) => day.day === selected)?.date;
  function deleteBookmark(id: string) {
    try {
      changeDeviceData((state) => ({
        ...state,
        bookmarks: state.bookmarks.filter((b) => b.id !== id),
      }));
    } catch {
      setError('Could not update bookmarks. Device storage is unavailable.');
    }
  }
  function clearActivity() {
    try {
      changeDeviceData((state) => ({ ...state, activity: [], readPassages: [] }));
    } catch {
      setError('Could not clear activity.');
    }
  }
  function exportActivity() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            activity: data.activity,
            readPassages: data.readPassages,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'open-scripture-study.json';
    link.click();
    URL.revokeObjectURL(url);
  }
  function moveFocus(event: React.KeyboardEvent, index: number) {
    const offset =
      event.key === 'ArrowRight'
        ? 7
        : event.key === 'ArrowLeft'
          ? -7
          : event.key === 'ArrowDown'
            ? 1
            : event.key === 'ArrowUp'
              ? -1
              : 0;
    if (!offset) return;
    event.preventDefault();
    const next = Math.min(
      days.reduce((last, d, i) => (d.future ? last : i), 0),
      Math.max(0, index + offset),
    );
    setSelected(days[next].day);
    cells.current[next]?.focus();
  }
  return (
    <div className="study-page">
      <div className="study-header">
        <div>
          <span className="eyebrow">YOUR OWN PACE</span>
          <h1>A little, often.</h1>
          <p>
            {user
              ? 'Your personal reading dashboard.'
              : 'A record of your curiosity. Private to this device.'}
          </p>
        </div>
        <span className="study-emblem">
          <BookOpen size={29} strokeWidth={1.3} />
        </span>
      </div>
      <DashboardAccount />
      <div className="study-switch" role="group" aria-label="Study view">
        <button aria-pressed={tab === 'activity'} onClick={() => setTab('activity')}>
          <Flame size={15} />
          Activity
        </button>
        <button aria-pressed={tab === 'saved'} onClick={() => setTab('saved')}>
          <Bookmark size={15} />
          Saved passages<span>{data.bookmarks.length}</span>
        </button>
        <button aria-pressed={tab === 'tools'} onClick={() => setTab('tools')}>
          Study tools
        </button>
      </div>
      {tab === 'activity' ? (
        <section className="activity-card" aria-labelledby="activity-title">
          <div className="activity-heading">
            <div>
              <h2 id="activity-title">Your year of exploration</h2>
              <p>
                {stats.activeDays
                  ? `${stats.activeDays} active day${stats.activeDays === 1 ? '' : 's'}. Every thoughtful step counts.`
                  : 'Your first day starts with a passage or a question.'}
              </p>
            </div>
            <span className="activity-period">Past year</span>
          </div>
          <div className="activity-summary">
            <span>
              <strong>{stats.streak}</strong>day streak
            </span>
            <span>
              <strong>{stats.thisWeek}</strong>action{stats.thisWeek === 1 ? '' : 's'} this week
            </span>
            <span>
              <strong>{stats.read}</strong>passage{stats.read === 1 ? '' : 's'} marked read
            </span>
            <span>
              <strong>{data.activity.filter((a) => a.kind === 'reading').length}</strong>reading
              minutes
            </span>
          </div>
          <div
            className="activity-scroll"
            ref={graph}
            role="region"
            aria-label="Learning activity calendar, horizontally scrollable"
            tabIndex={-1}
          >
            <div className="calendar-content">
              <div className="calendar-months" aria-hidden="true">
                {Array.from({ length: 53 }, (_, week) => {
                  const date = days[week * 7]?.date,
                    previous = days[(week - 1) * 7]?.date;
                  return (
                    <span key={week}>
                      {date && (!previous || date.getMonth() !== previous.getMonth())
                        ? date.toLocaleDateString(undefined, { month: 'short' })
                        : ''}
                    </span>
                  );
                })}
              </div>
              <div className="calendar-with-labels">
                <div className="calendar-weekdays" aria-hidden="true">
                  <span />
                  <span>Mon</span>
                  <span />
                  <span>Wed</span>
                  <span />
                  <span>Fri</span>
                  <span />
                </div>
                <div
                  className="activity-grid"
                  role="grid"
                  aria-label="Daily learning activity; use arrow keys to explore dates"
                >
                  {Array.from({ length: 53 }, (_, week) => (
                    <div role="row" className="activity-week" key={week}>
                      {days.slice(week * 7, week * 7 + 7).map((day, row) => {
                        const count = events.get(day.day)?.length ?? 0,
                          index = week * 7 + row;
                        const level =
                          count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 9 ? 3 : 4;
                        const label = `${day.date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}: ${count} learning action${count === 1 ? '' : 's'}`;
                        return (
                          <div role="gridcell" key={day.day} aria-selected={selected === day.day}>
                            <button
                              ref={(el) => {
                                cells.current[index] = el;
                              }}
                              className={`activity-cell level-${level}${day.future ? ' future' : ''}`}
                              onClick={() => setSelected(day.day)}
                              onKeyDown={(event) => moveFocus(event, index)}
                              aria-label={label}
                              title={label}
                              disabled={day.future}
                              tabIndex={selected === day.day ? 0 : -1}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="calendar-footer">
            <span>Small steps, over time.</span>
            <div className="activity-legend" aria-label="Color intensity indicates daily activity">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((level) => (
                <i key={level} className={`activity-cell level-${level}`} aria-hidden="true" />
              ))}
              <span>More</span>
            </div>
          </div>
          <div className="selected-day" aria-live="polite">
            <span className="selected-day-icon">
              <Check size={16} />
            </span>
            <div>
              <strong>
                {selectedDate
                  ? selectedDate.toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Loading your calendar…'}
              </strong>
              <p>
                {chosen.length
                  ? (['read', 'search', 'verify', 'ask', 'practice', 'reading'] as const)
                      .map((kind) => {
                        const count = chosen.filter((a) => a.kind === kind).length;
                        return count
                          ? `${count} ${kind === 'reading' ? 'reading minute' + (count === 1 ? '' : 's') : kind === 'read' ? 'passage' + (count === 1 ? '' : 's') + ' marked read' : kind === 'search' ? 'search' + (count === 1 ? '' : 'es') : kind === 'verify' ? 'quotation check' + (count === 1 ? '' : 's') : kind === 'ask' ? 'question' + (count === 1 ? '' : 's') : 'practice session' + (count === 1 ? '' : 's')}`
                          : null;
                      })
                      .filter(Boolean)
                      .join(' · ')
                  : 'No recorded activity. There is no need to catch up.'}
              </p>
            </div>
          </div>
          <div className="activity-next">
            <p>Read something that stays with you.</p>
            <Link href="/library">
              Open the reader <ChevronRight size={16} />
            </Link>
          </div>
          <details className="study-data-controls">
            <summary>How activity is counted & device controls</summary>
            <p>
              A submitted search, quotation check or question counts once per submission. A passage
              counts when you mark it read or press Next to save the passage you are leaving, once
              per day. Start a reading session in the reader to count completed active minutes. The
              timer pauses in hidden or unfocused tabs and after two minutes without interaction.
              Each minute contributes to the grid; it does not certify understanding. Opening a page
              does not create activity. The calendar uses your local timezone. Clearing Explore
              history leaves these counts in place.
            </p>
            <div>
              <button className="quiet-button" onClick={exportActivity}>
                <Download size={14} />
                Export activity
              </button>
              <button className="quiet-button" onClick={clearActivity}>
                <Trash2 size={14} />
                Clear activity & read progress
              </button>
            </div>
          </details>
        </section>
      ) : tab === 'tools' ? (
        <StudyTools works={works} />
      ) : (
        <section className="saved-passages" aria-label="Saved passages">
          {data.bookmarks.length ? (
            data.bookmarks.map((bookmark) => (
              <article key={bookmark.id} className={`marked-${bookmark.color ?? 'gold'}`}>
                <Link
                  href={`/read/${encodeURIComponent(bookmark.work)}/${encodeURIComponent(bookmark.ref.replace(' ', '-'))}`}
                >
                  <span>
                    {bookmark.title} · {bookmark.ref}
                  </span>
                  <p>{bookmark.preview}</p>
                  {bookmark.note && <p className="saved-note">My note · {bookmark.note}</p>}
                  <small>
                    Continue reading <ChevronRight size={13} />
                  </small>
                </Link>
                <button
                  className="icon-button"
                  onClick={() => deleteBookmark(bookmark.id)}
                  aria-label={`Remove ${bookmark.ref} from bookmarks`}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))
          ) : (
            <div className="study-empty">
              <Bookmark size={27} strokeWidth={1.3} />
              <h2>Keep a passage close.</h2>
              <p>Tap the bookmark on a passage to find it here.</p>
              <Link className="button primary" href="/library">
                Find something to read <ChevronRight size={15} />
              </Link>
            </div>
          )}
        </section>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
