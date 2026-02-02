import { EnvironmentConfigService } from '../shared/infrastructure/config/EnvironmentConfigService';
import { SyncWorkerProcess } from '../shared/infrastructure/processes/SyncWorkerProcess';

async function main() {
  const configService = new EnvironmentConfigService();
  const useInMemoryEvents = configService.shouldUseInMemoryEvents();

  if (useInMemoryEvents) {
    console.log('[SYNC] Skipping sync worker - using in-memory events');
    return;
  }

  console.log('[SYNC] Starting sync worker...');

  const syncWorkerProcess = new SyncWorkerProcess(configService);
  await syncWorkerProcess.start();
}

main().catch((error) => {
  console.error('[SYNC] Failed to start sync worker:', error);
  process.exit(1);
});
