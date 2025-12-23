import { Group, Menu, ActionIcon, CopyButton, Button } from '@mantine/core';
import EditCollectionModal from '../editCollectionModal/EditCollectionModal';
import DeleteCollectionModal from '../deleteCollectionModal/DeleteCollectionModal';
import { BsThreeDots, BsPencilFill, BsTrash2Fill } from 'react-icons/bs';
import { MdIosShare } from 'react-icons/md';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  id: string;
  rkey: string;
  name: string;
  description?: string;
  authorHandle: string;
}

export default function CollectionActions(props: Props) {
  const { isAuthenticated, user } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isAuthor = user?.handle === props.authorHandle;
  const shareLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/profile/${props.authorHandle}/collections/${props.rkey}`
      : '';

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Group gap={'xs'}>
      <CopyButton value={shareLink}>
        {({ copied, copy }) => (
          <Button
            variant="light"
            color="gray"
            leftSection={<MdIosShare size={22} />}
            onClick={copy}
          >
            {copied ? 'Link copied!' : 'Share'}
          </Button>
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

      <EditCollectionModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        collection={{
          id: props.id,
          rkey: props.rkey,
          name: props.name,
          description: props.description,
        }}
      />
      <DeleteCollectionModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        collectionId={props.id}
      />
    </Group>
  );
}
