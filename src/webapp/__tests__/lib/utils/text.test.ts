import { describe, expect, it } from 'vitest';
import { abbreviateNumber, sanitizeText, truncateText } from '@/lib/utils/text';

// ─────────────────────────────────────────────
// truncateText
// ─────────────────────────────────────────────
describe('truncateText', () => {
  it('should return text unchanged when shorter than maxLength', () => {
    // Arrange
    const text = 'short text';
    const maxLength = 20;

    // Act
    const result = truncateText(text, maxLength);

    // Assert
    expect(result).toBe(text);
  });

  it('should return text unchanged when equal to maxLength', () => {
    // Arrange
    const text = 'exactly twenty chars';
    const maxLength = text.length;

    // Act
    const result = truncateText(text, maxLength);

    // Assert
    expect(result).toBe(text);
  });

  it('should truncate and append ellipsis when text exceeds maxLength', () => {
    // Arrange
    const text = 'this is a fairly long sentence that should be cut off';
    const maxLength = 10;

    // Act
    const result = truncateText(text, maxLength);

    // Assert
    expect(result).toBe('this is a ...');
    expect(result).toHaveLength(maxLength + 3);
  });

  it('should default to maxLength of 100', () => {
    // Arrange
    const text = 'a'.repeat(101);

    // Act
    const result = truncateText(text);

    // Assert
    expect(result).toMatch(/\.\.\.$/);
    expect(result).toHaveLength(103); // 100 chars + '...'
  });

  it('should return text unchanged when maxLength is not a number', () => {
    // Arrange — TypeScript won't allow this but the runtime guard exists
    const text = 'some text';

    // Act
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = truncateText(text, 'not-a-number' as any);

    // Assert
    expect(result).toBe(text);
  });
});

// ─────────────────────────────────────────────
// sanitizeText
// ─────────────────────────────────────────────
describe('sanitizeText', () => {
  it('should return text unchanged when no bidi characters are present', () => {
    // Arrange
    const text = 'Hello, world!';

    // Act
    const result = sanitizeText(text);

    // Assert
    expect(result).toBe(text);
  });

  it('should strip RTL override character (U+202E)', () => {
    // Arrange — U+202E makes text render right-to-left
    const text = '\u202Eevil text';

    // Act
    const result = sanitizeText(text);

    // Assert
    expect(result).toBe('evil text');
  });

  it('should strip all known bidi control characters', () => {
    // Arrange — all seven characters the function targets
    const bidiChars = '\u202E\u202D\u202B\u200F\u200E\u202C\u200C';
    const text = `before${bidiChars}after`;

    // Act
    const result = sanitizeText(text);

    // Assert
    expect(result).toBe('beforeafter');
  });

  it('should return an empty string when input is not a string', () => {
    // Arrange — runtime guard for non-string inputs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nonString = 42 as any;

    // Act
    const result = sanitizeText(nonString);

    // Assert
    expect(result).toBe('');
  });
});

// ─────────────────────────────────────────────
// abbreviateNumber
// ─────────────────────────────────────────────
describe('abbreviateNumber', () => {
  it('should return the number as a string when below 1 000', () => {
    // Arrange
    const num = 999;

    // Act
    const result = abbreviateNumber(num);

    // Assert
    expect(result).toBe('999');
  });

  it('should return a k-suffixed string for thousands', () => {
    // Arrange
    const num = 1_500;

    // Act
    const result = abbreviateNumber(num);

    // Assert
    expect(result).toMatch(/k$/i);
    expect(result).toBe('1.5k');
  });

  it('should omit the decimal when the thousands value is a whole number', () => {
    // Arrange
    const num = 2_000;

    // Act
    const result = abbreviateNumber(num);

    // Assert
    expect(result).toBe('2k');
  });

  it('should return an M-suffixed string for millions', () => {
    // Arrange
    const num = 3_400_000;

    // Act
    const result = abbreviateNumber(num);

    // Assert
    expect(result).toBe('3.4M');
  });

  it('should return a B-suffixed string for billions', () => {
    // Arrange
    const num = 5_600_000_000;

    // Act
    const result = abbreviateNumber(num);

    // Assert
    expect(result).toBe('5.6B');
  });

  it('should treat 1 000 as the boundary for the k suffix', () => {
    // Arrange
    const below = 999;
    const boundary = 1_000;

    // Act / Assert
    expect(abbreviateNumber(below)).toBe('999');
    expect(abbreviateNumber(boundary)).toBe('1k');
  });
});
