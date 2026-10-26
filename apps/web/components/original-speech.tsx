'use client';
import { useEffect, useRef, useState } from 'react';
import type { Passage } from '@core/shared/src/index';
import { cartesiaLanguages } from '@core/shared/src/speech';
import { languageName } from './library-browser';
type Options = {
  available: boolean;
  reason: string;
  lang: string;
  provider: string;
  model: string;
  voices: { id: string; name: string; locale: string }[];
};
export function OriginalSpeech({ passage }: { passage: Passage }) {
  const lang = String(passage.source.display_rules.lang ?? '');
  const [options, setOptions] = useState<Options | null>(null),
    [voice, setVoice] = useState(''),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [url, setUrl] = useState(''),
    [rate, setRate] = useState('1'),
    [cache, setCache] = useState('');
  const blob = useRef(''),
    request = useRef<AbortController | null>(null),
    player = useRef<HTMLAudioElement | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
      if (blob.current) URL.revokeObjectURL(blob.current);
    },
    [],
  );
  if (lang !== 'sa' && !cartesiaLanguages.has(lang))
    return (
      <p className="source-inline">
        Original-language speech is not available for {languageName(lang)} through the configured
        providers. No substitute language is used.
      </p>
    );
  if (
    passage.source.display_rules.no_generative_ai === true ||
    passage.source.display_rules.preserve_verbatim === true
  )
    return (
      <p className="source-inline">Synthetic speech is not enabled for this source edition.</p>
    );
  async function load() {
    if (options || pending) return;
    setPending(true);
    setError('');
    const controller = new AbortController();
    request.current = controller;
    try {
      const r = await fetch(`/v1/speech/options?passage_id=${encodeURIComponent(passage.id)}`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(90000)]),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message ?? 'Unable to load voices.');
      setOptions(data);
      setVoice(data.voices[0]?.id ?? '');
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : 'Unable to load voices.');
    } finally {
      setPending(false);
    }
  }
  async function generate() {
    setPending(true);
    setError('');
    const controller = new AbortController();
    request.current = controller;
    try {
      const r = await fetch('/v1/speech/original', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Scripture-Client': '1' },
        body: JSON.stringify({ passage_id: passage.id, voice_id: voice }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(100000)]),
      });
      if (!r.ok) {
        const data = await r.json();
        throw new Error(data.error?.message ?? 'Speech generation failed.');
      }
      const audio = await r.blob();
      if (!audio.size) throw new Error('No audio was returned.');
      if (blob.current) URL.revokeObjectURL(blob.current);
      blob.current = URL.createObjectURL(audio);
      setUrl(blob.current);
      setCache(r.headers.get('X-Speech-Cache') ?? '');
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : 'Speech generation failed.');
    } finally {
      setPending(false);
    }
  }
  return (
    <details
      className="original-speech"
      onToggle={(e) => {
        if (e.currentTarget.open) void load();
        else player.current?.pause();
      }}
    >
      <summary>Listen to original · {languageName(lang)}</summary>
      <p className="source-inline">
        Synthetic speech · {lang === 'sa' ? 'YourVoic Aura Prime' : 'Cartesia Sonic 3.6'}. Only the
        displayed source text is sent to {lang === 'sa' ? 'YourVoic' : 'Cartesia'}
        when you generate audio. Pronunciation is not a reviewed liturgical recitation.
      </p>
      {options?.available && (
        <div className="translation-controls">
          <label>
            Native voice
            <select
              aria-label={`Original ${languageName(lang)} voice`}
              value={voice}
              disabled={pending}
              onChange={(e) => {
                player.current?.pause();
                setVoice(e.target.value);
                setUrl('');
                setCache('');
                if (blob.current) {
                  URL.revokeObjectURL(blob.current);
                  blob.current = '';
                }
              }}
            >
              {options.voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.locale}
                </option>
              ))}
            </select>
          </label>
          <button className="button secondary" disabled={pending} onClick={() => void generate()}>
            {pending
              ? 'Preparing original audio…'
              : url
                ? 'Load saved audio'
                : 'Generate original audio'}
          </button>
        </div>
      )}
      {pending && (
        <p role="status">
          {options ? 'Preparing original audio…' : 'Finding native-language voices…'}
        </p>
      )}
      {options && !options.available && <p role="status">{options.reason}</p>}
      {url && (
        <div>
          <audio
            key={url}
            ref={player}
            controls
            preload="metadata"
            src={url}
            aria-label={`Original ${languageName(lang)} audio · ${passage.ref}`}
            onLoadedMetadata={() => {
              if (player.current) player.current.playbackRate = Number(rate);
            }}
            onError={() => setError('The audio could not be played. Retry loading it.')}
          />
          <label>
            Playback speed
            <select
              aria-label="Original audio speed"
              value={rate}
              onChange={(e) => {
                setRate(e.target.value);
                if (player.current) player.current.playbackRate = Number(e.target.value);
              }}
            >
              <option value="0.75">0.75×</option>
              <option value="1">1×</option>
              <option value="1.25">1.25×</option>
              <option value="1.5">1.5×</option>
            </select>
          </label>
          <p className="source-inline">
            {cache === 'HIT'
              ? 'Saved audio · no new generation request'
              : 'Audio generated and saved for replay'}{' '}
            · {passage.source.name}
          </p>
        </div>
      )}
      {error && (
        <div role="alert" className="error">
          {error}
          <button
            className="quiet-button"
            disabled={pending}
            onClick={() => void (options ? generate() : load())}
          >
            Retry original audio
          </button>
        </div>
      )}
    </details>
  );
}
