// IMPORTANT: Import instrument.ts first to initialize Sentry as early as possible
import '../instrument';

import { EnvironmentConfigService } from '../shared/infrastructure/config/EnvironmentConfigService';
import { MetadataWorkerProcess } from '../shared/infrastructure/processes/MetadataWorkerProcess';

async function main() {
  const configService = new EnvironmentConfigService();
  const useInMemoryEvents = configService.shouldUseInMemoryEvents();

  if (useInMemoryEvents) {
    console.log(
      'Skipping metadata worker startup - using in-memory events (handled by main process)',
    );
    return;
  }

  console.log('Starting dedicated metadata worker process...');
  const metadataWorkerProcess = new MetadataWorkerProcess(configService);

  await metadataWorkerProcess.start();
}

main().catch((error) => {
  console.error('Failed to start metadata worker:', error);
  process.exit(1);
});
