/**
 * A handle as the API wants it: no leading `@`, no space, lower case. Returns
 * '' when nothing usable is left, which is what callers check.
 */
export function normalizeHandle(input: string): string {
  return input.trim().replace(/^@+/, '').toLowerCase();
}
