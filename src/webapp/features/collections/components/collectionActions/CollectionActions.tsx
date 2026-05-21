import { Collection, CollectionAccessType } from '@semble/types';
import { Group, Menu, ActionIcon } from '@mantine/core';
import EditCollectionModal from '../editCollectionModal/EditCollectionModal';
import DeleteCollectionModal from '../deleteCollectionModal/DeleteCollectionModal';
import { BsThreeDots, BsPencilFill, BsTrash2Fill } from 'react-icons/bs';
import { Fragment, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { FiPlus } from 'react-icons/fi';
import AddCardDrawer from '@/features/cards/components/addCardDrawer/AddCardDrawer';
import AddCardToModal from '@/features/cards/components/addCardToModal/AddCardToModal';
import FollowButton from '@/features/follows/components/followButton/FollowButton';
import useGetCardFromMyLibrary from '@/features/cards/lib/queries/useGetCardFromMyLibrary';
import useSembleLibraries from '@/features/semble/lib/queries/useSembleLibraries';
import { IoMdCheckmark } from 'react-icons/io';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { TbPlugConnected } from 'react-icons/tb';
import AddConnectionModal from '@/features/connections/components/addConnectionModal/AddConnectionModal';

interface Props {
  collection: Collection & {
    rkey: string;
  };
}

function AuthenticatedCollectionActions({ collection }: Props) {
  const { user } = useAuth();
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showSaveToLibraryModal, setShowSaveToLibraryModal] = useState(false);
  const [showAddConnectionModal, setShowAddConnectionModal] = useState(false);

  const isAuthor = user?.handle === collection.author?.handle;
  const canAddCard =
    collection.accessType === CollectionAccessType.OPEN || isAuthor;

  const collectionPageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/profile/${collection.author?.handle}/collections/${collection.rkey}`;

  const cardStatus = useGetCardFromMyLibrary({ url: collectionPageUrl });
  const isInYourLibrary = cardStatus.data.card?.urlInLibrary;

  const { data: librariesData } = useSembleLibraries({
    url: collectionPageUrl,
  });
  const allLibraries =
    librariesData?.pages.flatMap((page) => page.libraries ?? []) ?? [];
  const urlLibraryCount = allLibraries.length ?? 0;

  return (
    <Fragment>
      <Menu shadow="sm">
        <Menu.Target>
          <ActionIcon size="lg" radius={'xl'}>
            <FiPlus size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {canAddCard && (
            <Menu.Item
              leftSection={<FaRegNoteSticky />}
              onClick={() => setShowAddDrawer(true)}
            >
              Add card to collection
            </Menu.Item>
          )}
          <Menu.Item
            leftSection={isInYourLibrary ? <IoMdCheckmark /> : <FiPlus />}
            onClick={() => setShowSaveToLibraryModal(true)}
          >
            {isInYourLibrary ? 'Collection saved' : 'Save collection'}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <ActionIcon
        variant="light"
        color="green"
        size="lg"
        radius={'xl'}
        onClick={() => {
          setShowAddConnectionModal(true);
        }}
      >
        <TbPlugConnected size={18} />
      </ActionIcon>

      {!isAuthor && (
        <FollowButton
          targetId={collection.id}
          targetType="COLLECTION"
          targetHandle={collection.author.handle}
          initialIsFollowing={collection.isFollowing}
        />
      )}

      <AddConnectionModal
        isOpen={showAddConnectionModal}
        onClose={() => setShowAddConnectionModal(false)}
        sourceUrl={collectionPageUrl}
      />

      <AddCardToModal
        isOpen={showSaveToLibraryModal}
        onClose={() => setShowSaveToLibraryModal(false)}
        url={collectionPageUrl}
        cardId={cardStatus.data.card?.id}
        note={cardStatus.data.card?.note?.text}
        isInYourLibrary={isInYourLibrary}
        urlLibraryCount={urlLibraryCount}
      />

      {user && (
        <AddCardDrawer
          isOpen={showAddDrawer}
          onClose={() => setShowAddDrawer(false)}
          selectedCollection={collection}
        />
      )}
    </Fragment>
  );
}

function AuthorCollectionMenu({ collection }: Props) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <Fragment>
      <Menu shadow="sm">
        <Menu.Target>
          <ActionIcon variant="light" color={'gray'} size={'lg'} radius={'xl'}>
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

      <EditCollectionModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        collection={{
          id: collection.id,
          rkey: collection.rkey,
          name: collection.name,
          description: collection.description,
          accessType: collection.accessType,
          uri: collection.uri,
          authorHandle: collection.author?.handle,
        }}
      />
      <DeleteCollectionModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        collectionId={collection.id}
      />
    </Fragment>
  );
}

export default function CollectionActions(props: Props) {
  const { isAuthenticated, user } = useAuth();

  const isAuthor =
    isAuthenticated && user?.handle === props.collection.author?.handle;

  return (
    <Fragment>
      <Group gap={'xs'}>
        {isAuthenticated && (
          <AuthenticatedCollectionActions collection={props.collection} />
        )}

        {isAuthor && <AuthorCollectionMenu collection={props.collection} />}
      </Group>
    </Fragment>
  );
}
