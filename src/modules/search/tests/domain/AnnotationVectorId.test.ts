import { annotationVectorId } from '../../domain/value-objects/AnnotationVectorId';

describe('annotationVectorId', () => {
  it('is deterministic for the same url and normalized passage', () => {
    expect(
      annotationVectorId('https://example.com/a', 'the committee found'),
    ).toBe(annotationVectorId('https://example.com/a', 'the committee found'));
  });

  it('differs across urls and passages', () => {
    const base = annotationVectorId('https://example.com/a', 'same passage');
    expect(
      annotationVectorId('https://example.com/b', 'same passage'),
    ).not.toBe(base);
    expect(
      annotationVectorId('https://example.com/a', 'other passage'),
    ).not.toBe(base);
  });

  it('joins with a newline so concatenation cannot alias', () => {
    // 'ab' + 'c' vs 'a' + 'bc' must not collide
    expect(annotationVectorId('ab', 'c')).not.toBe(
      annotationVectorId('a', 'bc'),
    );
  });
});
