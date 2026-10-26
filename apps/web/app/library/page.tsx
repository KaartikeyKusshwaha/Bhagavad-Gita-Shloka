import { getDatabase } from '@core/db/src/index';
import { getWorks } from '@core/db/src/queries';
import { LibraryBrowser, type LibraryWork } from '../../components/library-browser';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'The library' };
export default async function Library() {
  const works = await getWorks(await getDatabase());
  return <LibraryBrowser works={works as unknown as LibraryWork[]} />;
}
