import { createExpressApp } from './shared/infrastructure/http/app';
import { DatabaseFactory } from './shared/infrastructure/database/DatabaseFactory';
import { configService } from './shared/infrastructure/config';
import { startFeedWorker } from './workers/feed-worker';

async function startServer() {
  // Get configuration
  const config = configService.get();

  const useMockRepos = process.env.USE_MOCK_REPOS === 'true';
  if (!useMockRepos) {
    // Create database connection with config
    const db = DatabaseFactory.createConnection(
      configService.getDatabaseConfig(),
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
  const app = createExpressApp(configService);
  const PORT = config.server.port;
  const HOST = config.server.host;

  app.listen(PORT, HOST, () => {
    console.log(
      `Server running on http://${HOST}:${PORT} in ${config.environment} environment`,
    );
  });

  // Start feed worker in the same process if using in-memory events
  const useInMemoryEvents = process.env.USE_IN_MEMORY_EVENTS === 'true';
  if (useInMemoryEvents) {
    console.log('Starting feed worker in the same process...');
    await startFeedWorker();
  }
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
