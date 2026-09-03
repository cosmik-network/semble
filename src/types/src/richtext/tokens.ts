/**
 * Shared #tag / @mention grammar for note cards, connection notes, and
 * collection descriptions. Single source of truth for server (parsing,
 * notification extraction), webapp (rendering validation, input
 * autocomplete), and the SQL boundary pattern used by tag queries.
 *
 * Tag grammar:     #[A-Za-z0-9_-]+  preceded by start-of-text or a
 *                  non-word character (so foo#bar is not a tag).
 * Mention grammar: @ + AT-proto-style handle that contains at least one
 *                  dot (so bare @alice and emails are not mentions).
 */

const TAG_BODY = '[A-Za-z0-9_-]+';
const HANDLE_SEGMENT = '[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?';
const HANDLE_BODY = `${HANDLE_SEGMENT}(?:\\.${HANDLE_SEGMENT})+`;

// Capture group 1 is the tag body / handle. The boundary is expressed as a
// lookbehind so adjacent matches (",#maps") still work with a global regex.
export const TAG_TOKEN_REGEX_SOURCE = `(?<![A-Za-z0-9_#])#(${TAG_BODY})`;
export const MENTION_TOKEN_REGEX_SOURCE = `(?<![A-Za-z0-9_@.])@(${HANDLE_BODY})`;

export function normalizeTag(tag: string): string {
  return tag.replace(/^#/, '').toLowerCase();
}

function extractAll(text: string, source: string): string[] {
  if (!text) return [];
  const regex = new RegExp(source, 'g');
  const seen = new Set<string>();
  for (const match of text.matchAll(regex)) {
    if (match[1]) {
      seen.add(match[1].toLowerCase());
    }
  }
  return Array.from(seen);
}

/** All distinct tags in the text, lowercased, in order of first appearance. */
export function extractTags(text: string): string[] {
  return extractAll(text, TAG_TOKEN_REGEX_SOURCE);
}

/** All distinct mentioned handles (without the @), lowercased. */
export function extractMentions(text: string): string[] {
  return extractAll(text, MENTION_TOKEN_REGEX_SOURCE);
}

/**
 * POSIX regex for Postgres `~*` that matches the tag with correct word
 * boundaries (never matches #tagfoo when looking for #tag). The tag charset
 * needs no regex escaping, but normalize first.
 */
export function sqlTagBoundaryPattern(tag: string): string {
  const safe = normalizeTag(tag).replace(/[^a-z0-9_-]/g, '');
  return `(^|[^[:alnum:]_#])#${safe}([^[:alnum:]_-]|$)`;
}

export interface ActiveToken {
  type: 'tag' | 'mention';
  /** Text typed after the trigger character, up to the caret. */
  query: string;
  /** Index of the trigger character (# or @) in the text. */
  start: number;
}

/**
 * Detect an in-progress #tag or @mention token at the caret position, for
 * input autocomplete. Returns null when the caret is not inside a token.
 */
export function findActiveToken(
  text: string,
  caretPos: number,
): ActiveToken | null {
  const before = text.slice(0, caretPos);
  // Walk back to the nearest whitespace; the token candidate must start with
  // a trigger character at that boundary.
  let start = caretPos - 1;
  while (start >= 0 && !/\s/.test(before.charAt(start))) {
    if (before.charAt(start) === '#' || before.charAt(start) === '@') break;
    start--;
  }
  const trigger = start >= 0 ? before.charAt(start) : '';
  if (trigger !== '#' && trigger !== '@') {
    return null;
  }
  // Trigger must be at start of text or after whitespace/punctuation, not
  // embedded in a word (foo#bar).
  const prev = start > 0 ? before.charAt(start - 1) : '';
  if (prev && /[A-Za-z0-9_#@.]/.test(prev)) {
    return null;
  }
  const query = before.slice(start + 1);
  const type = trigger === '#' ? 'tag' : 'mention';
  const valid = type === 'tag' ? /^[A-Za-z0-9_-]*$/ : /^[A-Za-z0-9.-]*$/;
  if (!valid.test(query)) {
    return null;
  }
  return { type, query, start };
}
