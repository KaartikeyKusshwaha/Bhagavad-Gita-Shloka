'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Volume2 } from 'lucide-react';

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally?: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

/** Recognition is only started by a deliberate click; a transcript never submits itself. */
export function SpeechInput({
  onTranscript,
  disabled = false,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [supported, setSupported] = useState(false),
    [local, setLocal] = useState(false),
    [localSupported, setLocalSupported] = useState(false),
    [onlineConsent, setOnlineConsent] = useState(false),
    [listening, setListening] = useState(false),
    [lang, setLang] = useState('en-IN'),
    [message, setMessage] = useState('');
  const recognition = useRef<Recognition | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const Constructor =
      (window as SpeechWindow).SpeechRecognition ??
      (window as SpeechWindow).webkitSpeechRecognition;
    if (Constructor) {
      setSupported(true);
      setLocal('processLocally' in new Constructor());
      setLocalSupported('processLocally' in new Constructor());
    }
    return () => {
      recognition.current?.abort();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  function start() {
    const Constructor =
      (window as SpeechWindow).SpeechRecognition ??
      (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor || (!local && !onlineConsent)) return;
    const r = new Constructor();
    recognition.current = r;
    r.lang = lang;
    r.continuous = false;
    r.interimResults = false;
    if (local) r.processLocally = true;
    r.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(' ')
        .trim();
      if (text) {
        onTranscript(text);
        setMessage('Transcript added. Review or edit it before sending.');
      }
    };
    r.onerror = (event) =>
      setMessage(
        event.error === 'not-allowed'
          ? 'Microphone permission was denied. You can still type.'
          : event.error === 'language-not-supported'
            ? 'This local language pack is unavailable. Install it in your browser settings or type instead.'
            : event.error === 'no-speech'
              ? 'No speech was detected. Try again or type.'
              : `Speech input stopped (${event.error}). You can still type.`,
      );
    r.onend = () => {
      setListening(false);
      if (timer.current) clearTimeout(timer.current);
      recognition.current = null;
    };
    try {
      setMessage('Listening. Select Stop when finished.');
      r.start();
      setListening(true);
      timer.current = setTimeout(() => r.stop(), 60000);
    } catch {
      setMessage('Speech input could not start. Check microphone and language settings.');
      setListening(false);
    }
  }
  return (
    <div className="speech-input">
      <button
        type="button"
        className="quiet-button"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (open) recognition.current?.abort();
          setOpen(!open);
        }}
      >
        <Mic size={15} />
        Voice input
      </button>
      {open && (
        <div className="speech-options">
          <p>
            {!supported
              ? 'Speech input is unavailable in this browser. You can type or paste a transcript.'
              : local
                ? 'Speech recognition will run on this device. A supported browser language pack is required.'
                : 'Your browser’s speech service may send microphone audio to its provider. This website does not record or store audio.'}
          </p>
          {supported && (
            <>
              <label>
                Spoken language
                <select
                  aria-label="Spoken language"
                  value={lang}
                  disabled={listening}
                  onChange={(e) => setLang(e.target.value)}
                >
                  <option value="en-IN">English</option>
                  <option value="hi-IN">Hindi</option>
                  <option value="ar-SA">Arabic</option>
                  <option value="sa-IN">Sanskrit (support varies)</option>
                </select>
              </label>
              {localSupported && (
                <label>
                  Speech processing
                  <select
                    aria-label="Speech processing"
                    value={local ? 'local' : 'browser'}
                    disabled={listening}
                    onChange={(e) => setLocal(e.target.value === 'local')}
                  >
                    <option value="local">On this device</option>
                    <option value="browser">Browser speech service</option>
                  </select>
                </label>
              )}
              {!local && (
                <label className="speech-consent">
                  <input
                    type="checkbox"
                    checked={onlineConsent}
                    onChange={(e) => setOnlineConsent(e.target.checked)}
                    disabled={listening}
                  />
                  Allow my browser’s speech service for this input
                </label>
              )}
              <button
                type="button"
                className="button secondary"
                disabled={disabled || (!local && !onlineConsent)}
                onClick={() => (listening ? recognition.current?.stop() : start())}
              >
                {listening ? (
                  <>
                    <Square size={14} />
                    Stop listening
                  </>
                ) : (
                  <>
                    <Mic size={14} />
                    Start microphone
                  </>
                )}
              </button>
            </>
          )}
          <p role="status">{message}</p>
        </div>
      )}
    </div>
  );
}

/** On-device synthetic reading, distinct from attributed human recitation. */
export function SpeakExplanation({
  text,
  lang = 'en',
  label = 'Listen to explanation',
}: {
  text: string;
  lang?: string;
  label?: string;
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]),
    [selected, setSelected] = useState(''),
    [speaking, setSpeaking] = useState(false),
    [paused, setPaused] = useState(false),
    [rate, setRate] = useState('0.95'),
    [message, setMessage] = useState('');
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const update = () =>
      setVoices(
        synth
          .getVoices()
          .filter((v) => v.localService && v.lang.toLowerCase().startsWith(lang.toLowerCase())),
      );
    update();
    synth.addEventListener('voiceschanged', update);
    return () => {
      synth.removeEventListener('voiceschanged', update);
      if (utterance.current) synth.cancel();
    };
  }, [lang]);
  function speak() {
    if (!voices.length) {
      setMessage(
        `No matching device voice is available for ${lang}. Install a speech voice for this language in your device settings.`,
      );
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    utterance.current = u;
    u.voice = voices.find((v) => v.voiceURI === selected) ?? voices[0];
    u.lang = u.voice.lang;
    u.rate = Number(rate);
    u.onend = () => {
      setSpeaking(false);
      utterance.current = null;
    };
    u.onerror = () => {
      setSpeaking(false);
      setMessage('Playback stopped. Check the device voice settings.');
      utterance.current = null;
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
    setPaused(false);
    setMessage('');
  }
  return (
    <div className="explanation-audio">
      <button
        type="button"
        className="quiet-button"
        onClick={() => {
          if (speaking) {
            window.speechSynthesis.cancel();
            setSpeaking(false);
          } else speak();
        }}
      >
        {speaking ? <Square size={14} /> : <Volume2 size={15} />}{' '}
        {speaking ? 'Stop playback' : label}
      </button>
      {speaking && (
        <button
          className="quiet-button"
          onClick={() => {
            if (paused) window.speechSynthesis.resume();
            else window.speechSynthesis.pause();
            setPaused(!paused);
          }}
        >
          {paused ? 'Resume audio' : 'Pause audio'}
        </button>
      )}
      <select
        aria-label={`${label} speed`}
        value={rate}
        disabled={speaking}
        onChange={(e) => setRate(e.target.value)}
      >
        <option value="0.75">0.75×</option>
        <option value="0.95">1×</option>
        <option value="1.2">1.25×</option>
        <option value="1.5">1.5×</option>
      </select>
      {voices.length > 1 && (
        <select
          aria-label={`${label} voice`}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Device default</option>
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name}
            </option>
          ))}
        </select>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
