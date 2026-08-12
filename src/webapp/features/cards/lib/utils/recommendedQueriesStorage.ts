'use client';

/**
 * The recommendation queries are pinned client-side (rather than in the URL) so
 * pagination and reloads read from the same cached ranked set without leaking
 * long query strings into the address bar. They're deliberately short-lived:
 * cleared on navigating away from the page, and treated as absent once older
 * than MAX_AGE_MS so a returning user gets fresh recommendations.
 */
const STORAGE_KEY = 'recommended-cards-queries';
const MAX_AGE_MS = 2 * 60 * 1000; // 2 minutes

interface StoredQueries {
  queries: string[];
  storedAt: number;
}

export function readStoredQueries(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as StoredQueries;
    if (
      !Array.isArray(parsed?.queries) ||
      typeof parsed.storedAt !== 'number'
    ) {
      clearStoredQueries();
      return [];
    }

    if (Date.now() - parsed.storedAt > MAX_AGE_MS) {
      clearStoredQueries();
      return [];
    }

    return parsed.queries;
  } catch {
    // Corrupt or unreadable entry — drop it rather than wedging the page
    clearStoredQueries();
    return [];
  }
}

export function writeStoredQueries(queries: string[]): void {
  if (typeof window === 'undefined') return;

  try {
    const payload: StoredQueries = { queries, storedAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage unavailable (private mode, quota) — recommendations still work,
    // they just won't survive a reload
  }
}

export function clearStoredQueries(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do if storage is unavailable
  }
}
