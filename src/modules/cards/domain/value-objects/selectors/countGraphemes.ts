const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * Counts user-perceived characters (graphemes). Lexicon schemas constrain
 * both maxLength (UTF-16 code units) and maxGraphemes, and the two diverge
 * for emoji, combining marks, and other multi-code-point graphemes — a
 * string can pass one limit and fail the other, so both are enforced.
 */
export function countGraphemes(text: string): number {
  let count = 0;
  for (const _ of segmenter.segment(text)) {
    count++;
  }
  return count;
}
