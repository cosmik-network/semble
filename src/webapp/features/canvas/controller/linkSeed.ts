import type { Editor, JsonObject, TLShapeId } from 'tldraw';
import { getDomain } from '@/lib/utils/link';
import { LINK_CARD_TYPE, linkKey } from '../model/linkCards';
import {
  connectedUrls,
  nextRing,
  ringAround,
  type Ring,
} from '../model/linkSeed';
import type { LinkInfo } from '../server/canvasServer';
import type { LinkCardShape } from '../shapes/linkCard/LinkCardShapeUtil';
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
  // Every URL the board shows, as a link card or a collection frame
  urlsOnBoard(): string[];
  // Leaves a name the user has given the board
  rename(name: string): Promise<void>;
  onFailed(): void;
  // Null once the board has started, or couldn't
  onProgress(progress: SeedProgress | null): void;
  // False once the board is closed or another tab writes it
  canPlace(): boolean;
}

// The rings of connected links placed round one card
export interface CardRings {
  url: string;
  outermost: Ring;
}

// Kept in the document's meta, by card, rather than in the cards' own meta,
// which their copies share. Undo takes them back with the cards they placed.
const RINGS_META_KEY = 'connectedRings';
// Boards started from a link before any card could place rings kept the
// middle card's alone
const SEED_META_KEY = 'linkSeed';

type RingsByCard = Record<string, CardRings>;

interface PlannedRing {
  urls: string[];
  ring: Ring;
}

// Places the links a card's link is connected to in rings round it, a ring at
// a time, and starts a new board from a link's Semble page the same way. Links
// are fetched before they're placed, so each ring is spaced for its cards'
// real heights.
export function attachLinkSeed(deps: LinkSeedDeps) {
  const { editor } = deps;

  function ringsByCard(): RingsByCard {
    const meta = editor.getDocumentSettings().meta;
    const rings = { ...(meta[RINGS_META_KEY] as RingsByCard | undefined) };
    const seed = meta[SEED_META_KEY] as
      | (CardRings & { cardId: string })
      | undefined;
    if (seed && !rings[seed.cardId]) {
      rings[seed.cardId] = { url: seed.url, outermost: seed.outermost };
    }
    return rings;
  }

  const linkCard = (cardId: TLShapeId) => {
    const shape = editor.getShape(cardId);
    return shape && editor.isShapeOfType<LinkCardShape>(shape, LINK_CARD_TYPE)
      ? shape
      : null;
  };

  // Rings of cards since deleted are dropped. Not through
  // updateDocumentSettings, which keeps it out of undo.
  function setRings(cardId: TLShapeId, rings: CardRings) {
    const kept = Object.fromEntries(
      Object.entries(ringsByCard()).filter(([id]) =>
        editor.getShape(id as TLShapeId),
      ),
    );
    const settings = editor.getDocumentSettings();
    const meta = { ...settings.meta };
    delete meta[SEED_META_KEY];
    meta[RINGS_META_KEY] = {
      ...kept,
      [cardId]: rings,
    } as unknown as JsonObject;
    editor.store.put([{ ...settings, meta }]);
  }

  // Null for a card that has placed none
  function ringsOf(cardId: TLShapeId): CardRings | null {
    const card = linkCard(cardId);
    const rings = card && ringsByCard()[cardId];
    return rings && rings.url === card.props.url ? rings : null;
  }

  // Connected links not on the board, including ones a ring placed and that
  // were deleted since
  function waiting(url: string): string[] {
    const onBoard = new Set(deps.urlsOnBoard());
    const connections = deps.linkOf(url)?.connections ?? [];
    return connectedUrls(url, connections).filter(
      (other) => !onBoard.has(other),
    );
  }

  function unplaced(cardId: TLShapeId): string[] {
    const card = linkCard(cardId);
    return card ? waiting(card.props.url) : [];
  }

  const tallestOf = (urls: string[]) =>
    Math.max(0, ...urls.map(deps.cardHeight));

  // The next ring out round url, fetched. A first ring is kept clear of the
  // card in the middle too.
  async function planRing(
    url: string,
    rings: () => CardRings | null,
    onFetching?: (count: number) => void,
  ): Promise<PlannedRing | null> {
    const before = rings();
    const waitingBefore = waiting(url);
    const guess = nextRing(before?.outermost ?? null, waitingBefore.length, 0);
    const candidates = waitingBefore.slice(0, guess.size);
    if (candidates.length === 0) return null;
    onFetching?.(candidates.length);
    await deps.fetchLinks(candidates);
    // Skips any put on the board while they were fetched
    const after = rings();
    const fetched = waiting(url).filter((other) => candidates.includes(other));
    const inner = after?.outermost ?? null;
    const ring = nextRing(
      inner,
      fetched.length,
      tallestOf(inner ? fetched : [url, ...fetched]),
    );
    const urls = fetched.slice(0, ring.size);
    if (urls.length === 0) return null;
    return { urls, ring };
  }

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
    const planned = await planRing(
      url,
      () => null,
      (count) => deps.onProgress({ step: 'ring', count }),
    );
    if (!deps.canPlace()) return;
    const middle = editor.getViewportPageBounds().center;
    // The board's starting point, which undo doesn't take back
    let cardId: TLShapeId | null = null;
    editor.run(
      () => {
        const at = planned ? ringAround(middle, planned.ring) : [];
        [cardId] = deps.placeLinks([
          { url, at: middle },
          ...(planned?.urls ?? []).map((other, i) => ({
            url: other,
            at: at[i],
          })),
        ]);
        if (planned) {
          setRings(cardId, {
            url,
            outermost: planned.ring,
          });
        }
      },
      { history: 'ignore' },
    );
    const bounds = editor.getCurrentPageBounds();
    if (bounds) editor.zoomToBounds(bounds, { targetZoom: 1, immediate: true });
    // Its popup offers the rest
    if (cardId && unplaced(cardId).length > 0) editor.select(cardId);
    // The links are placed, so failing this isn't a failed seed
    await deps
      .rename(link.metadata.title?.trim() || getDomain(url))
      .catch(console.warn);
  }

  // The next ring out from the card's outermost, however much room the rings
  // inside it have, round the card where it is now. One step of undo.
  async function placeMore(cardId: TLShapeId) {
    const card = linkCard(cardId);
    if (!card || !deps.canPlace()) return;
    const { url } = card.props;
    const planned = await planRing(url, () => ringsOf(cardId));
    if (!planned || !deps.canPlace() || !linkCard(cardId)) return;
    const middle = editor.getShapePageBounds(cardId)!.center;
    const at = ringAround(middle, planned.ring);
    editor.markHistoryStoppingPoint('place connected links');
    editor.run(() => {
      deps.placeLinks(
        planned.urls.map((other, i) => ({ url: other, at: at[i] })),
      );
      setRings(cardId, {
        url,
        outermost: planned.ring,
      });
    });
  }

  return { ringsOf, unplaced, seed, placeMore };
}

export type LinkSeed = ReturnType<typeof attachLinkSeed>;
