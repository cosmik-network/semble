import { ApiError, ApiErrorResponse } from './errors';

export function unwrap<T>(res: { status: number; body: unknown }): T {
  if (res.status >= 200 && res.status < 300) return res.body as T;
  const body = res.body as ApiErrorResponse | undefined;
  throw new ApiError(
    body?.message ?? `Request failed with status ${res.status}`,
    res.status,
    body?.code,
    body?.details,
  );
}
