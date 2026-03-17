'use client';

import useUserConnections from '@/features/connections/lib/queries/useUserConnections';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Grid, Group, Stack } from '@mantine/core';
import ProfileEmptyTab from '../../components/profileEmptyTab/ProfileEmptyTab';
import { BiLink } from 'react-icons/bi';
import { useDisclosure } from '@mantine/hooks';
import AddConnectionModal from '@/features/connections/components/addConnectionModal/AddConnectionModal';
import { ConnectionFilters } from '@/features/connections/components/connectionFilters/ConnectionFilters';
import { useState } from 'react';
import {
  ConnectionType,
  ConnectionWithSourceAndTarget,
  User,
} from '@semble/types';
import ProfileConnectionItem from '@/features/connections/components/profileConnectionItem/ProfileConnectionItem';
import useProfile from '../../lib/queries/useProfile';

interface Props {
  identifier: string;
}

export default function ProfileConnectionsContainer(props: Props) {
  const { data: profile } = useProfile({ didOrHandle: props.identifier });

  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  const [connectionType, setConnectionType] = useState<ConnectionType | null>(
    null,
  );
  const [connectionToEdit, setConnectionToEdit] = useState<{
    connection: ConnectionWithSourceAndTarget['connection'] & {
      curator: User;
    };
    sourceUrl: string;
    targetUrl: string;
  } | null>(null);

  const handleOpenEditModal = (connection: ConnectionWithSourceAndTarget) => {
    setConnectionToEdit({
      connection: {
        ...connection.connection,
        curator: profile,
      },
      sourceUrl: connection.source.url,
      targetUrl: connection.target.url,
    });
    openModal();
  };

  const handleCloseModal = () => {
    setConnectionToEdit(null);
    closeModal();
  };

  const connectionTypes = connectionType ? [connectionType] : undefined;

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useUserConnections({
    identifier: props.identifier,
    connectionTypes,
  });

  const allConnections =
    data?.pages.flatMap((page) => page.connections ?? []) ?? [];

  if (error) {
    return (
      <ProfileEmptyTab message="Error loading connections" icon={BiLink} />
    );
  }

  return (
    <>
      <Stack gap={'md'} align="center">
        <Group justify="flex-start" w={'100%'} maw={600}>
          <ConnectionFilters.Root
            connectionType={connectionType}
            onConnectionTypeChange={setConnectionType}
          >
            <ConnectionFilters.ConnectionTypeFilter />
          </ConnectionFilters.Root>
        </Group>

        {allConnections.length === 0 && !isPending ? (
          <ProfileEmptyTab message="No connections found" icon={BiLink} />
        ) : (
          <InfiniteScroll
            dataLength={allConnections.length}
            hasMore={!!hasNextPage}
            isInitialLoading={isPending}
            isLoading={isFetchingNextPage}
            loadMore={fetchNextPage}
          >
            <Grid gutter="sm" mx={'auto'} maw={600} w={'100%'}>
              {allConnections.map((connection, index) => (
                <Grid.Col key={`connection-${index}`} span={12}>
                  <ProfileConnectionItem
                    connection={connection}
                    curator={profile}
                    onEdit={() => handleOpenEditModal(connection)}
                  />
                </Grid.Col>
              ))}
            </Grid>
          </InfiniteScroll>
        )}
      </Stack>

      {connectionToEdit && (
        <AddConnectionModal
          isOpen={modalOpened}
          onClose={handleCloseModal}
          sourceUrl={connectionToEdit.sourceUrl}
          connectionToEdit={{
            connection: connectionToEdit.connection,
            targetUrl: connectionToEdit.targetUrl,
          }}
        />
      )}
    </>
  );
}
