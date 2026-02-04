import { CollectionAccessType } from '@semble/types';
import { Group, Menu, ActionIcon, CopyButton, Button } from '@mantine/core';
import EditCollectionModal from '../editCollectionModal/EditCollectionModal';
import DeleteCollectionModal from '../deleteCollectionModal/DeleteCollectionModal';
import { BsThreeDots, BsPencilFill, BsTrash2Fill } from 'react-icons/bs';
import { MdIosShare } from 'react-icons/md';
import { Fragment, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { FiPlus } from 'react-icons/fi';
import AddCardDrawer from '@/features/cards/components/addCardDrawer/AddCardDrawer';
import { notifications } from '@mantine/notifications';

interface Props {
  id: string;
  rkey: string;
  name: string;
  description?: string;
  accessType?: CollectionAccessType;
  authorHandle: string;
  cardCount: number;
}

export default function CollectionActions(props: Props) {
  const { isAuthenticated, user } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddDrawer, setShowAddDrawer] = useState(false);

  const isAuthor = user?.handle === props.authorHandle;
  const shareLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/profile/${props.authorHandle}/collections/${props.rkey}`
      : '';

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Fragment>
      <Group gap={'xs'}>
        {props.accessType === CollectionAccessType.OPEN && (
          <Button
            size="sm"
            leftSection={<FiPlus size={22} />}
            onClick={() => setShowAddDrawer(true)}
          >
            Add Card
          </Button>
        )}

        <CopyButton value={shareLink}>
          {({ copied, copy }) => (
            <ActionIcon
              variant="light"
              color="gray"
              size={'lg'}
              radius={'xl'}
              onClick={(e) => {
                e.stopPropagation();
                copy();
                notifications.show({
                  message: 'Link copied!',
                  position: 'bottom-center',
                });
              }}
            >
              <MdIosShare size={18} />
            </ActionIcon>
          )}
        </CopyButton>
        {isAuthor && (
          <Menu shadow="sm">
            <Menu.Target>
              <ActionIcon
                variant="light"
                color={'gray'}
                size={'lg'}
                radius={'xl'}
              >
                <BsThreeDots size={22} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                onClick={() => setShowEditModal(true)}
                leftSection={<BsPencilFill />}
              >
                Edit collection
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<BsTrash2Fill />}
                onClick={() => setShowDeleteModal(true)}
              >
                Delete collection
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>

      <EditCollectionModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        collection={{
          id: props.id,
          rkey: props.rkey,
          name: props.name,
          description: props.description,
          accessType: props.accessType,
        }}
      />
      <DeleteCollectionModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        collectionId={props.id}
      />

      {user && (
        <AddCardDrawer
          isOpen={showAddDrawer}
          onClose={() => setShowAddDrawer(false)}
          selectedCollection={{
            id: props.id,
            name: props.name,
            cardCount: props.cardCount,
          }}
        />
      )}
    </Fragment>
  );
}
