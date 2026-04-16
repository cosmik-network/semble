export function sanitizeReturnTo(
  raw: string | string[] | undefined | null,
): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null;
  if (
    raw === '/login' ||
    raw.startsWith('/login?') ||
    raw.startsWith('/login#')
  ) {
    return null;
  }
  return raw;
}
