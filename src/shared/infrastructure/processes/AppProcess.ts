import { IProcess } from '../../domain/IProcess';
import { createExpressApp } from '../http/app';
import { DatabaseFactory } from '../database/DatabaseFactory';
import { EnvironmentConfigService } from '../config/EnvironmentConfigService';

export class AppProcess implements IProcess {
  constructor(private configService: EnvironmentConfigService) {}

  async start(): Promise<void> {
    // Get configuration
    const config = this.configService.get();

    const useMockPersistence = this.configService.shouldUseMockPersistence();
    if (!useMockPersistence) {
      // Create database connection with config
      const db = DatabaseFactory.createConnection(
        this.configService.getDatabaseConfig(),
      );

      // Run migrations
      try {
        await DatabaseFactory.runMigrations(db);
        console.log('Database migrations completed successfully');
      } catch (error) {
        console.error('Error running database migrations:', error);
        process.exit(1);
      }
    }

    // Create and start Express app with config
    const app = await createExpressApp(this.configService);
    const PORT = config.server.port;
    const HOST = config.server.host;

    app.listen(PORT, HOST, () => {
      console.log(
        `Server running on http://${HOST}:${PORT} in ${config.environment} environment`,
      );
    });
  }
}
