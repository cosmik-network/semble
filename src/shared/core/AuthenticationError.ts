export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * The PDS session could not be used right now, but is not known to be dead
 * (network failure, PDS/auth server outage, lock or metadata fetch failure).
 * Retrying may succeed and re-authenticating would not help, so this maps to
 * a 503 instead of a 401 that logs the user out.
 *
 * Extends AuthenticationError so it propagates through every layer that
 * already forwards PDS auth failures to the controller.
 */
export class PdsUnavailableError extends AuthenticationError {
  constructor(message: string) {
    super(message);
    this.name = 'PdsUnavailableError';
  }
}
