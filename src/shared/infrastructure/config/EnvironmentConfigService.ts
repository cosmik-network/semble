export enum Environment {
  LOCAL = 'local',
  DEV = 'dev',
  PROD = 'prod',
}

export interface EnvironmentConfig {
  environment: Environment;
  runtime: {
    useMockPersistence: boolean;
    useMockAuth: boolean;
    useFakePublishers: boolean;
    useMockVectorDb: boolean;
  };
  database: {
    url: string;
  };
  auth: {
    jwtSecret: string;
    accessTokenExpiresIn: number;
    refreshTokenExpiresIn: number;
  };
  atproto: {
    firehoseWebsocket: string;
    jetstreamWebsocket: string;
    serviceEndpoint: string;
    baseUrl: string;
    baseCollection: string;
    collections: {
      card: string;
      collection: string;
      collectionLink: string;
    };
    serviceAccount: {
      identifier: string;
      appPassword: string;
    };
  };
  server: {
    port: number;
    host: string;
  };
  app: {
    appUrl: string;
  };
  iframely: {
    apiKey: string;
  };
  upstash: {
    vectorUrl: string;
    vectorToken: string;
  };
  workers: {
    redisUrl: string;
    redisConfig: {
      host: string;
      port: number;
      password?: string;
      maxRetriesPerRequest: number | null; // Disable automatic retries
    };
  };
}

export class EnvironmentConfigService {
  private config: EnvironmentConfig;

  constructor() {
    const environment = (process.env.NODE_ENV ||
      Environment.LOCAL) as Environment;

    this.config = {
      environment,
      runtime: {
        useMockPersistence: this.determineMockPersistenceFlag(),
        useMockAuth: process.env.USE_MOCK_AUTH === 'true',
        useFakePublishers: process.env.USE_FAKE_PUBLISHERS === 'true',
        useMockVectorDb: process.env.USE_MOCK_VECTOR_DB === 'true',
      },
      database: {
        url:
          process.env.DATABASE_URL ||
          'postgres://postgres:postgres@localhost:5432/annotations',
      },
      auth: {
        jwtSecret:
          process.env.JWT_SECRET || 'default-secret-change-in-production',
        accessTokenExpiresIn: parseInt(
          process.env.ACCESS_TOKEN_EXPIRES_IN || '3600',
        ),
        refreshTokenExpiresIn: parseInt(
          process.env.REFRESH_TOKEN_EXPIRES_IN || '2592000',
        ),
      },
      atproto: {
        firehoseWebsocket:
          process.env.ATPROTO_FIREHOSE_WEBSOCKET ||
          'wss://relay1.us-west.bsky.network',
        jetstreamWebsocket:
          process.env.ATPROTO_JETSTREAM_WEBSOCKET ||
          'wss://jetstream2.us-west.bsky.network',
        serviceEndpoint:
          process.env.ATPROTO_SERVICE_ENDPOINT || 'https://bsky.social',
        baseUrl: process.env.BASE_URL || 'http://127.0.0.1:3000',
        baseCollection:
          environment === Environment.PROD
            ? 'network.cosmik'
            : `network.cosmik.${environment}`,
        collections: {
          card:
            environment === Environment.PROD
              ? 'network.cosmik.card'
              : `network.cosmik.${environment}.card`,
          collection:
            environment === Environment.PROD
              ? 'network.cosmik.collection'
              : `network.cosmik.${environment}.collection`,
          collectionLink:
            environment === Environment.PROD
              ? 'network.cosmik.collectionLink'
              : `network.cosmik.${environment}.collectionLink`,
        },
        serviceAccount: {
          identifier: process.env.BSKY_SERVICE_ACCOUNT_IDENTIFIER || '',
          appPassword: process.env.BSKY_SERVICE_ACCOUNT_APP_PASSWORD || '',
        },
      },
      server: {
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || '127.0.0.1',
      },
      app: {
        appUrl: process.env.APP_URL || 'http://127.0.0.1:4000',
      },
      iframely: {
        apiKey: process.env.IFRAMELY_API_KEY || '',
      },
      upstash: {
        vectorUrl: process.env.UPSTASH_VECTOR_REST_URL || '',
        vectorToken: process.env.UPSTASH_VECTOR_REST_TOKEN || '',
      },
      workers: {
        redisConfig: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: null, // Disable automatic retries
        },
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      },
    };

    this.applyEnvironmentSpecificConfig();
  }

  private applyEnvironmentSpecificConfig(): void {
    switch (this.config.environment) {
      case Environment.DEV:
        // Override defaults with dev-specific values
        break;
      case Environment.PROD:
        // Override defaults with production-specific values
        if (
          this.config.auth.jwtSecret === 'default-secret-change-in-production'
        ) {
          throw new Error('JWT secret must be set in production environment');
        }
        break;
      case Environment.LOCAL:
      default:
        // Local development defaults are already set
        break;
    }
  }

  public get(): EnvironmentConfig {
    return this.config;
  }

  public getDatabaseConfig() {
    return this.config.database;
  }

  public getAuthConfig() {
    return this.config.auth;
  }

  public getAtProtoConfig() {
    return this.config.atproto;
  }

  public getAtProtoCollections() {
    return this.config.atproto.collections;
  }

  public getAtProtoBaseCollection() {
    return this.config.atproto.baseCollection;
  }

  public getAtProtoServiceAccount() {
    return this.config.atproto.serviceAccount;
  }

  public getServerConfig() {
    return this.config.server;
  }
  public getAppConfig() {
    return this.config.app;
  }

  public getIFramelyApiKey(): string {
    return this.config.iframely.apiKey;
  }

  public getUpstashConfig() {
    return this.config.upstash;
  }

  public getWorkersConfig() {
    return this.config.workers;
  }

  public getRedisConfig() {
    return this.config.workers.redisConfig;
  }

  public getRuntimeConfig() {
    return this.config.runtime;
  }

  public shouldUseMockPersistence(): boolean {
    return this.config.runtime.useMockPersistence;
  }

  public shouldUseMockRepos(): boolean {
    return this.config.runtime.useMockPersistence;
  }

  public shouldUseInMemoryEvents(): boolean {
    return this.config.runtime.useMockPersistence;
  }

  public shouldUseMockAuth(): boolean {
    return this.config.runtime.useMockAuth;
  }

  public shouldUseFakePublishers(): boolean {
    return this.config.runtime.useFakePublishers;
  }

  public shouldUseMockVectorDb(): boolean {
    return this.config.runtime.useMockVectorDb;
  }

  // Convenience methods for common combinations
  public isFullyMocked(): boolean {
    const r = this.config.runtime;
    return r.useMockPersistence && r.useMockAuth && r.useFakePublishers;
  }

  public isMockPersistenceEnabled(): boolean {
    return this.config.runtime.useMockPersistence;
  }

  private determineMockPersistenceFlag(): boolean {
    // New unified flag takes precedence
    if (process.env.USE_MOCK_PERSISTENCE !== undefined) {
      return process.env.USE_MOCK_PERSISTENCE === 'true';
    }

    // Legacy support - if either old flag is false, persistence is disabled
    if (
      process.env.USE_MOCK_REPOS === 'true' ||
      process.env.USE_IN_MEMORY_EVENTS === 'true'
    ) {
      return true;
    }

    // Default to false (use mock persistence) unless explicitly enabled
    return false;
  }
}
