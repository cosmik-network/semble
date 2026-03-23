import type { ConnectionCreatedFeedItem } from '@/api-client';
import { ActivityType } from '@/api-client';
import { ActionIcon, Menu, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import FeedActivityStatus from '../feedActivityStatus/FeedActivityStatus';
import ConnectionCard from '@/features/connections/components/connectionCard/ConnectionCard';
import EditConnectionModal from '@/features/connections/components/editConnectionModal/EditConnectionModal';
import DeleteConnectionModal from '@/features/connections/components/deleteConnectionModal/DeleteConnectionModal';
import { useAuth } from '@/hooks/useAuth';
import { MdEdit } from 'react-icons/md';
import { BsThreeDots, BsTrash2Fill } from 'react-icons/bs';
import { Fragment, useState } from 'react';

interface Props {
  item: ConnectionCreatedFeedItem;
}

export default function ConnectionFeedItem(props: Props) {
  const { user } = useAuth();
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [editOpened, { open: openEdit, close: closeEdit }] =
    useDisclosure(false);
  const isOwner = user && user.id === props.item.user.id;

  return (
    <Fragment>
      <Stack gap={'xs'} align="stretch" h={'100%'}>
        <FeedActivityStatus
          user={props.item.user}
          activityType={ActivityType.CONNECTION_CREATED}
          createdAt={props.item.createdAt}
          note={props.item.connection.connection.note ?? undefined}
          actions={
            isOwner ? (
              <Menu shadow="md" width={200} position="bottom-end">
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    color={'gray'}
                    radius={'xl'}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <BsThreeDots size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<MdEdit size={16} />}
                    onClick={openEdit}
                  >
                    Edit
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<BsTrash2Fill />}
                    color="red"
                    onClick={() => setDeleteOpened(true)}
                  >
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : undefined
          }
        />
        <ConnectionCard connection={props.item.connection} />
      </Stack>

      <EditConnectionModal
        isOpen={editOpened}
        onClose={closeEdit}
        sourceUrl={props.item.connection.source.url}
        targetUrl={props.item.connection.target.url}
        connection={props.item.connection.connection}
      />
      <DeleteConnectionModal
        isOpen={deleteOpened}
        onClose={() => setDeleteOpened(false)}
        connectionId={props.item.connection.connection.id}
      />
    </Fragment>
  );
}
