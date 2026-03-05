'use client';

import useForwardConnections from '@/features/connections/lib/queries/useForwardConnections';
import useBackwardConnections from '@/features/connections/lib/queries/useBackwardConnections';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Button, Grid, Group, Stack } from '@mantine/core';
import SembleConnectionsContainerError from './Error.SembleConnectionsContainer';
import ConnectionItem from '@/features/connections/components/connectionItem/ConnectionItem';
import SembleEmptyTab from '../../components/sembleEmptyTab/SembleEmptyTab';
import { BiLink } from 'react-icons/bi';
import { IoMdAdd } from 'react-icons/io';
import { useDisclosure } from '@mantine/hooks';
import AddConnectionDrawer from '@/features/connections/components/addConnectionDrawer/AddConnectionDrawer';
import { ConnectionFilters } from '@/features/connections/components/connectionFilters/ConnectionFilters';
import DirectionToggle from '@/features/connections/components/connectionFilters/DirectionToggle';
import { useState } from 'react';
import { ConnectionType, ConnectionForUrl } from '@semble/types';
import { LuGitCompareArrows } from 'react-icons/lu';

type Direction = 'outgoing' | 'incoming';

interface Props {
  url: string;
}

export default function SembleConnectionsContainer(props: Props) {
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);

  const [direction, setDirection] = useState<Direction>('outgoing');
  const [connectionType, setConnectionType] = useState<ConnectionType | null>(
    null,
  );
  const [connectionToEdit, setConnectionToEdit] = useState<{
    connection: ConnectionForUrl['connection'];
    targetUrl: string;
  } | null>(null);

  const handleOpenCreateDrawer = () => {
    setConnectionToEdit(null);
    openDrawer();
  };

  const handleOpenEditDrawer = (
    connection: ConnectionForUrl['connection'],
    targetUrl: string,
  ) => {
    setConnectionToEdit({ connection, targetUrl });
    openDrawer();
  };

  const handleCloseDrawer = () => {
    setConnectionToEdit(null);
    closeDrawer();
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

  const allForwardConnections =
    forwardData?.pages.flatMap((page) => page.connections ?? []) ?? [];
  const allBackwardConnections =
    backwardData?.pages.flatMap((page) => page.connections ?? []) ?? [];

  if (forwardError || backwardError) {
    return <SembleConnectionsContainerError />;
  }

  const connections =
    direction === 'outgoing' ? allForwardConnections : allBackwardConnections;
  const fetchNextPage =
    direction === 'outgoing' ? fetchNextForward : fetchNextBackward;
  const hasNextPage =
    direction === 'outgoing' ? hasNextForward : hasNextBackward;
  const isFetchingNextPage =
    direction === 'outgoing' ? isFetchingNextForward : isFetchingNextBackward;
  const isPending =
    direction === 'outgoing' ? isPendingForward : isPendingBackward;

  return (
    <>
      <Stack gap={'md'} align="center">
        <Group justify="space-between" w={'100%'} maw={600}>
          <Group gap={'xs'}>
            <DirectionToggle value={direction} onChange={setDirection} />
            <ConnectionFilters.Root
              connectionType={connectionType}
              onConnectionTypeChange={setConnectionType}
            >
              <ConnectionFilters.ConnectionTypeFilter />
            </ConnectionFilters.Root>
          </Group>
          <Button
            leftSection={<LuGitCompareArrows size={18} />}
            onClick={handleOpenCreateDrawer}
            size="sm"
            color="pink"
          >
            Connect
          </Button>
        </Group>

        {connections.length === 0 && !isPending ? (
          <SembleEmptyTab
            message={`No ${direction} connections found`}
            icon={BiLink}
          />
        ) : (
          <InfiniteScroll
            dataLength={connections.length}
            hasMore={!!hasNextPage}
            isInitialLoading={isPending}
            isLoading={isFetchingNextPage}
            loadMore={fetchNextPage}
          >
            <Grid gutter="60" mx={'auto'} maw={600} w={'100%'}>
              {connections.map((connectionForUrl, index) => (
                <Grid.Col key={`${direction}-${index}`} span={12}>
                  <ConnectionItem
                    connectionForUrl={connectionForUrl}
                    direction={
                      direction === 'outgoing' ? 'forward' : 'backward'
                    }
                    onEdit={() =>
                      handleOpenEditDrawer(
                        connectionForUrl.connection,
                        connectionForUrl.url.url,
                      )
                    }
                  />
                </Grid.Col>
              ))}
            </Grid>
          </InfiniteScroll>
        )}
      </Stack>

      <AddConnectionDrawer
        isOpen={drawerOpened}
        onClose={handleCloseDrawer}
        sourceUrl={props.url}
        connectionToEdit={connectionToEdit || undefined}
      />
    </>
  );
}
