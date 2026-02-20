import posthog from 'posthog-js';

/**
 * Check if analytics should be captured
 * Centralizes the logic for when to track events
 */
export function shouldCaptureAnalytics(): boolean {
  return (
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' && posthog.__loaded
  );
}
