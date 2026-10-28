import type { QueryClient } from '@tanstack/react-query';
import {
  createShapeId,
  toRichText,
  type Editor,
  type TLShapeId,
  type VecLike,
} from 'tldraw';
import { canvasKeys } from '../lib/canvasKeys';
import {
  LINK_CARD_TYPE,
  LINK_CARD_WIDTH,
  linkCardLayout,
  linkCardParts,
  linkKey,
} from '../model/linkCards';
import {
  linkQuery,
  type CanvasServer,
  type LinkInfo,
} from '../server/canvasServer';
import type { LinkCardShape } from '../shapes/linkCard/LinkCardShapeUtil';
import type { CanvasStorage, KnownLinks } from '../storage/canvasStorage';

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

function linkCardsOn(editor: Editor) {
  return editor
    .getCurrentPageShapes()
    .filter((shape): shape is LinkCardShape => shape.type === LINK_CARD_TYPE);
}

// Places links and notes pasted or dropped on the board, and keeps each link
// card sized to its link
export function attachLinkCards(deps: LinkCardsDeps) {
  const { editor, queryClient } = deps;
  // Each link as last fetched. Kept apart from the query cache, which drops
  // links no card has shown for a while.
  const known: KnownLinks = {};
  const linkOf = (url: string) =>
    queryClient.getQueryData<LinkInfo>(canvasKeys.link(url)) ??
    known[url]?.link;
  const cardHeight = (url: string) =>
    linkCardLayout(linkCardParts(linkOf(url))).height;
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
    const resized = loaded
      .filter((card) => card.props.h !== cardHeight(card.props.url))
      .map((card) => {
        const h = cardHeight(card.props.url);
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
      queryClient.setQueryData(canvasKeys.link(url), last.link, {
        updatedAt: last.fetchedAt,
      });
    }
  }

  function fetchLinks(urls: string[]) {
    for (const url of urls) {
      void queryClient.prefetchQuery(linkQuery(deps.server, url));
    }
  }

  const unwatchLinks = queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated') return;
    const url = event.query.meta?.linkUrl;
    if (typeof url !== 'string' || !boardUrls().includes(url)) return;
    // Saves elsewhere in the webapp invalidate links; cards fetch only while
    // they're mounted, so the board fetches them itself
    if (event.action.type === 'invalidate') return fetchLinks([url]);
    if (event.action.type !== 'success') return;
    const { data, dataUpdatedAt } = event.query.state;
    known[url] = { link: data as LinkInfo, fetchedAt: dataUpdatedAt };
    sizeCards([url]);
    knownLinksTimer ??= setTimeout(
      () => void saveKnownLinks(),
      KNOWN_LINKS_THROTTLE_MS,
    );
  });

  // Pasted at the centre of the view, dropped at the drop point
  const centredAt = (point: VecLike | undefined, w: number, h: number) => {
    const at = point ?? editor.getViewportPageBounds().center;
    return { x: at.x - w / 2, y: at.y - h / 2 };
  };

  function placeLink(url: string, point: VecLike | undefined) {
    const id = createShapeId();
    const h = cardHeight(url);
    if (!linkOf(url)) placedUnsized.add(id);
    editor.markHistoryStoppingPoint('place link');
    editor.createShape<LinkCardShape>({
      id,
      type: LINK_CARD_TYPE,
      ...centredAt(point, LINK_CARD_WIDTH, h),
      props: { url, h },
    });
    fetchLinks([url]);
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
        .filter((card) => card.props.h !== cardHeight(card.props.url))
        .map((card) => card.props.url);
      if (urls.length > 0) sizeCards(urls);
    },
    { scope: 'document', source: 'user' },
  );

  return {
    // Before the board's document loads, so its cards first paint from them
    showKnownLinks,
    // Once the board has loaded
    refresh() {
      sizeCards(boardUrls());
      fetchLinks(boardUrls());
    },
    detach() {
      for (const type of ['url', 'text', 'files', 'svg-text'] as const) {
        editor.registerExternalContentHandler(type, null);
      }
      unwatchLinks();
      unlistenSizes();
      return knownLinksTimer ? saveKnownLinks() : Promise.resolve();
    },
  };
}
