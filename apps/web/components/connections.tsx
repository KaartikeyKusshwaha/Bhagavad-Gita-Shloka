'use client';
import { useEffect, useState } from 'react';
import { parseExploreReply } from '@core/shared/src/device-data';
import type { Passage } from '@core/shared/src/index';
import type { Connections as Graph } from '@core/search/src/connections';
import { PassageCard } from './passage';

export function Connections({ passage }: { passage: Passage }) {
  const [open, setOpen] = useState(false),
    [center, setCenter] = useState(passage),
    [graph, setGraph] = useState<Graph | null>(null),
    [selected, setSelected] = useState(passage.id),
    [kind, setKind] = useState('all'),
    [view, setView] = useState('graph'),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setGraph(null);
    fetch(
      `/v1/passages/${encodeURIComponent(center.work)}/${encodeURIComponent(center.ref.replace(' ', '-'))}/connections`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error('Could not load connections. Close and reopen to try again.');
        return r.json();
      })
      .then((data: Graph) => {
        const nodes = parseExploreReply({
          hits: data.nodes.map((p) => ({ passage: p, score: 1, match_type: 'reference' })),
        }).hits!.map((h) => h.passage);
        setGraph({ nodes, edges: data.edges });
        setSelected(center.id);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Connections are unavailable.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, center]);
  const edges =
      graph?.edges.filter(
        (e) =>
          kind === 'all' || (kind === 'source' ? e.kind !== 'suggested' : e.kind === 'suggested'),
      ) ?? [],
    nodes =
      graph?.nodes.filter((n) => n.id === center.id || edges.some((e) => e.to === n.id)) ?? [],
    chosen = graph?.nodes.find((n) => n.id === selected),
    basis = edges.find((e) => e.to === selected);
  function point(index: number) {
    if (!index) return { x: 50, y: 50 };
    const angle = (2 * Math.PI * (index - 1)) / Math.max(1, nodes.length - 1) - Math.PI / 2;
    return { x: 50 + 35 * Math.cos(angle), y: 50 + 35 * Math.sin(angle) };
  }
  return (
    <details className="connection-section" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Explore related passages</summary>
      {open && (
        <div className="connection-content">
          <h2>Connections from {center.ref}</h2>
          <p>
            Solid lines show source order or an attributed cross-reference. Dashed lines are
            automatic wording suggestions; they do not establish shared meaning.
          </p>
          <div className="connection-controls">
            <label>
              Connections
              <select
                aria-label="Connection type"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value);
                  setSelected(center.id);
                }}
              >
                <option value="all">All connections</option>
                <option value="source">From sources</option>
                <option value="suggested">Suggested wording</option>
              </select>
            </label>
            <div role="group" aria-label="Connection view">
              <button
                className="quiet-button"
                aria-pressed={view === 'graph'}
                onClick={() => setView('graph')}
              >
                Graph
              </button>
              <button
                className="quiet-button"
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
              >
                List
              </button>
            </div>
          </div>
          {loading && <p role="status">Following the passages…</p>}
          {error && <p role="alert">{error}</p>}
          {graph && (
            <>
              {!graph.edges.some((e) => e.kind === 'cross_reference') && (
                <p className="connection-note">
                  No published scholarly cross-reference is loaded for this passage. Source links
                  here show adjacent passages in the edition.
                </p>
              )}
              {view === 'graph' ? (
                <div
                  className="passage-graph"
                  role="group"
                  aria-label={`Interactive passage graph from ${center.ref}`}
                >
                  <svg viewBox="0 0 100 100" aria-hidden="true">
                    {nodes.slice(1).map((node, i) => {
                      const pos = point(i + 1),
                        edge = edges.find((e) => e.to === node.id);
                      return (
                        <line
                          key={node.id}
                          x1="50"
                          y1="50"
                          x2={pos.x}
                          y2={pos.y}
                          className={edge?.kind === 'suggested' ? 'suggested-edge' : 'source-edge'}
                        />
                      );
                    })}
                  </svg>
                  {nodes.map((node, i) => {
                    const pos = point(i),
                      edge = edges.find((e) => e.to === node.id);
                    return (
                      <button
                        key={node.id}
                        className={`graph-node ${i === 0 ? 'center-node' : edge?.kind === 'suggested' ? 'suggested-node' : 'source-node'}`}
                        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                        onClick={() => setSelected(node.id)}
                        aria-pressed={selected === node.id}
                      >
                        <strong>{node.ref}</strong> <span>{node.tradition_name}</span>
                        <span className="sr-only">
                          {i === 0
                            ? ' Current passage'
                            : edge?.kind === 'suggested'
                              ? ' Suggested wording'
                              : ' From source'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <ul className="connection-list">
                  {edges.map((edge, i) => (
                    <li key={`${edge.to}-${i}`}>
                      <button
                        className="quiet-button"
                        onClick={() => setSelected(edge.to)}
                        aria-pressed={selected === edge.to}
                      >
                        {graph.nodes.find((n) => n.id === edge.to)?.ref} · {edge.label}
                      </button>
                      <span>{edge.basis.name}</span>
                    </li>
                  ))}
                </ul>
              )}
              {chosen && (
                <div className="connection-preview">
                  {basis && (
                    <p>
                      <strong>{basis.label}</strong> ·{' '}
                      <a href={basis.basis.url} target="_blank" rel="noreferrer">
                        {basis.basis.name} ↗
                      </a>
                    </p>
                  )}
                  <PassageCard passage={chosen} compact />
                  {chosen.id !== center.id && (
                    <button
                      className="button secondary"
                      onClick={() => {
                        setCenter(chosen);
                        setKind('all');
                      }}
                    >
                      Follow connections from {chosen.ref}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </details>
  );
}
