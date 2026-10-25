'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { addActivity } from '@core/shared/src/device-data';
import { changeDeviceData } from '../lib/device-store';
import Link from 'next/link';

export function ReadingExperience({ children, work }: { children: ReactNode; work: string }) {
  const [size, setSize] = useState('comfortable'),
    [view, setView] = useState('parallel'),
    [focus, setFocus] = useState(false);
  const [running, setRunning] = useState(false),
    [seconds, setSeconds] = useState(0),
    [status, setStatus] = useState('');
  const elapsed = useRef(0),
    session = useRef(''),
    interaction = useRef(0);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('scripture-reader-style') ?? '{}');
      if (['comfortable', 'large', 'compact'].includes(saved.size)) setSize(saved.size);
      if (['parallel', 'translation'].includes(saved.view)) setView(saved.view);
    } catch {
      /* Optional presentation preferences. */
    }
  }, []);
  function style(nextSize: string, nextView: string) {
    setSize(nextSize);
    setView(nextView);
    try {
      localStorage.setItem(
        'scripture-reader-style',
        JSON.stringify({ size: nextSize, view: nextView }),
      );
    } catch {
      /* Reading remains available. */
    }
  }
  useEffect(() => {
    if (!running) return;
    const touch = () => {
      interaction.current = Date.now();
    };
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    for (const event of events) window.addEventListener(event, touch, { passive: true });
    let last = performance.now();
    const interval = setInterval(() => {
      const now = performance.now(),
        delta = Math.min(now - last, 1500);
      last = now;
      if (
        document.visibilityState !== 'visible' ||
        !document.hasFocus() ||
        Date.now() - interaction.current > 120000
      ) {
        setStatus('Paused while away. Return and interact to continue.');
        return;
      }
      const before = Math.floor(elapsed.current / 60000);
      elapsed.current += delta;
      setSeconds(Math.floor(elapsed.current / 1000));
      if (Math.floor(elapsed.current / 60000) > before) {
        try {
          changeDeviceData((state) =>
            addActivity(state, 'reading', `${work}:${session.current}:${before + 1}`),
          );
          setStatus('Completed minute added to your Study grid.');
        } catch {
          setRunning(false);
          setStatus('Could not save progress. Restart the session to try again.');
        }
      } else setStatus('Counting active reading time.');
    }, 1000);
    return () => {
      clearInterval(interval);
      for (const event of events) window.removeEventListener(event, touch);
    };
  }, [running, work]);
  return (
    <div className="reading-experience" data-size={size} data-view={view} data-focus={focus}>
      <div className="reading-toolbar" aria-label="Reading preferences">
        <div className="reading-style-controls">
          <label>
            Text size
            <select
              aria-label="Reading text size"
              value={size}
              onChange={(e) => style(e.target.value, view)}
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="large">Large</option>
            </select>
          </label>
          <label>
            Reading view
            <select
              aria-label="Reading view"
              value={view}
              onChange={(e) => style(size, e.target.value)}
            >
              <option value="parallel">Original & translation</option>
              <option value="translation">Translation first</option>
            </select>
          </label>
          <button className="quiet-button" aria-pressed={focus} onClick={() => setFocus(!focus)}>
            {focus ? 'Show contents' : 'Focus reading'}
          </button>
        </div>
        <div className="reading-session">
          <button
            className="button secondary"
            onClick={() => {
              if (!session.current) session.current = crypto.randomUUID();
              interaction.current = Date.now();
              setRunning(!running);
              setStatus(
                running
                  ? 'Session paused. Completed minutes are saved.'
                  : 'Counting active reading time.',
              );
            }}
          >
            {running ? 'Pause session' : seconds ? 'Resume session' : 'Start reading session'}
          </button>
          <span aria-label="Session elapsed time">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </span>
          <LinkToStudy />
        </div>
        <p className="reading-session-status" role="status">
          {status ||
            'Optional timer · completed active minutes appear in your Study grid. Partial minutes end when you leave this page.'}
        </p>
      </div>
      {children}
    </div>
  );
}
function LinkToStudy() {
  return (
    <Link href="/study" className="text-link">
      View Study progress ↗
    </Link>
  );
}
