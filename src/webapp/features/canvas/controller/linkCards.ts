import { isCancelledError, type QueryClient } from '@tanstack/react-query';
import {
  createShapeId,
  type TLShapePartial,
  toRichText,
  type Editor,
  type TLShapeId,
  type VecLike,
} from 'tldraw';
import { canvasKeys } from '../lib/canvasKeys';
import { LINK_CHANGES_CHANNEL, type LinkChange } from '../lib/linkChanges';
import { createLineCounter } from '../lib/lineCounter';
import { jsonMeta } from '../lib/jsonMeta';
import type { FetchedConnections } from '../model/arrows';
import {
  ENTRY_META_KEY,
  LINK_CARD_TYPE,
  LINK_CARD_WIDTH,
  entryCardOf,
  linkCardHeight,
  linkCardParts,
  linkKey,
  type EntryCard,
} from '../model/linkCards';
import {
  linkQuery,
  type CanvasServer,
  type LinkInfo,
} from '../server/canvasServer';
import {
  linkCardsOn,
  type LinkCardShape,
} from '../shapes/linkCard/LinkCardShapeUtil';
import type { CanvasStorage, KnownLinks } from '../storage/canvasStorage';

// Whether a refresh reached the server and got an answer. Links that were
// fresh enough to skip, or whose fetch was dropped for a newer one, aren't
// either.
export type FetchOutcome = 'fetched' | 'failed' | 'nothing-fetched';

// A link card to place, centred at a point on the page
export interface LinkPlacement {
  url: string;
  at: VecLike;
  // Known before the card exists, for a frame to map its entries to
  id?: TLShapeId;
  // A collection entry's card, rather than the viewer's own
  entry?: { cardId: string; card: EntryCard };
}

export interface LinkCardsDeps {
  editor: Editor;
  server: CanvasServer;
  // The cards read their links from it
  queryClient: QueryClient;
  storage: CanvasStorage;
  canvasId: string;
  // Images and files were pasted or dropped, and left off the board
  onFilesRefused(): void;
}

// tldraw's notes are a fixed square
const NOTE_SIZE = 200;

// Saving last known links on every fetch would rewrite them once per link
const KNOWN_LINKS_THROTTLE_MS = 500;

