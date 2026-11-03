import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { databaseConfig, configService } from '../config';

const STATS_STATEMENT_TIMEOUT_MS = 15_000;

export class DatabaseFactory {
  private static instance: PostgresJsDatabase | null = null;
  private static statsInstance: PostgresJsDatabase | null = null;

  public static createConnection(
    dbConfig = databaseConfig,
  ): PostgresJsDatabase {
    if (!this.instance) {
      const connectionString = dbConfig.url;

      const queryClient = postgres(connectionString, {
        ssl: configService.get().environment === 'local' ? false : 'require',
      });
      this.instance = drizzle(queryClient);
    }

    return this.instance;
  }

  /**
   * Separate pool for /api/stats queries: capped so dashboards can never take
   * connections from app traffic, and (when connecting directly via statsUrl)
   * a server-side statement timeout so one runaway aggregate can't hold the
   * database. Connections open lazily, so processes that never query stats
   * (workers) pay nothing for it.
   */
  public static createStatsConnection(
    dbConfig = databaseConfig,
  ): PostgresJsDatabase {
    if (!this.statsInstance) {
      const queryClient = postgres(dbConfig.statsUrl ?? dbConfig.url, {
        ssl: configService.get().environment === 'local' ? false : 'require',
        max: 3,
        idle_timeout: 60,
        // Sent as a startup parameter, which PgBouncer rejects — so only when
        // statsUrl points straight at Postgres.
        ...(dbConfig.statsUrl && {
          connection: { statement_timeout: STATS_STATEMENT_TIMEOUT_MS },
        }),
      });
      this.statsInstance = drizzle(queryClient);
    }

    return this.statsInstance;
  }

  public static async runMigrations(db: PostgresJsDatabase): Promise<void> {
    await migrate(db, {
      migrationsFolder: './src/shared/infrastructure/database/migrations',
    });
  }
}
