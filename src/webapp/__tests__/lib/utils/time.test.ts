import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getFormattedDate, getRelativeTime } from '@/lib/utils/time';

// Fixed point in time used as "now" across all relative-time tests
const NOW = new Date('2025-01-15T12:00:00Z').getTime();

// ─────────────────────────────────────────────
// getRelativeTime
// ─────────────────────────────────────────────
describe('getRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "now" when the date is the current moment', () => {
    // Arrange
    const dateString = new Date(NOW).toISOString();

    // Act
    const result = getRelativeTime(dateString);

    // Assert
    expect(result).toBe('now');
  });

  it('should return "now" when elapsed time is exactly 1 second', () => {
    // Arrange — the intervals use strict less-than, so 1s does not cross any threshold
    const dateString = new Date(NOW - 1_000).toISOString();

    // Act
    const result = getRelativeTime(dateString);

    // Assert
    expect(result).toBe('now');
  });

  it('should return seconds when elapsed time is under a minute', () => {
    // Arrange
    const dateString = new Date(NOW - 30_000).toISOString();

    // Act
    const result = getRelativeTime(dateString);

    // Assert
    expect(result).toBe('30s');
  });

  it('should return minutes when elapsed time is under an hour', () => {
    // Arrange
    const dateString = new Date(NOW - 5 * 60_000).toISOString();

    // Act
    const result = getRelativeTime(dateString);

    // Assert
    expect(result).toBe('5m');
  });

  it('should return hours when elapsed time is under a day', () => {
    // Arrange
    const dateString = new Date(NOW - 2 * 3_600_000).toISOString();

    // Act
    const result = getRelativeTime(dateString);

    // Assert
    expect(result).toBe('2h');
  });

  it('should return days when elapsed time is under a month', () => {
    // Arrange
    const dateString = new Date(NOW - 3 * 86_400_000).toISOString();

    // Act
    const result = getRelativeTime(dateString);

    // Assert
    expect(result).toBe('3d');
  });

  it('should return months when elapsed time is under a year', () => {
    // Arrange
    const dateString = new Date(NOW - 3 * 2_592_000_000).toISOString();

    // Act
    const result = getRelativeTime(dateString);

    // Assert
    expect(result).toBe('3mo');
  });

  it('should return years when elapsed time exceeds one year', () => {
    // Arrange
    const dateString = new Date(NOW - 2 * 31_536_000_000).toISOString();

    // Act
    const result = getRelativeTime(dateString);

    // Assert
    expect(result).toBe('2y');
  });
});

// ─────────────────────────────────────────────
// getFormattedDate
// ─────────────────────────────────────────────
describe('getFormattedDate', () => {
  it('should replace the second comma with "at"', () => {
    // Arrange — toLocaleString('en-US', ...) produces "Mon DD, YYYY, H:MM AM/PM";
    // the function swaps the second comma for " at "
    const date = '2025-09-20T00:00:00Z';

    // Act
    const result = getFormattedDate(date);

    // Assert — the year is no longer followed by a comma
    expect(result).toMatch(/ at /);
    expect(result).not.toMatch(/\d{4},\s*\d/);
  });

  it('should include the year in the output', () => {
    // Arrange
    const date = '2025-09-20T00:00:00Z';

    // Act
    const result = getFormattedDate(date);

    // Assert
    expect(result).toMatch(/2025/);
  });

  it('should include AM or PM in the output', () => {
    // Arrange
    const date = '2025-09-20T00:00:00Z';

    // Act
    const result = getFormattedDate(date);

    // Assert
    expect(result).toMatch(/AM|PM/);
  });
});
