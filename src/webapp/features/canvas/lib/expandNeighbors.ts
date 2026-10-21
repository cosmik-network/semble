import { Editor, TLShapeId } from 'tldraw';
import { getConnectionsForUrl } from '@/features/connections/lib/dal';
import { EXPAND_LIMIT } from '../const';
import { addCardsNear } from './cardOps';

export type ExpandDirection = 'forward' | 'backward';

// Places the cards connected to a card beside it; arrows follow from reconciliation
export async function expandNeighbors(
  editor: Editor,
  anchorId: TLShapeId,
  url: string,
  direction: ExpandDirection,
) {
  const res = await getConnectionsForUrl({
    url,
    direction,
    limit: EXPAND_LIMIT,
  });
  const seen = new Set<string>();
  const items = res.connections.flatMap((c) => {
    const other = direction === 'forward' ? c.target : c.source;
    if (other.url === url || seen.has(other.url)) return [];
    seen.add(other.url);
    return [{ url: other.url, metadata: other.metadata }];
  });
  const added = addCardsNear(
    editor,
    anchorId,
    items,
    direction === 'forward' ? 'right' : 'left',
  );
  return {
    found: items.length,
    added: added.length,
    hasMore: res.pagination.hasMore,
  };
}
