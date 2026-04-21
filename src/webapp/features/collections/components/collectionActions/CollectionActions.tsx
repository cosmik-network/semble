import { Collection, CollectionAccessType } from '@semble/types';
import { Group, Menu, ActionIcon, CopyButton, Button } from '@mantine/core';
import EditCollectionModal from '../editCollectionModal/EditCollectionModal';
import DeleteCollectionModal from '../deleteCollectionModal/DeleteCollectionModal';
import { BsThreeDots, BsPencilFill, BsTrash2Fill } from 'react-icons/bs';
import { MdIosShare } from 'react-icons/md';
import { Fragment, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { FiPlus } from 'react-icons/fi';
import { IoBookmarkOutline } from 'react-icons/io5';
import { TbCards } from 'react-icons/tb';
import AddCardDrawer from '@/features/cards/components/addCardDrawer/AddCardDrawer';
import AddCardToModal from '@/features/cards/components/addCardToModal/AddCardToModal';
import { notifications } from '@mantine/notifications';
import FollowButton from '@/features/follows/components/followButton/FollowButton';
import { useWebHaptics } from 'web-haptics/react';
import { LuLibrary } from 'react-icons/lu';
import { BiCollection } from 'react-icons/bi';

interface Props {
  collection: Collection & {
    rkey: string;
  };
}

export default function CollectionActions(props: Props) {
  const { isAuthenticated, user } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showSaveToLibraryModal, setShowSaveToLibraryModal] = useState(false);
  const { trigger } = useWebHaptics();

  const isAuthor = user?.handle === props.collection.author?.handle;
  const canAddCard =
    isAuthenticated &&
    (props.collection.accessType === CollectionAccessType.OPEN || isAuthor);

  const shareLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/profile/${props.collection.author?.handle}/collections/${props.collection.rkey}`
      : '';

  const collectionPageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/profile/${props.collection.author?.handle}/collections/${props.collection.rkey}`;

  return (
    <Fragment>
      <Group gap={'xs'}>
        {isAuthenticated && (
          <Menu shadow="sm">
            <Menu.Target>
              <Button
                size="sm"
                leftSection={<FiPlus size={22} />}
                onClick={() => trigger()}
              >
                Add
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<LuLibrary />}
                onClick={() => setShowSaveToLibraryModal(true)}
              >
                To your library
              </Menu.Item>
              {canAddCard && (
                <Menu.Item
                  leftSection={<BiCollection />}
                  onClick={() => setShowAddDrawer(true)}
                >
                  To this collection
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        )}

        {isAuthenticated && !isAuthor && (
          <FollowButton
            targetId={props.collection.id}
            targetType="COLLECTION"
            targetHandle={props.collection.author.handle}
            initialIsFollowing={props.collection.isFollowing}
          />
        )}

        <CopyButton value={shareLink}>
          {({ copy }) => (
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
                  position: 'top-center',
                  id: props.collection.id,
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

      <AddCardToModal
        isOpen={showSaveToLibraryModal}
        onClose={() => setShowSaveToLibraryModal(false)}
        url={collectionPageUrl}
        urlLibraryCount={0}
      />

      <EditCollectionModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        collection={{
          id: props.collection.id,
          rkey: props.collection.rkey,
          name: props.collection.name,
          description: props.collection.description,
          accessType: props.collection.accessType,
          uri: props.collection.uri,
          authorHandle: props.collection.author?.handle,
        }}
      />
      <DeleteCollectionModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        collectionId={props.collection.id}
      />

      {user && (
        <AddCardDrawer
          isOpen={showAddDrawer}
          onClose={() => setShowAddDrawer(false)}
          selectedCollection={props.collection}
        />
      )}
    </Fragment>
  );
}
