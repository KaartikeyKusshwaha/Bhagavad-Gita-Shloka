import Link from 'next/link';
export const metadata = { title: 'About Open Scripture' };
export default function About() {
  return (
    <div className="page-shell">
      <div className="page-heading">
        <span className="eyebrow">WHY THIS EXISTS</span>
        <h1>
          More understanding.
          <br />
          <em>Keep the source close.</em>
        </h1>
        <p>
          A free college project for reading scripture, following questions and building a reading
          habit.
        </p>
      </div>
      <div className="prose">
        <h2>A quiet place to explore</h2>
        <p>
          Explore brings search, quotation checks and cited questions into one conversation. Read
          keeps the passage, human translation and surrounding context together. Study holds your
          bookmarks, reading plan, practice and activity calendar.
        </p>
        <h2>Know which edition you are reading</h2>
        <p>
          The collection includes 700 Bhagavad Gita passages in Sanskrit and Roman transliteration,
          with English editions by Annie Besant and Swami Swarupananda; 6,236 Quran verses in Tanzil
          Arabic; and 423 Dhammapada verses in Pali and Bhikkhu Sujato’s English. Some Swarupananda
          translations span a labelled range of verses.
        </p>
        <p>
          Further traditions have clearly labelled external reading links. Those sites are separate
          from this searchable collection. Every imported edition carries its source and reuse
          terms. <Link href="/library">Browse the collection</Link> or{' '}
          <Link href="/sources">inspect the sources</Link>.
        </p>
        <h2>Read with context</h2>
        <p>
          Original text, human translation and AI explanation are labelled separately. Meaning
          search and related wording suggest places to read; they do not prove a quotation or an
          equivalent doctrine. Source-order connections are distinct from automatic suggestions. No
          scholarly cross-reference collection is loaded.
        </p>
        <p>
          AI explanations need the cited source and your judgment. Experimental speech practice
          compares recognized words; it does not assess pronunciation or chanting. Browser voice
          availability varies. Human audio currently covers one complete Al-Fatiha recording.
        </p>
        <h2>Your reading belongs to you</h2>
        <p>
          No account, advertising or tracking scripts are required. Saved conversations, progress
          and practice stay in this browser. You can pause or clear them. Ask sends selected
          question context to its configured AI provider; see <Link href="/privacy">Privacy</Link>{' '}
          before sharing sensitive information.
        </p>
        <p>
          This is a college-project beta. Automated checks cover its technical behavior; they do not
          establish scholarly accuracy. Use the passage’s report link for a text or attribution
          issue.
        </p>
        <p>
          <a href="https://github.com/KaartikeyKusshwaha/Bhagavad-Gita-Shloka">
            View the open-source project
          </a>
          .
        </p>
      </div>
    </div>
  );
}
