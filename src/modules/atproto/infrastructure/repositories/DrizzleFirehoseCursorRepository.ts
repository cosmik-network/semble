import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { err, ok, Result } from 'src/shared/core/Result';
import { IFirehoseCursorRepository } from '../../application/services/IFirehoseCursorRepository';
import { firehoseCursors } from './schema/firehoseCursor.sql';

const CURSOR_ID = 'jetstream';

export class DrizzleFirehoseCursorRepository implements IFirehoseCursorRepository {
  constructor(private db: PostgresJsDatabase) {}

  async getCursor(): Promise<Result<number | null>> {
    try {
      const result = await this.db
        .select()
        .from(firehoseCursors)
        .where(eq(firehoseCursors.id, CURSOR_ID))
        .limit(1);

      const data = result[0];
      if (!data) {
        return ok(null);
      }

      return ok(data.timeUs);
    } catch (error: any) {
      return err(error);
    }
  }

  async saveCursor(timeUs: number): Promise<Result<void>> {
    try {
      await this.db
        .insert(firehoseCursors)
        .values({
          id: CURSOR_ID,
          timeUs,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: firehoseCursors.id,
          set: {
            timeUs,
            updatedAt: new Date(),
          },
        });

      return ok(undefined);
    } catch (error: any) {
      return err(error);
    }
  }
}
