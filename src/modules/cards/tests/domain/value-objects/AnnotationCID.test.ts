import { createHash } from 'node:crypto';
import { computeAnnotationCID, normalizeQuotedText } from '@semble/types';
import { AnnotationCID } from '../../../domain/value-objects/AnnotationCID';

/** The full derivation, recomputed with node:crypto as the reference */
function referenceCID(url: string, exact: string): string {
  const digest = createHash('sha256')
    .update(`${url}\n${normalizeQuotedText(exact)}`)
    .digest();
  return BigInt(`0x${digest.subarray(0, 12).toString('hex')}`).toString(36);
}

describe('computeAnnotationCID', () => {
  it('is deterministic for the same url and passage', () => {
    expect(
      computeAnnotationCID('https://example.com/a', 'the committee found'),
    ).toBe(
      computeAnnotationCID('https://example.com/a', 'the committee found'),
    );
  });

  it('matches the reference derivation (sha256 → 12 bytes → base36)', () => {
    expect(
      computeAnnotationCID('https://example.com/a', 'the committee found'),
    ).toBe(referenceCID('https://example.com/a', 'the committee found'));
    expect(
      computeAnnotationCID('https://example.com/a', 'ünïcode pässage ✨'),
    ).toBe(referenceCID('https://example.com/a', 'ünïcode pässage ✨'));
  });

  it('normalizes whitespace and canonicalizes the url before hashing', () => {
    // whitespace runs collapse — same passage
    expect(
      computeAnnotationCID(
        'https://example.com/a',
        'a  passage\n\nwith breaks',
      ),
    ).toBe(
      computeAnnotationCID('https://example.com/a', 'a passage with breaks'),
    );
    // bare root urls gain a trailing slash, matching the domain URL VO
    expect(computeAnnotationCID('https://example.com', 'x')).toBe(
      computeAnnotationCID('https://example.com/', 'x'),
    );
    // urls with a path are left alone
    expect(computeAnnotationCID('https://example.com/a', 'x')).not.toBe(
      computeAnnotationCID('https://example.com/a/', 'x'),
    );
  });

  it('differs across urls and passages', () => {
    const base = computeAnnotationCID('https://example.com/a', 'same passage');
    expect(
      computeAnnotationCID('https://example.com/b', 'same passage'),
    ).not.toBe(base);
    expect(
      computeAnnotationCID('https://example.com/a', 'other passage'),
    ).not.toBe(base);
  });

  it('joins with a newline so concatenation cannot alias', () => {
    // 'ab' + 'c' vs 'a' + 'bc' must not collide
    expect(computeAnnotationCID('ab', 'c')).not.toBe(
      computeAnnotationCID('a', 'bc'),
    );
  });

  it('produces 18–19 lowercase alphanumeric chars', () => {
    for (const [url, exact] of [
      ['https://example.com/a', 'short'],
      ['https://example.com/a', 'a much longer passage with many words'],
    ] as const) {
      expect(computeAnnotationCID(url, exact)).toMatch(/^[0-9a-z]{18,19}$/);
    }
  });
});

describe('AnnotationCID', () => {
  it('derives from a passage and round-trips through its string form', () => {
    const result = AnnotationCID.fromPassage(
      'https://example.com/a',
      'the committee found',
    );
    expect(result.isErr()).toBe(false);
    const cid = result.unwrap();

    expect(cid.value).toBe(
      computeAnnotationCID('https://example.com/a', 'the committee found'),
    );

    const parsed = AnnotationCID.createFromString(cid.value);
    expect(parsed.isErr()).toBe(false);
    expect(parsed.unwrap().equals(cid)).toBe(true);
  });

  it('rejects malformed inbound values', () => {
    expect(AnnotationCID.createFromString('').isErr()).toBe(true);
    expect(AnnotationCID.createFromString('not-a-cid!').isErr()).toBe(true);
    expect(AnnotationCID.createFromString('abc').isErr()).toBe(true);
  });
});
