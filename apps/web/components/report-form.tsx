'use client';
import { useState } from 'react';
export function ReportForm({ passageId, reference }: { passageId: string; reference: string }) {
  const [kind, setKind] = useState('error'),
    [message, setMessage] = useState(''),
    [pending, setPending] = useState(false),
    [id, setId] = useState(''),
    [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    try {
      const response = await fetch('/v1/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passage_id: passageId, kind, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? 'Could not submit report.');
      setId(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to submit.');
    } finally {
      setPending(false);
    }
  }
  return id ? (
    <div className="success" role="status">
      <strong>Your report was received.</strong>
      <p>
        Reference: {reference}. Report ID: {id}
      </p>
      <p>It is now available in the reviewer queue. No contact details were requested or stored.</p>
    </div>
  ) : (
    <form className="form-panel" onSubmit={submit}>
      <p className="notice">
        You are reporting {reference}. Please include the edition or source that supports your
        correction. Avoid personal information.
      </p>
      <div className="field">
        <label htmlFor="report-kind">What needs attention?</label>
        <select id="report-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="error">Text or reference error</option>
          <option value="license">Source or license concern</option>
          <option value="bias">Bias or presentation concern</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="report-message">Describe the issue</label>
        <textarea
          id="report-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          minLength={10}
          maxLength={3000}
          required
        />
      </div>
      <button type="submit" className="button primary" disabled={pending}>
        {pending ? 'Sending…' : 'Submit report'}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
