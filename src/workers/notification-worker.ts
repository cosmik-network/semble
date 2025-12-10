import { EnvironmentConfigService } from '../shared/infrastructure/config/EnvironmentConfigService';
import { NotificationWorkerProcess } from '../shared/infrastructure/processes/NotificationWorkerProcess';

async function main() {
  const configService = new EnvironmentConfigService();
  const useInMemoryEvents = configService.shouldUseInMemoryEvents();

  if (useInMemoryEvents) {
    console.log(
      'Skipping notification worker startup - using in-memory events (handled by main process)',
    );
    return;
  }

  console.log('Starting dedicated notification worker process...');
  const notificationWorkerProcess = new NotificationWorkerProcess(configService);

  await notificationWorkerProcess.start();
}

main().catch((error) => {
  console.error('Failed to start notification worker:', error);
  process.exit(1);
});
