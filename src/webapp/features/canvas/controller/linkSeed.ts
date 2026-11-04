import { computed, type Editor, type JsonObject, type TLShapeId } from 'tldraw';
import { getDomain } from '@/lib/utils/link';
import { linkKey } from '../model/linkCards';
import {
  connectedUrls,
  FIRST_RING_SIZE,
  nextRing,
  ringAround,
  ringSpacing,
  type Ring,
} from '../model/linkSeed';
import type { LinkInfo } from '../server/canvasServer';
import { linkCardsOn } from '../shapes/linkCard/LinkCardShapeUtil';
import type { FetchOutcome, LinkPlacement } from './linkCards';

// What starting a board from a link is waiting on: the link and its
// connections, then the links of its ring. From a collection: the collection,
// then its entries' links.
export type SeedProgress =
  | { step: 'link'; url: string }
  | { step: 'ring'; count: number }
  | { step: 'collection' }
  | { step: 'entries'; count: number };

export interface LinkSeedDeps {
  editor: Editor;
  fetchLinks(urls: string[]): Promise<FetchOutcome>;
  linkOf(url: string): LinkInfo | undefined;
  cardHeight(url: string): number;
  placeLinks(places: LinkPlacement[]): TLShapeId[];
  // Leaves a name the user has given the board
  rename(name: string): Promise<void>;
  onFailed(): void;
  // Null once the board has started, or couldn't
  onProgress(progress: SeedProgress | null): void;
  // False once the board is closed or another tab writes it
  canPlace(): boolean;
}

// Kept in the document's meta, not the middle card's, which its copies would
// share. Undo takes it back with the cards it placed.
interface SeedState {
  cardId: TLShapeId;
  url: string;
  // Every link a ring has placed, including ones deleted since
  placed: string[];
  outermost: Ring;
}

const SEED_META_KEY = 'linkSeed';

// Starts a new board from a link's Semble page: the link in the middle and
// the links it's connected to in a ring round it, and further rings when more
// are asked for. Links are fetched before they're placed, so each ring is
// spaced for its cards' real heights.
export function attachLinkSeed(deps: LinkSeedDeps) {
  const { editor } = deps;

  const stateOf = () =>
    (editor.getDocumentSettings().meta[SEED_META_KEY] as
      | SeedState
      | undefined) ?? null;
  // Not through updateDocumentSettings, which keeps it out of undo
  const setState = (state: SeedState) => {
    const settings = editor.getDocumentSettings();
    editor.store.put([
      {
        ...settings,
        meta: {
          ...settings.meta,
          [SEED_META_KEY]: state as unknown as JsonObject,
        },
      },
    ]);
  };

  // Only while the middle card is on the board
  const state = computed('link seed', () => {
    const seed = stateOf();
    return seed && editor.getShape(seed.cardId) ? seed : null;
  });

  // Connected links not yet placed by a ring nor put on the board otherwise
  function unplaced(): string[] {
    const seed = state.get();
    if (!seed) return [];
    const onBoard = new Set(linkCardsOn(editor).map((card) => card.props.url));
    const connections = deps.linkOf(seed.url)?.connections ?? [];
    return connectedUrls(seed.url, connections).filter(
      (url) => !seed.placed.includes(url) && !onBoard.has(url),
    );
  }

  const tallestOf = (urls: string[]) =>
    Math.max(0, ...urls.map(deps.cardHeight));

  async function seed(seedUrl: string) {
    try {
      await placeSeed(seedUrl);
    } finally {
      deps.onProgress(null);
    }
  }

  async function placeSeed(seedUrl: string) {
    const url = linkKey(seedUrl);
    if (!url) return;
    deps.onProgress({ step: 'link', url });
    await deps.fetchLinks([url]);
    const link = deps.linkOf(url);
    // Placing it alone would save the board, and it would never get its ring.
    // Left empty, the board isn't saved and reloading tries again.
    if (!link?.connections) {
      deps.onFailed();
      return;
    }
    const neighbours = connectedUrls(url, link.connections).slice(
      0,
      FIRST_RING_SIZE,
    );
    if (neighbours.length > 0) {
      deps.onProgress({ step: 'ring', count: neighbours.length });
      await deps.fetchLinks(neighbours);
    }
    if (!deps.canPlace()) return;
    // Clear of the middle card too
    const ring = nextRing(
      null,
      neighbours.length,
      ringSpacing(tallestOf([url, ...neighbours])),
    );
    const middle = editor.getViewportPageBounds().center;
    const at = ringAround(middle, ring);
    // The board's starting point, which undo doesn't take back
    editor.run(
      () => {
        const [cardId] = deps.placeLinks([
          { url, at: middle },
          ...neighbours.map((neighbour, i) => ({ url: neighbour, at: at[i] })),
        ]);
        setState({
          cardId,
          url,
          placed: neighbours,
          outermost: ring,
        });
      },
      { history: 'ignore' },
    );
    const bounds = editor.getCurrentPageBounds();
    if (bounds) editor.zoomToBounds(bounds, { targetZoom: 1, immediate: true });
    // Its popup offers the rest
    if (unplaced().length > 0) editor.select(stateOf()!.cardId);
    // The links are placed, so failing this isn't a failed seed
    await deps
      .rename(link.metadata.title?.trim() || getDomain(url))
      .catch(console.warn);
  }

  // The next ring out from the outermost, however much room the rings
  // inside it have, round the middle card where it is now. One step of undo.
  async function placeMore() {
    const before = state.get();
    if (!before || !deps.canPlace()) return;
    const waiting = unplaced();
    const guess = nextRing(before.outermost, waiting.length, 0);
    const candidates = waiting.slice(0, guess.size);
    if (candidates.length === 0) return;
    await deps.fetchLinks(candidates);
    const seed = state.get();
    if (!seed || !deps.canPlace()) return;
    // Skips any put on the board while they were fetched
    const fetched = unplaced().filter((url) => candidates.includes(url));
    const ring = nextRing(
      seed.outermost,
      fetched.length,
      ringSpacing(tallestOf(fetched)),
    );
    const urls = fetched.slice(0, ring.size);
    if (urls.length === 0) return;
    const middle = editor.getShapePageBounds(seed.cardId)!.center;
    const at = ringAround(middle, ring);
    editor.markHistoryStoppingPoint('place more connected links');
    editor.run(() => {
      deps.placeLinks(urls.map((url, i) => ({ url, at: at[i] })));
      setState({
        ...seed,
        placed: [...seed.placed, ...urls],
        outermost: ring,
      });
    });
  }

  return { state, unplaced, seed, placeMore };
}

export type LinkSeed = ReturnType<typeof attachLinkSeed>;
