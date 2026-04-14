'use client';

import useForwardConnections from '@/features/connections/lib/queries/useForwardConnections';
import useBackwardConnections from '@/features/connections/lib/queries/useBackwardConnections';
import useAllConnections from '@/features/connections/lib/queries/useAllConnections';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Grid, Group, Stack } from '@mantine/core';
import ConnectionsContainerError from './Error.ConnectionsContainer';
import ConnectionItem from '@/features/connections/components/connectionItem/ConnectionItem';
import SembleEmptyTab from '@/features/semble/components/sembleEmptyTab/SembleEmptyTab';
import { BiLink } from 'react-icons/bi';
import { useDisclosure } from '@mantine/hooks';
import { ConnectionFilters } from '@/features/connections/components/connectionFilters/ConnectionFilters';
import DirectionToggle from '@/features/connections/components/connectionFilters/DirectionToggle';
import { useState } from 'react';
import { ConnectionType, ConnectionWithSourceAndTarget } from '@semble/types';
import EditConnectionModal from '@/features/connections/components/editConnectionModal/EditConnectionModal';

type Direction = 'to' | 'from' | 'all';

interface Props {
  url: string;
}

export default function ConnectionsContainer(props: Props) {
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  const [direction, setDirection] = useState<Direction>('all');
  const [connectionType, setConnectionType] = useState<ConnectionType | null>(
    null,
  );
  const [connectionToEdit, setConnectionToEdit] = useState<{
    connection: ConnectionWithSourceAndTarget['connection'];
    targetUrl: string;
  } | null>(null);

  const handleOpenEditModal = (
    connection: ConnectionWithSourceAndTarget['connection'],
    targetUrl: string,
  ) => {
    setConnectionToEdit({ connection, targetUrl });
    openModal();
  };

  const handleCloseModal = () => {
    setConnectionToEdit(null);
    closeModal();
  };

  const connectionTypes = connectionType ? [connectionType] : undefined;

  const {
    data: forwardData,
    error: forwardError,
    fetchNextPage: fetchNextForward,
    hasNextPage: hasNextForward,
    isFetchingNextPage: isFetchingNextForward,
    isPending: isPendingForward,
  } = useForwardConnections({
    url: props.url,
    connectionTypes,
  });

  const {
    data: backwardData,
    error: backwardError,
    fetchNextPage: fetchNextBackward,
    hasNextPage: hasNextBackward,
    isFetchingNextPage: isFetchingNextBackward,
    isPending: isPendingBackward,
  } = useBackwardConnections({
    url: props.url,
    connectionTypes,
  });

  const {
    data: allData,
    error: allError,
    fetchNextPage: fetchNextAll,
    hasNextPage: hasNextAll,
    isFetchingNextPage: isFetchingNextAll,
    isPending: isPendingAll,
  } = useAllConnections({
    url: props.url,
    connectionTypes,
  });

  const allForwardConnections =
    forwardData?.pages.flatMap((page) => page.connections ?? []) ?? [];
  const allBackwardConnections =
    backwardData?.pages.flatMap((page) => page.connections ?? []) ?? [];
  const allConnections =
    allData?.pages.flatMap((page) => page.connections ?? []) ?? [];

  const emptyMessage =
    direction === 'all'
      ? 'No connections found'
      : `No connections found ${direction} this link`;

  if (forwardError || backwardError || allError) {
    return <ConnectionsContainerError />;
  }

  const connections =
    direction === 'to'
      ? allForwardConnections
      : direction === 'from'
        ? allBackwardConnections
        : allConnections;
  const fetchNextPage =
    direction === 'to'
      ? fetchNextForward
      : direction === 'from'
        ? fetchNextBackward
        : fetchNextAll;
  const hasNextPage =
    direction === 'to'
      ? hasNextForward
      : direction === 'from'
        ? hasNextBackward
        : hasNextAll;
  const isFetchingNextPage =
    direction === 'to'
      ? isFetchingNextForward
      : direction === 'from'
        ? isFetchingNextBackward
        : isFetchingNextAll;
  const isPending =
    direction === 'to'
      ? isPendingForward
      : direction === 'from'
        ? isPendingBackward
        : isPendingAll;

  return (
    <>
      <Stack gap={'md'} align="center">
        <Group justify="space-between" w={'100%'} maw={600}>
          <DirectionToggle value={direction} onChange={setDirection} />
          <ConnectionFilters.Root
            connectionType={connectionType}
            onConnectionTypeChange={setConnectionType}
          >
            <ConnectionFilters.ConnectionTypeFilter />
          </ConnectionFilters.Root>
        </Group>

        {connections.length === 0 && !isPending ? (
          <SembleEmptyTab message={emptyMessage} icon={BiLink} />
        ) : (
          <InfiniteScroll
            dataLength={connections.length}
            hasMore={!!hasNextPage}
            isInitialLoading={isPending}
            isLoading={isFetchingNextPage}
            loadMore={fetchNextPage}
          >
            <Grid gap="xl" mx={'auto'} maw={600} w={'100%'}>
              {connections.map((connection, index) => {
                // Determine the actual direction for this specific connection
                // If direction is 'all', check if the source URL matches props.url
                const isForward =
                  direction === 'all'
                    ? connection.source.url === props.url
                    : direction === 'to';
                const connectionDirection = isForward ? 'forward' : 'backward';
                const targetUrl = isForward
                  ? connection.target.url
                  : connection.source.url;

                return (
                  <Grid.Col key={`${direction}-${index}`} span={12}>
                    <ConnectionItem
                      connection={connection}
                      direction={connectionDirection}
                      onEdit={() => {
                        handleOpenEditModal(connection.connection, targetUrl);
                      }}
                    />
                  </Grid.Col>
                );
              })}
            </Grid>
          </InfiniteScroll>
        )}
      </Stack>

      <EditConnectionModal
        isOpen={modalOpened}
        onClose={handleCloseModal}
        sourceUrl={props.url}
        targetUrl={connectionToEdit?.targetUrl}
        connection={connectionToEdit?.connection}
      />
    </>
  );
}
