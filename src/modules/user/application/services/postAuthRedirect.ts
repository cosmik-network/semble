const MAX_REDIRECT_PATH_LENGTH = 512;

/**
 * Validates a user-supplied post-auth redirect target. Returns the path only
 * if it is app-relative; anything else (absolute URLs, protocol-relative
 * '//host' or '/\host' forms, oversized values) yields undefined so callers
 * fall back to the default destination instead of open-redirecting.
 */
export function sanitizeRedirectPath(path: unknown): string | undefined {
  if (typeof path !== 'string') return undefined;
  if (path.length === 0 || path.length > MAX_REDIRECT_PATH_LENGTH) {
    return undefined;
  }
  if (!path.startsWith('/')) return undefined;
  if (path.startsWith('//') || path.includes('\\')) return undefined;
  return path;
}
