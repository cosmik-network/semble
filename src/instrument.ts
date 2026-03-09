import * as Sentry from '@sentry/node';
import { configService } from './shared/infrastructure/config';

const sentryConfig = configService.getSentryConfig();

// Only initialize Sentry if DSN is provided
if (sentryConfig.dsn) {
  // Determine release from environment (git SHA injected during deployment)
  const release =
    process.env.SENTRY_RELEASE || process.env.GIT_SHA || undefined;

  Sentry.init({
    dsn: sentryConfig.dsn,
    environment: sentryConfig.environment,
    release: release,
    // Performance Monitoring - Start at 10% to manage costs (Fly.io recommendation)
    tracesSampleRate: 1.0,
    // Send default PII (includes IP addresses, user data)
    sendDefaultPii: true,
  });

  // Add Fly.io-specific context tags
  Sentry.setTags({
    serverName: process.env.FLY_MACHINE_ID || 'local',
    region: process.env.FLY_REGION || 'local',
    processType: process.env.PROCESS_TYPE || 'unknown',
  });

  console.log(
    `[Sentry] Initialized for environment: ${sentryConfig.environment}${release ? ` (release: ${release})` : ''}`,
  );
} else {
  console.log('[Sentry] Skipped initialization (no DSN provided)');
}
