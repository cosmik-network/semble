// IMPORTANT: Import instrument.ts first to initialize Sentry as early as possible
import '../instrument';

import { EnvironmentConfigService } from '../shared/infrastructure/config/EnvironmentConfigService';
import { FeedWorkerProcess } from '../shared/infrastructure/processes/FeedWorkerProcess';

async function main() {
  const configService = new EnvironmentConfigService();
  const useInMemoryEvents = configService.shouldUseInMemoryEvents();

  if (useInMemoryEvents) {
    console.log(
      'Skipping feed worker startup - using in-memory events (handled by main process)',
    );
    return;
  }

  console.log('Starting dedicated feed worker process...');
  const feedWorkerProcess = new FeedWorkerProcess(configService);

  await feedWorkerProcess.start();
}

main().catch((error) => {
  console.error('Failed to start feed worker:', error);
  process.exit(1);
});
