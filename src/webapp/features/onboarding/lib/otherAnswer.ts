import { OTHER_ID } from './questions';

/**
 * `intention` and `referral_source` are `text[]` with no companion column for
 * the free text an "Other" answer carries, so it travels as an extra element
 * beside the plain `other` id:
 *
 *   ['discovery', 'other', 'other:building a reading list']
 *
 * Analytics unnests these columns and groups by value, so the id keeps an
 * accurate per-user count while the typed answer ranks as its own row. Anything
 * computing percentages must count the ids, not the rows.
 */
const OTHER_PREFIX = `${OTHER_ID}:`;

/** The query service caps and sanitizes nothing, so it happens here. */
const MAX_OTHER_LENGTH = 200;

export function encodeAnswer(selected: string[], otherText: string): string[] {
  // A blank element counts toward the column's user total but is filtered out
  // of the ranked values, giving a dimension a count with nothing behind it.
  const ids = selected.map((id) => id.trim()).filter(Boolean);

  // Deliberately not trimmed: this round-trips back into the textarea on every
  // keystroke, and trimming here eats a trailing space as fast as it is typed.
  // encodeFinalAnswer does the sanitizing on the way out of the stage.
  const text = otherText.slice(0, MAX_OTHER_LENGTH);

  return ids.includes(OTHER_ID) && text.length > 0
    ? [...ids, `${OTHER_PREFIX}${text}`]
    : ids;
}

/** The persisted form: use when committing the stage, not while editing. */
export function encodeFinalAnswer(
  selected: string[],
  otherText: string,
): string[] {
  return encodeAnswer(selected, otherText.trim());
}

export function decodeAnswer(stored: string[] | null | undefined): {
  selected: string[];
  otherText: string;
} {
  const values = stored ?? [];

  const encoded = values.find((value) => value.startsWith(OTHER_PREFIX));

  return {
    selected: values.filter((value) => !value.startsWith(OTHER_PREFIX)),
    otherText: encoded ? encoded.slice(OTHER_PREFIX.length) : '',
  };
}
