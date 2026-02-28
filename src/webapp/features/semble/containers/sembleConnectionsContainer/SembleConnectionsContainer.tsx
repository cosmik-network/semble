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
import { useSearchParams } from 'next/navigation';

type ConnectionTypeEnum =
  | 'SUPPORTS'
  | 'OPPOSES'
  | 'ADDRESSES'
  | 'HELPFUL'
  | 'LEADS_TO'
  | 'RELATED'
  | 'SUPPLEMENT'
  | 'EXPLAINER';

interface Props {
  url: string;
}

export default function SembleConnectionsContainer(props: Props) {
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const searchParams = useSearchParams();

  const direction =
    (searchParams.get('direction') as 'outgoing' | 'incoming') ?? 'outgoing';
  const connectionTypeParam = searchParams.get('connectionType');
  const connectionTypes = connectionTypeParam
    ? [connectionTypeParam as ConnectionTypeEnum]
    : undefined;

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
            <DirectionToggle />
            <ConnectionFilters.Root>
              <ConnectionFilters.ConnectionTypeFilter />
            </ConnectionFilters.Root>
          </Group>
          <Button
            leftSection={<IoMdAdd size={18} />}
            onClick={openDrawer}
            size="sm"
          >
            Add connection
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
            <Grid gutter="sm" mx={'auto'} maw={600} w={'100%'}>
              {connections.map((connectionForUrl, index) => (
                <Grid.Col key={`${direction}-${index}`} span={12}>
                  <ConnectionItem
                    connectionForUrl={connectionForUrl}
                    direction={
                      direction === 'outgoing' ? 'forward' : 'backward'
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
        onClose={closeDrawer}
        sourceUrl={props.url}
      />
    </>
  );
}
