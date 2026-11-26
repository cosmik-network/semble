/**
 * The canonical normalization for quoted annotation text comparison.
 *
 * Two users selecting the same sentence can capture different whitespace
 * (a paragraph break vs a space, a stray double space), so raw `exact`
 * values must never be compared for "same passage" equality. This function
 * defines the single comparison key used across the codebase:
 *
 *   collapse every whitespace run to a single space, then trim the ends.
 *
 * It is implemented once here on purpose. The persistence layer stores the
 * normalized form (`exact_normalized` on annotation_selectors) computed by
 * this function at write time, so matching queries compare plain equality
 * on that column — no SQL-side normalization that could drift from this
 * rule. If a hash index over (normalized url, normalized exact) is ever
 * added for cross-URL lookups, it must hash the output of this function.
 *
 * Note: JS `\s` matches some characters (e.g. NBSP, U+2028) that other
 * environments' whitespace classes may not. Any other implementation of
 * this rule must match JS `\s` semantics exactly, or normalization should
 * be redefined with an explicit character list before divergence occurs.
 */
export function normalizeQuotedText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Map key for a passage: (url, exact_normalized) joined with a newline so
 * url+passage concatenation can never alias. Shared by the query services
 * that group annotation cards by passage and the callers that look results
 * up again.
 */
export function annotationPassageKey(
  url: string,
  exactNormalized: string,
): string {
  return `${url}\n${exactNormalized}`;
}
