'use client';
import { useAccount } from './account-provider';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  History,
  MessageSquare,
  MoreHorizontal,
  Pause,
  PenLine,
  Play,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  addActivity,
  localDay,
  saveExploreTurn,
  parseExploreReply,
  type ExploreConversation,
  type ExploreMode,
  type ExploreReply,
  type ExploreTurn,
} from '@core/shared/src/device-data';
import { routeSafety } from '@core/llm/src/guardrails';
import { useDeviceData, changeDeviceData } from '../lib/device-store';
import { PassageCard } from './passage';
import { SpeechInput, SpeakExplanation } from './speech';
import { readingThemes } from '@core/shared/src/themes';
interface WorkOption {
  slug: string;
  title: string;
  tradition_name: string;
}
const modeLabels = { search: 'Search', verify: 'Verify', ask: 'Ask' };
function turnPassages(reply: ExploreReply) {
  return (
    reply.hits?.map((h) => h.passage) ??
    reply.matches?.map((h) => h.passage) ??
    reply.passages?.map((h) => h.passage) ??
    []
  );
}
function historyGroup(date: string) {
  const now = new Date(),
    today = localDay(now),
    yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const key = localDay(new Date(date));
  return key === today
    ? 'Today'
    : key === localDay(yesterday)
      ? 'Yesterday'
      : now.getTime() - new Date(date).getTime() < 7 * 86400000
        ? 'Previous 7 days'
        : 'Earlier';
}
function Reply({ turn }: { turn: ExploreTurn }) {
  const passages = turnPassages(turn.reply);
  const unresolved = turn.reply.answer?.unresolved;
  const assessment = turn.reply.answer?.assessment;
  const verdictLabels = {
    supported: 'Supported by the retrieved evidence',
    contradicted: 'Contradicted by the retrieved evidence',
    mixed: 'Partly supported · qualifications matter',
    insufficient_evidence: 'Insufficient evidence',
  };
  if (turn.reply.safety)
    return (
      <div className="explore-safety" role="alert">
        <ShieldCheck size={20} />
        <p>{turn.reply.safety.message}</p>
      </div>
    );
  return (
    <div className="assistant-response">
      <div className="response-byline">
        <span className="response-symbol">
          <BookOpen size={14} />
        </span>
        <span>
          {turn.mode === 'verify'
            ? assessment
              ? verdictLabels[assessment.verdict]
              : unresolved
                ? 'Not established from these texts'
                : turn.reply.verdict === 'accurate'
                  ? 'Wording found'
                  : turn.reply.verdict === 'misattributed'
                    ? 'Attribution differs'
                    : 'No exact quotation confirmed'
            : turn.mode === 'ask'
              ? 'From the collection'
              : `${passages.length} passage${passages.length === 1 ? '' : 's'} found`}
        </span>
      </div>
      {passages.length > 0 && unresolved ? (
        <details className="more-evidence">
          <summary>Related passages · not verification of this claim</summary>
          {passages.map((p) => (
            <PassageCard key={p.id} passage={p} compact />
          ))}
        </details>
      ) : passages.length > 0 ? (
        <>
          <PassageCard passage={passages[0]} compact />
          {passages.length > 1 && (
            <details className="more-evidence">
              <summary>
                {passages.length - 1} more related passage{passages.length === 2 ? '' : 's'}{' '}
                <ChevronDown size={14} />
              </summary>
              <div className="evidence-list">
                {passages.slice(1).map((p) => (
                  <Link
                    key={p.id}
                    href={`/read/${encodeURIComponent(p.work)}/${encodeURIComponent(p.ref.replace(' ', '-'))}`}
                  >
                    <span>
                      {p.work_title} · {p.ref}
                    </span>
                    <p>{p.translations[0]?.text ?? p.original_text}</p>
                  </Link>
                ))}
              </div>
            </details>
          )}
        </>
      ) : !unresolved && !turn.reply.web_sources?.length ? (
        <p className="response-note">
          No matching passage was found in the currently loaded texts. Try a shorter phrase or a
          specific reference.
        </p>
      ) : null}
      {turn.reply.answer && (
        <div className="response-explanation">
          <span>
            {unresolved
              ? 'AI assessment · evidence limit'
              : assessment
                ? 'AI evidence assessment · check the sources'
                : 'AI study explanation · check the sources'}
          </span>
          {unresolved && <p>{unresolved.explanation}</p>}
          {turn.reply.answer.paragraphs.map((paragraph, i) => (
            <div key={i}>
              <p>{paragraph.text}</p>
              <div className="answer-citations">
                {paragraph.citations.map((id) => {
                  const p = passages.find((p) => p.id === id);
                  const web = turn.reply.web_sources?.find((s) => s.id === id);
                  if (web)
                    return (
                      <a
                        key={id}
                        href={web.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`${web.attribution} · Retrieved ${web.retrieved_at.slice(0, 10)}`}
                      >
                        {web.title} ↗
                      </a>
                    );
                  return p ? (
                    <Link
                      key={id}
                      href={`/read/${p.work}/${encodeURIComponent(p.ref.replace(' ', '-'))}`}
                    >
                      {p.ref} ↗
                    </Link>
                  ) : null;
                })}
              </div>
            </div>
          ))}
          <SpeakExplanation
            text={
              unresolved?.explanation ?? turn.reply.answer.paragraphs.map((p) => p.text).join('\n')
            }
          />
        </div>
      )}
      {(turn.reply.explanation || turn.reply.note) && (
        <div className="response-explanation">
          <span>{turn.mode === 'verify' ? 'About this text check' : 'About this answer'}</span>
          <p>{turn.reply.explanation ?? turn.reply.note}</p>
          {!turn.reply.answer && (
            <SpeakExplanation text={turn.reply.explanation ?? turn.reply.note ?? ''} />
          )}
        </div>
      )}
      {turn.reply.explanation && turn.reply.note && (
        <p className="response-note">{turn.reply.note}</p>
      )}
      {turn.reply.coverage_note && <p className="response-coverage">{turn.reply.coverage_note}</p>}
      {!!turn.reply.web_sources?.length && (
        <details className="more-evidence">
          <summary>Public sources · {turn.reply.web_sources.length}</summary>
          {turn.reply.web_sources.map((s) => (
            <p key={s.id}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title} ↗
              </a>
              <br />
              <small>
                {s.attribution} · Accessed {s.retrieved_at.slice(0, 10)}
              </small>
            </p>
          ))}
        </details>
      )}
    </div>
  );
}
export function Explore({
  works,
  semanticAvailable = false,
}: {
  works: WorkOption[];
  semanticAvailable?: boolean;
}) {
  const { user } = useAccount();
  const device = useDeviceData(),
    params = useSearchParams();
  const [mode, setMode] = useState<ExploreMode>('search'),
    [query, setQuery] = useState(''),
    [work, setWork] = useState(''),
    [matching, setMatching] = useState('all'),
    [language, setLanguage] = useState(''),
    [drawer, setDrawer] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [historySearch, setHistorySearch] = useState(''),
    [ready, setReady] = useState(false);
  const [ephemeral, setEphemeral] = useState<ExploreConversation | null>(null),
    [activeId, setActiveId] = useState<string | null>(params.get('chat'));
  const [pendingQuery, setPendingQuery] = useState(''),
    [renaming, setRenaming] = useState<string | null>(null),
    [newTitle, setNewTitle] = useState('');
  const composer = useRef<HTMLTextAreaElement>(null),
    bottom = useRef<HTMLDivElement>(null),
    historyTrigger = useRef<HTMLButtonElement>(null),
    drawerClose = useRef<HTMLButtonElement>(null),
    request = useRef<AbortController | null>(null),
    listRef = useRef<HTMLElement>(null);
  const active =
    ephemeral?.id === activeId
      ? ephemeral
      : (device.conversations.find((c) => c.id === activeId) ?? null);
  const conversations = device.conversations.filter(
    (c) =>
      !historySearch ||
      `${c.title} ${c.turns.map((t) => t.query).join(' ')}`
        .toLowerCase()
        .includes(historySearch.toLowerCase()),
  );
  useEffect(() => {
    const latest = active?.turns.at(-1);
    if (latest) {
      setMode(latest.mode);
      setWork(latest.work ?? '');
    }
  }, [active?.id]);
  useEffect(() => {
    if (drawer) {
      drawerClose.current?.focus();
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [drawer]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawer) {
        setDrawer(false);
        historyTrigger.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [drawer]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    setReady(true);
  }, []);
  function closeDrawer() {
    setDrawer(false);
    historyTrigger.current?.focus();
  }
  function newConversation() {
    request.current?.abort();
    setPending(false);
    setPendingQuery('');
    setActiveId(null);
    setEphemeral(null);
    setError('');
    setQuery('');
    setDrawer(false);
    window.history.replaceState(null, '', '/');
    composer.current?.focus();
  }
  function selectConversation(thread: ExploreConversation) {
    request.current?.abort();
    setPending(false);
    setPendingQuery('');
    setEphemeral(null);
    setActiveId(thread.id);
    setMode(thread.turns.at(-1)?.mode ?? 'search');
    setWork(thread.turns.at(-1)?.work ?? '');
    setQuery('');
    setError('');
    closeDrawer();
    window.history.replaceState(null, '', `/?chat=${encodeURIComponent(thread.id)}`);
  }
  function removeConversation(id: string) {
    try {
      changeDeviceData((state) => ({
        ...state,
        conversations: state.conversations.filter((c) => c.id !== id),
      }));
      if (id === activeId) newConversation();
    } catch {
      setError('Could not update device history. Browser storage may be unavailable.');
    }
  }
  function renameConversation(id: string) {
    try {
      const title = newTitle.trim().slice(0, 120);
      if (title) {
        changeDeviceData((state) => ({
          ...state,
          conversations: state.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
        }));
        setEphemeral((current) => (current?.id === id ? { ...current, title } : current));
      }
      setRenaming(null);
    } catch {
      setError('Could not rename this conversation.');
    }
  }
  function toggleHistory() {
    try {
      changeDeviceData((state) => ({ ...state, rememberHistory: !state.rememberHistory }));
    } catch {
      setError('Could not change history preferences.');
    }
  }
  function clearHistory() {
    try {
      changeDeviceData((state) => ({ ...state, conversations: [] }));
      newConversation();
    } catch {
      setError('Could not clear device history.');
    }
  }
  async function submit(event?: React.FormEvent, example?: string, theme?: string) {
    event?.preventDefault();
    const text = (example ?? query).trim();
    const requestMode = theme ? 'search' : mode;
    if (!text || pending) return;
    setError('');
    setPending(true);
    setPendingQuery(text);
    setQuery('');
    const controller = new AbortController();
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(requestMode === 'search' ? 45000 : 120000),
    ]);
    request.current = controller;
    const threadId = active?.id ?? crypto.randomUUID(),
      turnId = crypto.randomUUID();
    try {
      let reply: ExploreReply;
      const safety = routeSafety(text);
      if (safety.kind !== 'ordinary') reply = { safety };
      else {
        const response = theme
          ? await fetch(`/v1/themes/${theme}${work ? `?work=${encodeURIComponent(work)}` : ''}`, {
              signal,
            })
          : mode === 'search'
            ? await fetch(
                `/v1/search?${new URLSearchParams({ q: text, limit: '5', mode: matching, ...(language ? { lang: language } : {}), ...(work ? { work } : {}) })}`,
                { signal },
              )
            : await fetch(mode === 'verify' ? '/v1/verify' : '/v1/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                  mode === 'verify'
                    ? { claim: text, claimed_source: work || undefined, lang: 'en' }
                    : {
                        question: text,
                        work: work || undefined,
                        lang: 'en',
                        history: [
                          ...(device.useSavedContext && device.rememberHistory
                            ? device.conversations
                                .filter((c) => c.id !== activeId)
                                .flatMap((c) => c.turns)
                                .filter(
                                  (t) =>
                                    !t.reply.safety &&
                                    (!work || t.work === work) &&
                                    t.query
                                      .toLowerCase()
                                      .split(/\W+/)
                                      .some(
                                        (word) =>
                                          word.length > 3 && text.toLowerCase().includes(word),
                                      ),
                                )
                                .slice(0, 2)
                            : []),
                          ...(active?.turns ?? []).slice(-3),
                        ]
                          .filter((t) => !t.reply.safety)
                          .slice(-5)
                          .map((t) => ({
                            question: t.query.slice(0, 1500),
                            answer: t.reply.answer?.paragraphs
                              .map((p) => p.text)
                              .join(' ')
                              .slice(0, 4500),
                            passage_ids: turnPassages(t.reply)
                              .slice(0, 8)
                              .map((p) => p.id),
                          })),
                      },
                ),
                signal,
              });
        if (response.status === 401) {
          window.location.assign('/account/required');
          return;
        }
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error?.message ?? 'The collection could not be reached. Please try again.',
          );
        reply = parseExploreReply(data);
      }
      if (controller.signal.aborted) return;
      const at = new Date().toISOString(),
        turn: ExploreTurn = {
          id: turnId,
          query: text,
          mode: requestMode,
          work: work || undefined,
          at,
          reply,
        };
      const next: ExploreConversation = active
        ? { ...active, updatedAt: at, turns: [...active.turns, turn].slice(-40) }
        : { id: threadId, title: text.slice(0, 80), createdAt: at, updatedAt: at, turns: [turn] };
      setEphemeral(next);
      setActiveId(threadId);
      try {
        changeDeviceData((state) => {
          const saved = saveExploreTurn(state, threadId, turn);
          return reply.safety ? saved : addActivity(saved, requestMode, turnId);
        });
      } catch {
        setError(
          'This response is available, but browser storage is unavailable. It will not be saved.',
        );
      }
      if (!reply.safety && device.rememberHistory)
        window.history.replaceState(null, '', `/?chat=${encodeURIComponent(threadId)}`);
      bottom.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'end',
      });
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(
          signal.aborted
            ? 'This request took too long. Try a shorter quotation or a specific passage reference.'
            : err instanceof Error
              ? err.message
              : 'Unable to connect. Please try again.',
        );
        setQuery(text);
      }
    } finally {
      if (request.current === controller) {
        setPending(false);
        setPendingQuery('');
      }
    }
  }
  function trapDrawer(event: React.KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const candidates = listRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]),a[href],input:not([disabled]),summary,[tabindex="0"]',
    );
    const nodes = Array.from(candidates ?? []).filter((node) => node.checkVisibility());
    if (!nodes.length) return;
    const first = nodes[0],
      last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  return (
    <div className={`explore-page ${active ? 'has-conversation' : ''}`} data-ready={ready}>
      <div className="explore-topbar">
        <button
          className="quiet-button"
          ref={historyTrigger}
          onClick={() => setDrawer(true)}
          aria-label="Open Explore history"
          aria-expanded={drawer}
        >
          <History size={18} />
          <span>History</span>
        </button>
        <span className="device-note">
          {device.rememberHistory
            ? user
              ? 'History saved to your account'
              : 'History stays on this device'
            : 'History paused'}
        </span>
        <button className="quiet-button" onClick={newConversation}>
          <PenLine size={17} />
          <span>New</span>
        </button>
      </div>
      {!active && !pending && (
        <div className="explore-welcome">
          <span className="welcome-mark">
            <BookOpen size={30} strokeWidth={1.3} />
          </span>
          <span className="eyebrow">A SHARED READING ROOM</span>
          <h1>
            A little curiosity.
            <br />
            <em>A clear source.</em>
          </h1>
          <p>
            Find a passage, check a quotation, or follow a question.
            <br />
            Start with the words. Keep their context.
          </p>
        </div>
      )}
      {(active || pending) && (
        <div className="conversation" aria-label="Explore conversation">
          <h1 className="sr-only">{active?.title ?? 'Looking up your question'}</h1>
          {active?.turns.map((turn) => (
            <div className="conversation-turn" key={turn.id}>
              <div className="user-message">
                <span>{modeLabels[turn.mode]}</span>
                <p>{turn.query}</p>
              </div>
              <Reply turn={turn} />
            </div>
          ))}
          {pending && (
            <div className="conversation-turn">
              <div className="user-message">
                <p>{pendingQuery}</p>
              </div>
              <p className="response-pending" role="status">
                {mode === 'search'
                  ? 'Searching the stored texts'
                  : 'Finding source evidence and preparing an assessment'}
                <span>…</span>
              </p>
              <button
                className="quiet-button"
                onClick={() => {
                  request.current?.abort();
                  setPending(false);
                  setPendingQuery('');
                  setQuery(pendingQuery);
                }}
              >
                Stop request
              </button>
            </div>
          )}
          <div ref={bottom} />
        </div>
      )}
      <div className="composer-area">
        {mode === 'ask' && (
          <label className="saved-context-toggle">
            <input
              type="checkbox"
              checked={Boolean(device.useSavedContext && device.rememberHistory)}
              disabled={!device.rememberHistory}
              onChange={(e) => {
                try {
                  changeDeviceData((s) => ({ ...s, useSavedContext: e.target.checked }));
                } catch {
                  setError('Could not save context preference.');
                }
              }}
            />
            Use relevant saved conversations{' '}
            <span>Up to 2 earlier turns are sent with this question. Private notes stay here.</span>
          </label>
        )}
        <form className="explore-composer" onSubmit={submit}>
          <label htmlFor="explore-input" className="sr-only">
            {mode === 'search'
              ? 'Search the texts'
              : mode === 'verify'
                ? 'Quotation to verify'
                : 'Ask the collection'}
          </label>
          <textarea
            id="explore-input"
            ref={composer}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder={
              mode === 'search'
                ? 'A phrase, a reference, a place to begin…'
                : mode === 'verify'
                  ? 'Paste the quotation you would like to check…'
                  : 'What would you like to understand?'
            }
            rows={2}
            maxLength={mode === 'search' ? 500 : 3000}
            required
            disabled={pending}
          />
          <div className="composer-controls">
            <div className="mode-control" role="group" aria-label="Explore mode">
              {(['search', 'verify', 'ask'] as const).map((value, i) => {
                const Icon = [Search, Check, MessageSquare][i];
                return (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={mode === value}
                    onClick={() => {
                      setMode(value);
                      composer.current?.focus();
                    }}
                    disabled={pending}
                  >
                    <Icon size={14} />
                    {modeLabels[value]}
                  </button>
                );
              })}
            </div>
            <label className="work-control">
              <span className="sr-only">Search collection</span>
              <select
                aria-label="Search collection"
                value={work}
                onChange={(e) => setWork(e.target.value)}
                disabled={pending}
              >
                <option value="">All available texts</option>
                {works.map((w) => (
                  <option key={w.slug} value={w.slug}>
                    {w.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="send-button"
              aria-label={pending ? 'Searching collection' : 'Send to Explore'}
              disabled={pending || !query.trim()}
              type="submit"
            >
              <ArrowUp size={20} />
            </button>
          </div>
        </form>
        {mode === 'search' && (
          <details className="explore-search-options">
            <summary>Search options</summary>
            <div>
              <label>
                Matching
                <select
                  aria-label="Search matching"
                  value={matching}
                  disabled={pending}
                  onChange={(e) => setMatching(e.target.value)}
                >
                  <option value="all">Words + available meaning search</option>
                  <option value="exact">Exact wording</option>
                  <option value="fuzzy">Similar wording</option>
                  {semanticAvailable && (
                    <option value="semantic">Meaning search · experimental</option>
                  )}
                </select>
              </label>
              <label>
                Translation language
                <select
                  aria-label="Translation search language"
                  value={language}
                  disabled={pending}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="">All available</option>
                  <option value="en">English</option>
                </select>
              </label>
              <p>
                Meaning results suggest relevance. They do not confirm a quotation. Edition coverage
                varies.
              </p>
            </div>
          </details>
        )}
        <SpeechInput
          disabled={pending}
          onTranscript={(text) => {
            setQuery(text.slice(0, mode === 'search' ? 500 : 3000));
            composer.current?.focus();
          }}
        />
        {!active && (
          <details className="explore-themes">
            <summary>Explore a theme across texts</summary>
            <div>
              {readingThemes.map((theme) => (
                <button
                  className="quiet-button"
                  key={theme.slug}
                  disabled={pending}
                  onClick={() => {
                    setMode('search');
                    void submit(undefined, `Theme: ${theme.name}`, theme.slug);
                  }}
                >
                  {theme.name}
                </button>
              ))}
            </div>
          </details>
        )}
        <p className="composer-caption">
          {mode === 'ask'
            ? 'Ask sends your question and selected context to the configured AI provider. Answers cite source passages.'
            : mode === 'verify'
              ? 'Verify assesses claims using AI and the loaded texts. Historical claims also use Wikipedia and accessible cited reports. Your public-topic search terms go to Wikipedia; your claim and evidence go to the AI provider. A wording match alone does not prove a claim.'
              : 'Search the published collection. Source and language availability vary.'}{' '}
          <Link href={mode === 'ask' ? '/privacy' : '/library'}>
            {mode === 'ask' ? 'Privacy' : 'Browse texts'}
          </Link>
        </p>
        {!active && (
          <div className="explore-suggestions">
            {['BG 2.47', 'karmanye vadhikaraste', 'action only'].map((text) => (
              <button
                key={text}
                onClick={() => {
                  setMode('search');
                  setQuery(text);
                  composer.current?.focus();
                }}
              >
                <span>{text}</span>
                <ArrowUp size={13} />
              </button>
            ))}
          </div>
        )}
        {error && (
          <p className="explore-error" role="alert">
            {error}
            <button
              className="quiet-button"
              disabled={pending || !query.trim()}
              onClick={() => void submit()}
            >
              Retry request
            </button>
          </p>
        )}
      </div>
      {drawer && (
        <div className="history-overlay">
          <div className="history-backdrop" onClick={closeDrawer} />
          <aside
            className="history-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-title"
            ref={listRef}
            onKeyDown={trapDrawer}
          >
            <div className="drawer-heading">
              <div>
                <span className="eyebrow">YOUR EXPLORATIONS</span>
                <h2 id="history-title">Pick up a thought.</h2>
              </div>
              <button
                className="icon-button"
                ref={drawerClose}
                onClick={closeDrawer}
                aria-label="Close history"
              >
                <X size={20} />
              </button>
            </div>
            <button className="new-thread-button" onClick={newConversation}>
              <PenLine size={17} /> New exploration
            </button>
            <label className="history-filter">
              <Search size={15} />
              <input
                aria-label="Search your history"
                placeholder="Find an exploration…"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
            </label>
            <div className="history-list">
              {conversations.length ? (
                conversations.map((thread, index) => {
                  const group = historyGroup(thread.updatedAt),
                    previous = index ? historyGroup(conversations[index - 1].updatedAt) : null;
                  return (
                    <div key={thread.id}>
                      {group !== previous && <h3>{group}</h3>}
                      <div className={`history-row ${thread.id === activeId ? 'selected' : ''}`}>
                        {renaming === thread.id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              renameConversation(thread.id);
                            }}
                          >
                            <input
                              aria-label="Conversation name"
                              value={newTitle}
                              onChange={(e) => setNewTitle(e.target.value)}
                              maxLength={120}
                              autoFocus
                            />
                            <button type="submit" aria-label="Save conversation name">
                              <Check size={15} />
                            </button>
                          </form>
                        ) : (
                          <>
                            <button
                              className="history-open"
                              onClick={() => selectConversation(thread)}
                            >
                              <span>{thread.title}</span>
                              <small>
                                {thread.turns.length} exchange{thread.turns.length === 1 ? '' : 's'}
                              </small>
                            </button>
                            <details className="thread-menu">
                              <summary aria-label={`Options for ${thread.title}`}>
                                <MoreHorizontal size={17} />
                              </summary>
                              <div>
                                <button
                                  onClick={() => {
                                    setRenaming(thread.id);
                                    setNewTitle(thread.title);
                                  }}
                                >
                                  <PenLine size={13} /> Rename
                                </button>
                                <button onClick={() => removeConversation(thread.id)}>
                                  <Trash2 size={13} /> Delete
                                </button>
                              </div>
                            </details>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="history-empty">
                  <History size={25} />
                  <p>
                    {historySearch
                      ? 'No matching explorations.'
                      : 'Your saved searches and questions will appear here.'}
                  </p>
                </div>
              )}
            </div>
            <div className="history-footer">
              <button onClick={toggleHistory}>
                {device.rememberHistory ? <Pause size={15} /> : <Play size={15} />}{' '}
                {device.rememberHistory ? 'Pause saving history' : 'Resume saving history'}
              </button>
              <details>
                <summary>Manage device history</summary>
                <p>
                  Up to 90 days, subject to a device storage limit. Paused conversations are
                  temporary. Deleting history leaves your Study activity and bookmarks in place.
                </p>
                <button className="delete-history" onClick={clearHistory}>
                  <Trash2 size={14} /> Clear all Explore history
                </button>
              </details>
              <small>
                {user ? 'Private to your account.' : 'Private to this browser. Sign in to sync.'}
              </small>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
