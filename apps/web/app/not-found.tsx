import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="page-shell">
      <div className="page-heading">
        <span className="eyebrow">NO PASSAGE AT THIS ADDRESS</span>
        <h1>Let’s find the right page.</h1>
        <p>
          This citation is not in the approved collection. Check the chapter and verse, or start
          again in the reader.
        </p>
      </div>
      <Link className="button primary" href="/read/bhagavad-gita">
        Open the reader →
      </Link>
    </div>
  );
}
