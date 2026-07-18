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
