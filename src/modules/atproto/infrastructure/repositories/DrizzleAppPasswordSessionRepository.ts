import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { AtpSessionData } from '@atproto/api';
import { Result, err, ok } from 'src/shared/core/Result';
import {
  IAppPasswordSessionRepository,
  SessionWithAppPassword,
} from './IAppPasswordSessionRepository';
import { appPasswordSessions } from './schema/appPasswordSession.sql';

export class DrizzleAppPasswordSessionRepository implements IAppPasswordSessionRepository {
  constructor(private db: PostgresJsDatabase) {}

  async saveSession(
    did: string,
    session: SessionWithAppPassword,
  ): Promise<Result<void>> {
    try {
      await this.db
        .insert(appPasswordSessions)
        .values({
          did,
          sessionData: session.session,
          appPassword: session.appPassword,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: appPasswordSessions.did,
          set: {
            sessionData: session.session,
            appPassword: session.appPassword,
            updatedAt: new Date(),
          },
        });

      return ok(undefined);
    } catch (error: any) {
      return err(error);
    }
  }

  async getSession(
    did: string,
  ): Promise<Result<SessionWithAppPassword | null>> {
    try {
      const result = await this.db
        .select()
        .from(appPasswordSessions)
        .where(eq(appPasswordSessions.did, did))
        .limit(1);

      if (result.length === 0) {
        return ok(null);
      }

      const row = result[0]!;
      return ok({
        session: row.sessionData as AtpSessionData,
        appPassword: row.appPassword,
      });
    } catch (error: any) {
      return err(error);
    }
  }
}
