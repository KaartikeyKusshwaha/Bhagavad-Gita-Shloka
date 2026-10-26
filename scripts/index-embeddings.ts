import { connectDatabase } from '../packages/db/src/index.ts';
import { migrate } from '../packages/db/src/migrate.ts';
import { indexEmbeddings } from '../packages/search/src/semantic.ts';
const db = await connectDatabase();
try {
  await migrate(db);
  console.log(
    await indexEmbeddings(db, (done, total) => {
      if (done % 80 === 0 || done === total)
        console.log(`Embedded ${done}/${total} eligible passages`);
    }),
  );
} finally {
  await db.close();
}
