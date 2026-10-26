'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page-shell">
      <div className="page-heading">
        <h1>The reading room is unavailable.</h1>
        <p>We could not load the published collection. Please try again in a moment.</p>
      </div>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
