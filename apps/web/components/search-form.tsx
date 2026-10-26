import { Search, ArrowUpRight } from 'lucide-react';
export function SearchForm({
  initial = '',
  compact = false,
}: {
  initial?: string;
  compact?: boolean;
}) {
  return (
    <form action="/search" className={`search-form ${compact ? 'compact' : ''}`} role="search">
      <Search size={21} aria-hidden="true" />
      <label className="sr-only" htmlFor="search-q">
        Search the published collection
      </label>
      <input
        id="search-q"
        name="q"
        defaultValue={initial}
        placeholder="A verse, a phrase, or a reference…"
        minLength={2}
        maxLength={500}
        required
      />
      <button aria-label="Search the collection" type="submit">
        <ArrowUpRight size={23} />
      </button>
    </form>
  );
}
