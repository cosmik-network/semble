/**
 * A handle as the API wants it: no leading `@`, no surrounding space, lower
 * case. Readers paste handles from Bluesky, where they are shown with the `@`.
 * Returns '' when nothing usable is left, which is what callers check.
 */
export function normalizeHandle(input: string): string {
  return input.trim().replace(/^@+/, '').toLowerCase();
}
