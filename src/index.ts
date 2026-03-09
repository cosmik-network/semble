// IMPORTANT: Import instrument.ts first to initialize Sentry as early as possible
import './instrument';

import { configService } from './shared/infrastructure/config';
import { AppProcess } from './shared/infrastructure/processes/AppProcess';
import { FeedWorkerProcess } from './shared/infrastructure/processes/FeedWorkerProcess';
import { InMemoryEventWorkerProcess } from './shared/infrastructure/processes/InMemoryEventWorkerProcess';

async function main() {
  const appProcess = new AppProcess(configService);

  // Start the app process
  await appProcess.start();

  // Only start event worker in same process when using in-memory events
  const useInMemoryEvents = configService.shouldUseInMemoryEvents();
  if (useInMemoryEvents) {
    console.log('Starting in-memory event worker in the same process...');
    const inMemoryWorkerProcess = new InMemoryEventWorkerProcess(configService);
    await inMemoryWorkerProcess.start();
  } else {
    console.log('Using external worker processes for event handling');
  }
}

main().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
