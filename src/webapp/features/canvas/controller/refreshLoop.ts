import { focusManager } from '@tanstack/react-query';
import { atom } from 'tldraw';
import type { FetchOutcome } from './linkCards';

// Until a batch endpoint exists (#982), timed refreshes are this far apart and
// fetch only the links in view
const TIMED_REFRESH_MS = 600_000;
const FAILURES_BEFORE_SHOWN = 2;

function runEvery(callback: () => void, ms: number) {
  const timer = setInterval(callback, ms);
  return () => clearInterval(timer);
}

export interface RefreshLoopDeps {
  boardUrls(): string[];
  urlsInView(): string[];
  fetchLinks(
    urls: string[],
    options: { force?: boolean },
  ): Promise<FetchOutcome>;
  // Runs the timed refresh every so often; setInterval unless given
  everyTimedRefresh?(refresh: () => void, ms: number): () => void;
}

// Refreshes the board's links on open, when the tab is shown again (at most
// once a minute) and on a timer while it's visible
export function attachRefreshLoop(deps: RefreshLoopDeps) {
  const failed = atom('refresh failed', false);
  let failuresInARow = 0;

  async function refresh(urls: string[], options: { force?: boolean } = {}) {
    if (urls.length === 0) return;
    const outcome = await deps.fetchLinks(urls, options);
    if (outcome === 'nothing-fetched') return;
    failuresInARow = outcome === 'fetched' ? 0 : failuresInARow + 1;
    failed.set(failuresInARow >= FAILURES_BEFORE_SHOWN);
  }

  const everyTimedRefresh = deps.everyTimedRefresh ?? runEvery;
  let unsubscribe = () => {};
  let stopTimer = () => {};

  return {
    failed,
    // Once the board has loaded
    start() {
      // What the board last saved may be from before a change made elsewhere
      void refresh(deps.boardUrls(), { force: true });
      unsubscribe = focusManager.subscribe((focused) => {
        if (focused) void refresh(deps.boardUrls());
      });
      stopTimer = everyTimedRefresh(() => {
        if (focusManager.isFocused())
          void refresh(deps.urlsInView(), { force: true });
      }, TIMED_REFRESH_MS);
    },
    detach() {
      unsubscribe();
      stopTimer();
    },
  };
}
