'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { HumanAudio as Track } from '@core/shared/src/index';
export function HumanAudio({ tracks }: { tracks: Track[] }) {
  const [open, setOpen] = useState(false),
    [error, setError] = useState('');
  const approved = tracks.filter(
    (t) =>
      t.is_human &&
      t.source.status === 'approved' &&
      /^https:\/\/upload\.wikimedia\.org\//.test(t.url),
  );
  if (!approved.length) return null;
  return (
    <details className="human-audio" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Listen · human recitation</summary>
      {open &&
        approved.map((track) => (
          <div key={track.id}>
            <p>
              <strong>{String(track.source.display_rules.scope ?? 'Human recitation')}</strong>
              <br />
              {track.reciter} · {track.license} · unmodified recording
            </p>
            <Link className="text-link" href="/read/quran/chapter/1">
              Read the complete surah →
            </Link>
            <p className="audio-privacy-note">
              Playback streams from Wikimedia Commons when you press Play.
            </p>
            <audio
              controls
              preload="none"
              src={track.url}
              aria-label={`Human recitation: ${String(track.source.display_rules.scope)}`}
              onError={() =>
                setError(
                  'This recording could not be played. Open the source recording or try again online.',
                )
              }
            />
            <p className="source-inline">
              <a href={track.source.url} target="_blank" rel="noreferrer">
                Source recording ↗
              </a>{' '}
              ·{' '}
              <a href={track.source.license_url} target="_blank" rel="noreferrer">
                {track.license}
              </a>
              <br />
              {track.source.attribution}
            </p>
          </div>
        ))}
      {error && <p role="status">{error}</p>}
    </details>
  );
}
