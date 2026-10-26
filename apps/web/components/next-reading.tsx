'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useAccount } from './account-provider';
import { changeDeviceData } from '../lib/device-store';
import { addActivity } from '@core/shared/src/device-data';
import type { Passage } from '@core/shared/src/index';

export function NextReading({
  passage,
  href,
  label,
}: {
  passage: Pick<Passage, 'id' | 'work' | 'ref' | 'work_title'>;
  href: string;
  label: string;
}) {
  const { flush } = useAccount();
  const router = useRouter();
  const [pending, setPending] = useState(false),
    [error, setError] = useState('');
  return (
    <span className="next-reading">
      <button
        className="quiet-button"
        disabled={pending}
        aria-label={`Next: ${label} · save reading progress`}
        onClick={async () => {
          setPending(true);
          setError('');
          try {
            changeDeviceData((state) =>
              addActivity(
                {
                  ...state,
                  readPassages: Array.from(new Set([...state.readPassages, passage.id])),
                  readingPlaces: [
                    {
                      work: passage.work,
                      ref: passage.ref,
                      title: passage.work_title,
                      at: new Date().toISOString(),
                    },
                    ...(state.readingPlaces ?? []).filter((p) => p.work !== passage.work),
                  ].slice(0, 100),
                },
                'read',
                passage.id,
              ),
            );
            await flush();
            router.push(href);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : 'Could not save your reading progress. Try again.',
            );
            setPending(false);
          }
        }}
      >
        {pending ? (
          'Saving progress…'
        ) : (
          <>
            Next · {label}
            <ArrowRight size={14} />
          </>
        )}
      </button>
      {error && (
        <span role="alert" className="error">
          {error}
        </span>
      )}
    </span>
  );
}
