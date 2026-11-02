// Postgres query_canceled — raised when statement_timeout fires
const QUERY_CANCELED = '57014';

/**
 * True when the error (or anything in its `cause` chain) is a Postgres
 * statement timeout. Walks the chain because drizzle (0.44+) and our use
 * cases wrap the underlying postgres.js error.
 */
export function isStatementTimeoutError(error: unknown): boolean {
  let current: any = error;
  for (let depth = 0; current && depth < 5; depth++) {
    if (current.code === QUERY_CANCELED) return true;
    current = current.cause;
  }
  return false;
}
