import { AnnotationCardView } from '../../../cards/domain/ICardQueryRepository';

/**
 * Selector rows as the wire shape — only TextQuoteSelectors exist today, so
 * the literal is safe.
 */
export function toWireSelectors(
  selectors: Array<{
    type: string;
    exact: string;
    prefix?: string;
    suffix?: string;
  }>,
) {
  return selectors.map((selector) => ({
    ...selector,
    type: 'TextQuoteSelector' as const,
  }));
}

/** AnnotationCardView + author profile as the wire AnnotationCard shape */
export function toAnnotationCardDTO(view: AnnotationCardView, author: any) {
  return {
    id: view.id,
    type: 'ANNOTATION' as const,
    url: view.url,
    cid: view.cid,
    uri: view.uri,
    libraryCount: view.libraryCount,
    connectionCount: view.connectionCount,
    selectors: toWireSelectors(view.selectors),
    note: view.note,
    createdAt: view.createdAt.toISOString(),
    updatedAt: view.updatedAt.toISOString(),
    author,
  };
}
