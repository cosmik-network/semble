// API error types for frontend client

export interface ApiErrorResponse {
  message: string;
  code?: string;
  details?: any;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Thrown by client DAL functions when there is no verified session. Extends
 * ApiError with a 401 so the global auth error handler (providers/tanstack.tsx)
 * treats it like any backend 401 and logs the user out, instead of the retry
 * path a plain Error would take.
 */
export class NoSessionError extends ApiError {
  constructor() {
    super('No session found', 401, 'NO_SESSION');
    this.name = 'NoSessionError';
  }
}

/**
 * Returns true when the error is a 401 ApiError — an authoritative "not
 * authenticated". Retrying these is never useful.
 */
export function isUnauthorizedApiError(err: unknown): boolean {
  return err instanceof ApiError && err.statusCode === 401;
}

/**
 * Returns true when the error is a 404 ApiError, optionally matching a specific
 * error `code` (e.g. 'PROFILE_NOT_FOUND', 'COLLECTION_NOT_FOUND').
 */
export function isNotFoundApiError(err: unknown, code?: string): boolean {
  return (
    err instanceof ApiError &&
    err.statusCode === 404 &&
    (!code || err.code === code)
  );
}
