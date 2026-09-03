import { describe, expect, it } from 'vitest';
import {
  decodeAnswer,
  encodeAnswer,
  encodeFinalAnswer,
} from '@/features/onboarding/lib/otherAnswer';

describe('encodeAnswer', () => {
  it('leaves an answer without Other untouched', () => {
    expect(encodeAnswer(['discovery', 'sharing'], '')).toEqual([
      'discovery',
      'sharing',
    ]);
  });

  it('appends the free text beside the id it belongs to', () => {
    expect(encodeAnswer(['discovery', 'other'], 'a reading list')).toEqual([
      'discovery',
      'other',
      'other:a reading list',
    ]);
  });

  it('drops text left behind by a deselected Other', () => {
    expect(encodeAnswer(['discovery'], 'a reading list')).toEqual([
      'discovery',
    ]);
  });

  it('keeps whitespace while editing, so typed spaces are not eaten', () => {
    expect(encodeAnswer(['other'], 'a ')).toEqual(['other', 'other:a ']);
  });

  it('never emits a blank element, which would count without ranking', () => {
    expect(encodeAnswer(['', ' ', 'other'], '')).toEqual(['other']);
  });

  it('caps free text, which the query service does not sanitize', () => {
    const encoded = encodeAnswer(['other'], 'x'.repeat(500));

    expect(encoded[1]).toHaveLength('other:'.length + 200);
  });
});

describe('encodeFinalAnswer', () => {
  it('drops whitespace-only text rather than storing a blank answer', () => {
    expect(encodeFinalAnswer(['other'], '   ')).toEqual(['other']);
  });

  it('trims free text on the way into storage', () => {
    expect(encodeFinalAnswer(['other'], '  a reading list  ')).toEqual([
      'other',
      'other:a reading list',
    ]);
  });
});

describe('decodeAnswer', () => {
  it('round-trips an Other answer', () => {
    const encoded = encodeAnswer(['discovery', 'other'], 'a reading list');

    expect(decodeAnswer(encoded)).toEqual({
      selected: ['discovery', 'other'],
      otherText: 'a reading list',
    });
  });

  it('reads a null column as an unanswered question', () => {
    expect(decodeAnswer(null)).toEqual({ selected: [], otherText: '' });
  });

  it('reads a skipped question as answered with nothing', () => {
    expect(decodeAnswer([])).toEqual({ selected: [], otherText: '' });
  });

  it('keeps free text containing a colon intact', () => {
    expect(decodeAnswer(['other', 'other:a note: with a colon'])).toEqual({
      selected: ['other'],
      otherText: 'a note: with a colon',
    });
  });
});
