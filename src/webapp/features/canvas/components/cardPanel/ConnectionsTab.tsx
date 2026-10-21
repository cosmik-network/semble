import type { Editor } from 'tldraw';
import { LuWaypoints } from 'react-icons/lu';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Stack } from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import ConnectionStatus from '@/features/connections/components/connectionItem/ConnectionStatus';
import useAllConnections from '@/features/connections/lib/queries/useAllConnections';
import type { CardShape } from '../../shapes/cardShape/CardShapeUtil';
import { PanelUrlCardItem } from '../panelCardItem/PanelCardItem';

interface Props {
  editor: Editor;
  card: CardShape;
}

export default function ConnectionsTab(props: Props) {
  const url = props.card.props.url;
  const connections = useAllConnections({ url });
  const items = connections.data.pages.flatMap((p) => p.connections);

  if (!items.length) {
    return (
      <EmptyState
        message="No connections yet"
        description="Drag from a card's edge to connect it"
        icon={LuWaypoints}
      />
    );
  }

  return (
    <InfiniteScroll
      dataLength={items.length}
      hasMore={!!connections.hasNextPage}
      isInitialLoading={connections.isPending}
      isLoading={connections.isFetchingNextPage}
      loadMore={connections.fetchNextPage}
      hideEndIndicator
    >
      {items.map((c) => {
        const outgoing = c.source.url === url;
        const other = outgoing ? c.target : c.source;
        return (
          <Stack key={c.connection.id} gap="xs">
            <ConnectionStatus
              connection={c.connection}
              source={c.source}
              target={c.target}
            />
            <PanelUrlCardItem
              editor={props.editor}
              url={other.url}
              metadata={other.metadata}
              anchorId={props.card.id}
              side={outgoing ? 'right' : 'left'}
            >
              <UrlCard
                id={other.url}
                url={other.url}
                cardContent={other.metadata}
                urlLibraryCount={other.urlLibraryCount}
                urlIsInLibrary={other.urlInLibrary ?? false}
                urlConnectionCount={other.urlConnectionCount ?? 0}
                urlIsConnected={other.urlIsConnected}
              />
            </PanelUrlCardItem>
          </Stack>
        );
      })}
    </InfiniteScroll>
  );
}
