import { describe, expect, it } from 'vitest';
import {
  needsGlobalFallback,
  resolveSeedUrls,
} from '@/features/explore/lib/queries/useSeedUrls';

const NO_FALLBACK_YET = { urls: [], isPending: true };

// ─────────────────────────────────────────────
// needsGlobalFallback
// ─────────────────────────────────────────────
describe('needsGlobalFallback', () => {
  it('should wait while the caller is still looking up its candidates', () => {
    // Act
    const needed = needsGlobalFallback({
      frozen: [],
      candidates: undefined,
      hasSettled: false,
    });

    // Assert
    expect(needed).toBe(false);
  });

  it('should fall back once the caller settles on no candidates', () => {
    // Act
    const needed = needsGlobalFallback({
      frozen: [],
      candidates: [],
      hasSettled: true,
    });

    // Assert
    expect(needed).toBe(true);
  });

  // A failed lookup arrives as undefined candidates, the same shape a pending
  // one has; only hasSettled tells them apart. Reading it as "still pending"
  // leaves the reader on a skeleton for good.
  it('should fall back when the caller settled without producing candidates', () => {
    // Act
    const needed = needsGlobalFallback({
      frozen: [],
      candidates: undefined,
      hasSettled: true,
    });

    // Assert
    expect(needed).toBe(true);
  });

  it('should not fall back when the caller supplied candidates', () => {
    // Act
    const needed = needsGlobalFallback({
      frozen: [],
      candidates: ['a'],
      hasSettled: true,
    });

    // Assert
    expect(needed).toBe(false);
  });

  it('should not fall back once a set is frozen', () => {
    // Act
    const needed = needsGlobalFallback({
      frozen: ['a'],
      candidates: [],
      hasSettled: true,
    });

    // Assert
    expect(needed).toBe(false);
  });
});

// ─────────────────────────────────────────────
// resolveSeedUrls
// ─────────────────────────────────────────────
describe('resolveSeedUrls', () => {
  it('should prefer the frozen set over anything a later render offers', () => {
    // Act
    const urls = resolveSeedUrls(
      { frozen: ['a'], candidates: ['b'], hasSettled: true },
      { urls: ['x'], isPending: false },
    );

    // Assert
    expect(urls).toEqual(['a']);
  });

  it('should hold the frozen set when a refetch takes the candidates away', () => {
    // Act
    const urls = resolveSeedUrls(
      { frozen: ['a'], candidates: undefined, hasSettled: false },
      NO_FALLBACK_YET,
    );

    // Assert
    expect(urls).toEqual(['a']);
  });

  it('should report unresolved while the caller is still looking', () => {
    // Act
    const urls = resolveSeedUrls(
      { frozen: [], candidates: undefined, hasSettled: false },
      NO_FALLBACK_YET,
    );

    // Assert
    expect(urls).toBeUndefined();
  });

  it('should report unresolved while the fallback is loading', () => {
    // Act
    const urls = resolveSeedUrls(
      { frozen: [], candidates: [], hasSettled: true },
      NO_FALLBACK_YET,
    );

    // Assert
    expect(urls).toBeUndefined();
  });

  it('should use the fallback seeds once they land', () => {
    // Act
    const urls = resolveSeedUrls(
      { frozen: [], candidates: [], hasSettled: true },
      { urls: ['x'], isPending: false },
    );

    // Assert
    expect(urls).toEqual(['x']);
  });

  it('should resolve to none when even the fallback comes back empty', () => {
    // Act
    const urls = resolveSeedUrls(
      { frozen: [], candidates: [], hasSettled: true },
      { urls: [], isPending: false },
    );

    // Assert — an empty array, not undefined: the caller has to stop waiting.
    expect(urls).toEqual([]);
  });
});
