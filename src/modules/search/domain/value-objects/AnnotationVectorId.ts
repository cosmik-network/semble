import { createHash } from 'node:crypto';

/**
 * Stable vector ID for an annotation passage.
 *
 * One vector per distinct passage per URL, shared across every user/card that
 * annotates it. The hash input is the *stored* `annotation_selectors.exact_normalized`
 * value (produced by `normalizeQuotedText`), never re-derived ad hoc — writers and
 * deleters must both go through this function so they can never disagree. The URL
 * and passage are joined with a newline to prevent concatenation ambiguity.
 */
export function annotationVectorId(
  url: string,
  exactNormalized: string,
): string {
  return createHash('sha256')
    .update(`${url}\n${exactNormalized}`)
    .digest('hex');
}
