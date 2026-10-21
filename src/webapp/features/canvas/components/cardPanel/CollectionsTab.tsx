import type { Editor } from 'tldraw';
import { BiCollection } from 'react-icons/bi';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import useSembleCollections from '@/features/collections/lib/queries/useSembleCollections';
import type { CardShape } from '../../shapes/cardShape/CardShapeUtil';
import { PanelCollectionItem } from '../panelCardItem/PanelCardItem';

interface Props {
  editor: Editor;
  card: CardShape;
}

export default function CollectionsTab(props: Props) {
  const collections = useSembleCollections({ url: props.card.props.url });
  const items = collections.data.pages.flatMap((p) => p.collections);

  if (!items.length) {
    return (
      <EmptyState message="Not in any collection yet" icon={BiCollection} />
    );
  }

  return (
    <InfiniteScroll
      dataLength={items.length}
      hasMore={!!collections.hasNextPage}
      isInitialLoading={collections.isPending}
      isLoading={collections.isFetchingNextPage}
      loadMore={collections.fetchNextPage}
      hideEndIndicator
    >
      {items.map((c) => (
        <PanelCollectionItem key={c.id} editor={props.editor} collection={c}>
          <CollectionCard collection={c} showAuthor />
        </PanelCollectionItem>
      ))}
    </InfiniteScroll>
  );
}
