import type { Editor } from 'tldraw';
import { LuSparkles } from 'react-icons/lu';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import useSimilarCards from '@/features/semble/lib/queries/useSimilarCards';
import type { CardShape } from '../../shapes/cardShape/CardShapeUtil';
import { PanelUrlCardItem } from '../panelCardItem/PanelCardItem';

interface Props {
  editor: Editor;
  card: CardShape;
}

export default function SimilarTab(props: Props) {
  const similar = useSimilarCards({ url: props.card.props.url });
  const urls = similar.data.pages.flatMap((p) => p.urls);

  if (!urls.length) {
    return <EmptyState message="No similar cards found" icon={LuSparkles} />;
  }

  return (
    <InfiniteScroll
      dataLength={urls.length}
      hasMore={!!similar.hasNextPage}
      isInitialLoading={similar.isPending}
      isLoading={similar.isFetchingNextPage}
      loadMore={similar.fetchNextPage}
      hideEndIndicator
    >
      {urls.map((u) => (
        <PanelUrlCardItem
          key={u.url}
          editor={props.editor}
          url={u.url}
          metadata={u.metadata}
          anchorId={props.card.id}
        >
          <SimilarUrlCard urlView={u} />
        </PanelUrlCardItem>
      ))}
    </InfiniteScroll>
  );
}
