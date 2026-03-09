import * as Sentry from '@sentry/node';
import { configService } from './shared/infrastructure/config';

const sentryConfig = configService.getSentryConfig();

// Only initialize Sentry if DSN is provided
if (sentryConfig.dsn) {
  Sentry.init({
    dsn: sentryConfig.dsn,
    environment: sentryConfig.environment,
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of transactions for performance monitoring
    // Send default PII (includes IP addresses, user data)
    sendDefaultPii: true,
  });

  console.log(
    `[Sentry] Initialized for environment: ${sentryConfig.environment}`,
  );
} else {
  console.log('[Sentry] Skipped initialization (no DSN provided)');
}
