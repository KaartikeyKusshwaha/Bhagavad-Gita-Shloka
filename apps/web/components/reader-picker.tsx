'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
interface Division {
  number: number;
  verse_count: number;
  title: string;
  verses?: { number: number; ref: string }[];
}
export function ReaderPicker({
  divisions,
  chapter = 2,
  verse = 47,
  work = 'bhagavad-gita',
}: {
  divisions: Division[];
  chapter?: number;
  verse?: number;
  work?: string;
}) {
  const router = useRouter(),
    [selected, setSelected] = useState(chapter),
    [selectedVerse, setVerse] = useState(verse ? String(verse) : 'all');
  const division = divisions.find((d) => d.number === selected),
    count = division?.verse_count ?? 0,
    verses =
      division?.verses ??
      Array.from({ length: count }, (_, i) => ({ number: i + 1, ref: `BG ${selected}.${i + 1}` }));
  return (
    <form
      className="reader-picker"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(
          selectedVerse === 'all'
            ? `/read/${work}/chapter/${selected}`
            : `/read/${work}/${encodeURIComponent(verses.find((v) => String(v.number) === selectedVerse)!.ref.replace(' ', '-'))}`,
        );
      }}
    >
      <label htmlFor="chapter-picker">
        Chapter
        <select
          id="chapter-picker"
          aria-label="Chapter"
          value={selected}
          onChange={(e) => {
            setSelected(Number(e.target.value));
            setVerse('all');
          }}
        >
          {divisions.map((d) => (
            <option key={d.number} value={d.number}>
              {String(d.number).padStart(2, '0')} · {d.title}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="verse-picker">
        Verse
        <select
          id="verse-picker"
          aria-label="Verse"
          value={selectedVerse}
          onChange={(e) => setVerse(e.target.value)}
        >
          <option value="all">All {count} verses</option>
          {verses.map((v) => (
            <option key={v.number} value={v.number}>
              {v.number}
            </option>
          ))}
        </select>
      </label>
      <button className="button primary" type="submit">
        Open passage <ArrowRight size={16} />
      </button>
    </form>
  );
}
