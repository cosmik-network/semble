import { IProcess } from '../../domain/IProcess';
import { EnvironmentConfigService } from '../config/EnvironmentConfigService';
import { QueueName } from '../events/QueueConfig';
import { IEventSubscriber } from '../../application/events/IEventSubscriber';
import {
  RepositoryFactory,
  Repositories,
} from '../http/factories/RepositoryFactory';
import { WorkerServices } from '../http/factories/ServiceFactory';

export abstract class BaseWorkerProcess implements IProcess {
  constructor(
    protected configService: EnvironmentConfigService,
    protected queueName: QueueName,
  ) {}

  async start(): Promise<void> {
    console.log(`Starting ${this.queueName} worker...`);

    const repositories = RepositoryFactory.create(this.configService);
    const services = await this.createServices(repositories);

    await this.validateDependencies(services);

    const eventSubscriber = services.createEventSubscriber(this.queueName);
    await this.registerHandlers(eventSubscriber, services, repositories);
    await eventSubscriber.start();

    console.log(`${this.queueName} worker started`);

    this.setupShutdownHandlers(eventSubscriber, services);
  }

  protected abstract createServices(
    repositories: Repositories,
  ): Promise<WorkerServices>;
  protected abstract validateDependencies(
    services: WorkerServices,
  ): Promise<void>;
  protected abstract registerHandlers(
    subscriber: IEventSubscriber,
    services: WorkerServices,
    repositories: Repositories,
  ): Promise<void>;

  private setupShutdownHandlers(
    subscriber: IEventSubscriber,
    services: WorkerServices,
  ): void {
    const shutdown = async () => {
      console.log(`Shutting down ${this.queueName} worker...`);
      await subscriber.stop();
      if (services.redisConnection) {
        await services.redisConnection.quit();
      }
      process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}
