const MAX_REDIRECT_PATH_LENGTH = 512;

// Paths that make no sense to return to after re-authenticating.
const EXCLUDED_PREFIXES = ['/login', '/logout', '/signup'];

/**
 * Client/server-safe mirror of the backend's post-auth redirect validation:
 * only app-relative paths survive; anything else returns undefined.
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

/**
 * Login URL that remembers where the user was, so completing sign-in can
 * return them there. Falls back to plain /login for the landing page, auth
 * pages, or anything that fails validation.
 */
export function getLoginPathWithRedirect(currentPath?: string): string {
  const path =
    currentPath ??
    (typeof window !== 'undefined'
      ? window.location.pathname + window.location.search
      : undefined);

  const sanitized = sanitizeRedirectPath(path);
  if (
    !sanitized ||
    sanitized === '/' ||
    EXCLUDED_PREFIXES.some((prefix) => sanitized.startsWith(prefix))
  ) {
    return '/login';
  }

  return `/login?redirect=${encodeURIComponent(sanitized)}`;
}
