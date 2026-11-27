import { AnnotationCardView } from '../../../cards/domain/ICardQueryRepository';
import { AnnotationSearchResultView } from '@semble/types';

/**
 * AnnotationCardView + author profile + similarity as the wire
 * AnnotationSearchResultView shape. Selector rows as the wire shape — only
 * TextQuoteSelectors exist today, so the literal is safe.
 */
export function toAnnotationSearchResultDTO(
  view: AnnotationCardView,
  author: AnnotationSearchResultView['author'],
  similarity: number,
): AnnotationSearchResultView {
  return {
    id: view.id,
    cardType: 'ANNOTATION',
    type: 'ANNOTATION',
    url: view.url,
    cid: view.cid,
    uri: view.uri,
    libraryCount: view.libraryCount,
    connectionCount: view.connectionCount,
    selectors: view.selectors.map((selector) => ({
      ...selector,
      type: 'TextQuoteSelector' as const,
    })),
    note: view.note,
    createdAt: view.createdAt.toISOString(),
    updatedAt: view.updatedAt.toISOString(),
    author,
    similarity,
  };
}
