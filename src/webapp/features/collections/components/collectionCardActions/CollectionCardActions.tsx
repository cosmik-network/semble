'use client';

import { type Collection } from '@/api-client';
import { ActionIcon, Menu } from '@mantine/core';
import { Fragment, useState } from 'react';
import { BsPencilFill, BsThreeDots, BsTrash2Fill } from 'react-icons/bs';
import FollowButton from '@/features/follows/components/followButton/FollowButton';
import { useAuth } from '@/hooks/useAuth';
import { getRecordKey } from '@/lib/utils/atproto';
import EditCollectionModal from '../editCollectionModal/EditCollectionModal';
import DeleteCollectionModal from '../deleteCollectionModal/DeleteCollectionModal';

interface Props {
  collection: Collection;
  /** Fires with the new follow state once the write lands. */
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function CollectionCardActions(props: Props) {
  const { collection } = props;
  const { isAuthenticated, user } = useAuth();
  const isAuthor = user?.id === collection.author.id;

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!isAuthenticated) return null;

  if (!isAuthor) {
    return (
      <FollowButton
        targetId={collection.id}
        targetType="COLLECTION"
        initialIsFollowing={collection.isFollowing}
        onFollowChange={props.onFollowChange}
        size="xs"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <Fragment>
      <Menu shadow="sm">
        <Menu.Target>
          <ActionIcon
            variant="light"
            color={'gray'}
            radius={'xl'}
            aria-label="Collection options"
            onClick={(e) => e.stopPropagation()}
          >
            <BsThreeDots size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<BsPencilFill />}
            onClick={(e) => {
              e.stopPropagation();
              setShowEditModal(true);
            }}
          >
            Edit collection
          </Menu.Item>
          <Menu.Item
            color="red"
            leftSection={<BsTrash2Fill />}
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteModal(true);
            }}
          >
            Delete collection
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <EditCollectionModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        collection={{
          id: collection.id,
          rkey: getRecordKey(collection.uri!!),
          name: collection.name,
          description: collection.description,
          accessType: collection.accessType,
          uri: collection.uri,
          authorHandle: collection.author.handle,
        }}
      />
      <DeleteCollectionModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        collectionId={collection.id}
        redirectOnSuccess={false}
      />
    </Fragment>
  );
}