// Places links and notes pasted or dropped on the board, and keeps each link
// card sized to its link.
export function attachLinkCards(
  deps: LinkCardsDeps,
  onLinkFetched: () => void,
) {
  const { editor, queryClient } = deps;
  // Each link as last fetched. Kept apart from the query cache, which drops
  // links no card has shown for a while.
  const known: KnownLinks = {};
  const linkOf = (url: string) =>
    queryClient.getQueryData<LinkInfo>(canvasKeys.link(url)) ??
    known[url]?.link;
  const lines = createLineCounter(editor);
  const cardHeight = (url: string, entry: EntryCard | null = null) =>
    linkCardHeight(linkCardParts(linkOf(url), lines.count, entry));
  const heightOf = (card: LinkCardShape) =>
    cardHeight(card.props.url, entryCardOf(card.meta));
  const boardUrls = () =>
    Array.from(new Set(linkCardsOn(editor).map((card) => card.props.url)));
  // Placed before their link loaded: they stay centred where they were put
  // when it does
  const placedUnsized = new Set<TLShapeId>();

  // Outside undo: it follows from what the server says, not from an edit.
  // Links not loaded yet keep the height they have.
  function sizeCards(urls: string[]) {
    const loaded = linkCardsOn(editor).filter(
      (card) => urls.includes(card.props.url) && linkOf(card.props.url),
    );
    const resized = loaded.flatMap((card) => {
      const h = heightOf(card);
      if (h === card.props.h) return [];
      const centred = placedUnsized.has(card.id);
      return {
        id: card.id,
        type: card.type,
        y: centred ? card.y + (card.props.h - h) / 2 : card.y,
        props: { h },
      };
    });
    loaded.forEach((card) => placedUnsized.delete(card.id));
    if (resized.length === 0) return;
    editor.run(() => editor.updateShapes(resized), { history: 'ignore' });
  }

  let knownLinksTimer: ReturnType<typeof setTimeout> | null = null;
  function saveKnownLinks() {
    if (knownLinksTimer) clearTimeout(knownLinksTimer);
    knownLinksTimer = null;
    const onBoard: KnownLinks = {};
    for (const url of boardUrls()) {
      if (known[url]) onBoard[url] = known[url];
    }
    return deps.storage
      .saveKnownLinks(deps.canvasId, onBoard)
      .catch(console.warn);
  }

  // A board shows what it last knew of its links until they're fetched again
  function showKnownLinks(links: KnownLinks) {
    Object.assign(known, links);
    for (const [url, last] of Object.entries(links)) {
      const cached = queryClient.getQueryState(canvasKeys.link(url));
      if (cached && cached.dataUpdatedAt >= last.fetchedAt) continue;
      // Built with its options first: their meta marks it as a link to watch
      queryClient
        .getQueryCache()
        .build(
          queryClient,
          queryClient.defaultQueryOptions(linkQuery(deps.server, url)),
        );
      queryClient.setQueryData(canvasKeys.link(url), last.link, {
        updatedAt: last.fetchedAt,
      });
    }
  }

  const fetchedAt = (url: string) =>
    queryClient.getQueryState(canvasKeys.link(url))?.dataUpdatedAt;

  // Unless forced, links fetched within the last minute are left as they are
  async function fetchLinks(
    urls: string[],
    options: { force?: boolean } = {},
  ): Promise<FetchOutcome> {
    const outcomes = await Promise.all(
      urls.map(async (url): Promise<FetchOutcome> => {
        const before = fetchedAt(url);
        try {
          await queryClient.fetchQuery({
            ...linkQuery(deps.server, url),
            ...(options.force && { staleTime: 0 }),
          });
          return fetchedAt(url) === before ? 'nothing-fetched' : 'fetched';
        } catch (error) {
          return isCancelledError(error) ? 'nothing-fetched' : 'failed';
        }
      }),
    );
    if (outcomes.includes('fetched')) return 'fetched';
    if (outcomes.includes('failed')) return 'failed';
    return 'nothing-fetched';
  }

  // Drops any fetch under way, which may predate the change. Through the
  // query itself: refetchQueries skips a query whose only observer is
  // disabled, like a closed modal's.
  function refetchChanged(url: string) {
    queryClient
      .getQueryCache()
      .find({ queryKey: canvasKeys.link(url), exact: true })
      ?.fetch(undefined, { cancelRefetch: true })
      .catch(() => {});
  }

  const changedLinks = new BroadcastChannel(LINK_CHANGES_CHANNEL);
  // A save invalidates every link at once; they're sent together
  let changedUrls = new Set<string>();
  let announceTimer: ReturnType<typeof setTimeout> | null = null;
  function announceChanged(url: string) {
    changedUrls.add(url);
    announceTimer ??= setTimeout(() => {
      changedLinks.postMessage({
        urls: Array.from(changedUrls),
      } satisfies LinkChange);
      changedUrls = new Set();
      announceTimer = null;
    });
  }
  // Refetched rather than invalidated, which would announce them back
  changedLinks.onmessage = (event: MessageEvent<LinkChange>) => {
    const urls = (event.data.urls ?? []).map((url) => linkKey(url) ?? url);
    const connectionIds = event.data.connectionIds ?? [];
    const joinsChanged = (url: string) =>
      !!known[url]?.link.connections?.some(({ id }) =>
        connectionIds.includes(id),
      );
    boardUrls()
      .filter((url) => urls.includes(url) || joinsChanged(url))
      .forEach(refetchChanged);
  };

  function linkFetched(url: string, link: LinkInfo, fetchedAt: number) {
    // Connections that didn't load keep the board's arrows as they were
    known[url] = {
      link: {
        ...link,
        connections: link.connections ?? known[url]?.link.connections ?? null,
      },
      fetchedAt,
    };
    sizeCards([url]);
    onLinkFetched();
    knownLinksTimer ??= setTimeout(
      () => void saveKnownLinks(),
      KNOWN_LINKS_THROTTLE_MS,
    );
  }

  const unwatchLinks = queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated') return;
    const url = event.query.meta?.linkUrl;
    if (typeof url !== 'string' || !boardUrls().includes(url)) return;
    // Saves elsewhere in the webapp invalidate links. Cards on screen refetch
    // theirs; the board refetches the rest.
    if (event.action.type === 'invalidate') {
      announceChanged(url);
      if (!event.query.isActive()) refetchChanged(url);
      return;
    }
    if (event.action.type !== 'success') return;
    const { data, dataUpdatedAt } = event.query.state;
    linkFetched(url, data as LinkInfo, dataUpdatedAt);
  });

  // Pasted at the centre of the view, dropped at the drop point
  const centredAt = (point: VecLike | undefined, w: number, h: number) => {
    const at = point ?? editor.getViewportPageBounds().center;
    return { x: at.x - w / 2, y: at.y - h / 2 };
  };

  function urlsInView() {
    const view = editor.getViewportPageBounds();
    const inView = linkCardsOn(editor).filter((card) =>
      view.collides(editor.getShapePageBounds(card)!),
    );
    return Array.from(new Set(inView.map((card) => card.props.url)));
  }

  // The new cards' ids, in the order given
  function createLinkCards(places: LinkPlacement[]) {
    const cards = places.map((place): TLShapePartial<LinkCardShape> => {
      const id = place.id ?? createShapeId();
      const h = cardHeight(place.url, place.entry?.card);
      if (!linkOf(place.url)) placedUnsized.add(id);
      return {
        id,
        type: LINK_CARD_TYPE,
        ...centredAt(place.at, LINK_CARD_WIDTH, h),
        props: { url: place.url, h, cardId: place.entry?.cardId ?? null },
        ...(place.entry && {
          meta: { [ENTRY_META_KEY]: jsonMeta(place.entry.card) },
        }),
      };
    });
    editor.createShapes(cards);
    return cards.map((card) => card.id);
  }

  function placeLink(url: string, point: VecLike | undefined) {
    editor.markHistoryStoppingPoint('place link');
    createLinkCards([
      { url, at: point ?? editor.getViewportPageBounds().center },
    ]);
    void fetchLinks([url]);
  }

  // Each centred where given, as part of whatever history step the caller
  // runs it in. Links fetched before they were on the board are taken as
  // fetched now.
  function placeLinks(places: LinkPlacement[]) {
    const ids = createLinkCards(places);
    for (const { url } of places) {
      const state = queryClient.getQueryState<LinkInfo>(canvasKeys.link(url));
      if (state?.data) linkFetched(url, state.data, state.dataUpdatedAt);
    }
    void fetchLinks(places.map((place) => place.url));
    return ids;
  }

  function placeNote(text: string, point: VecLike | undefined) {
    editor.markHistoryStoppingPoint('place note');
    editor.createShape({
      type: 'note',
      ...centredAt(point, NOTE_SIZE, NOTE_SIZE),
      props: { richText: toRichText(text) },
    });
  }

  // Pasted or dropped text that holds a link places the link. tldraw already
  // passes most links as urls; this catches ones with whitespace around them.
  function place(text: string, point: VecLike | undefined) {
    if (editor.getIsReadonly() || !text.trim()) return;
    const url = linkKey(text);
    if (url) placeLink(url, point);
    else placeNote(text, point);
  }

  // No asset store, so images and files have nowhere to go
  const refuseFiles = async () => {
    if (!editor.getIsReadonly()) deps.onFilesRefused();
  };
  editor.registerExternalContentHandler('url', async (content) =>
    place(content.url, content.point),
  );
  editor.registerExternalContentHandler('text', async (content) =>
    place(content.text, content.point),
  );
  editor.registerExternalContentHandler('files', refuseFiles);
  editor.registerExternalContentHandler('svg-text', refuseFiles);

  // Undo and redo bring back cards at the height they had then
  const unlistenSizes = editor.store.listen(
    ({ changes }) => {
      const cards = [
        ...Object.values(changes.added),
        ...Object.values(changes.updated).map(([, to]) => to),
      ].filter(
        (record): record is LinkCardShape =>
          record.typeName === 'shape' && record.type === LINK_CARD_TYPE,
      );
      const urls = cards
        .filter((card) => card.props.h !== heightOf(card))
        .map((card) => card.props.url);
      if (urls.length > 0) sizeCards(urls);
    },
    { scope: 'document', source: 'user' },
  );

  // Text measured in a fallback font is measured again once the app's loads.
  // tldraw loads its own fonts for its shapes, which cards don't use.
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
  const remeasure = (event: FontFaceSetLoadEvent) => {
    if (event.fontfaces.every((font) => font.family.startsWith('tldraw'))) {
      return;
    }
    lines.forget();
    sizeCards(boardUrls());
  };
  fonts?.addEventListener('loadingdone', remeasure);

  return {
    // Before the board's document loads, so its cards first paint from them
    showKnownLinks,
    placeLink,
    placeLinks,
    linkOf,
    cardHeight,
    countLines: lines.count,
    // Once the board has loaded
    sizeAll: () => sizeCards(boardUrls()),
    fetchLinks,
    boardUrls,
    // Links whose connections never loaded, or were saved before links
    // carried them, are left out
    fetchedConnections: () =>
      new Map<string, FetchedConnections>(
        boardUrls()
          .filter((url) => known[url]?.link.connections)
          .map((url) => [
            url,
            {
              connections: known[url].link.connections!,
              fetchedAt: known[url].fetchedAt,
            },
          ]),
      ),
    urlsInView,
    detach() {
      fonts?.removeEventListener('loadingdone', remeasure);
      for (const type of ['url', 'text', 'files', 'svg-text'] as const) {
        editor.registerExternalContentHandler(type, null);
      }
      unwatchLinks();
      unlistenSizes();
      if (announceTimer) clearTimeout(announceTimer);
      changedLinks.close();
      return knownLinksTimer ? saveKnownLinks() : Promise.resolve();
    },
  };
}
