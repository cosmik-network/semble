'use client';

import type { UrlCard, Collection, User } from '@/api-client';
import { ActionIcon, Button, Group, Menu } from '@mantine/core';
import { Fragment, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { BsThreeDots, BsTrash2Fill } from 'react-icons/bs';
import { LuUnplug } from 'react-icons/lu';
import RemoveCardFromCollectionModal from '../removeCardFromCollectionModal/RemoveCardFromCollectionModal';
import RemoveCardFromLibraryModal from '../removeCardFromLibraryModal/RemoveCardFromLibraryModal';
import AddCardToModal from '@/features/cards/components/addCardToModal/AddCardToModal';
import { MdOutlineStickyNote2 } from 'react-icons/md';
import NoteCardModal from '@/features/notes/components/noteCardModal/NoteCardModal';
import { useAuth } from '@/hooks/useAuth';
import { IoMdCheckmark } from 'react-icons/io';

interface Props {
  id: string;
  cardContent: UrlCard['cardContent'];
  cardCount: number;
  cardAuthor?: User;
  authorHandle?: string;
  note?: UrlCard['note'];
  currentCollection?: Collection;
  urlLibraryCount: number;
  urlIsInLibrary: boolean;
  viaCardId?: string;
}

export default function UrlCardActions(props: Props) {
  const { isAuthenticated, user } = useAuth();
  const isAuthorByHandle =
    props.authorHandle && user?.handle === props.authorHandle;
  const isAuthorById =
    !props.authorHandle && props.cardAuthor && user?.id === props.cardAuthor.id;
  const isAuthor = Boolean(user && (isAuthorByHandle || isAuthorById));
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showRemoveFromCollectionModal, setShowRemoveFromCollectionModal] =
    useState(false);
  const [showRemoveFromLibaryModal, setShowRemoveFromLibraryModal] =
    useState(false);
  const [showAddToModal, setShowAddToModal] = useState(false);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Fragment>
      <Group justify="space-between">
        <Group gap={'xs'}>
          <Button
            variant="light"
            color={'gray'}
            size="xs"
            radius={'xl'}
            leftSection={
              props.urlIsInLibrary ? (
                <IoMdCheckmark size={18} />
              ) : (
                <FiPlus size={18} />
              )
            }
            onClick={(e) => {
              e.stopPropagation();
              setShowAddToModal(true);
            }}
          >
            {props.urlLibraryCount}
          </Button>
          {props.note && (
            <ActionIcon
              variant="light"
              color="gray"
              radius={'xl'}
              onClick={(e) => {
                e.stopPropagation();
                setShowNoteModal(true);
              }}
            >
              <MdOutlineStickyNote2 />
            </ActionIcon>
          )}
        </Group>
        {isAuthor && (
          <Menu shadow="sm">
            <Menu.Target>
              <ActionIcon
                variant="light"
                color={'gray'}
                radius={'xl'}
                onClick={(e) => e.stopPropagation()}
              >
                <BsThreeDots size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {props.currentCollection && (
                <Menu.Item
                  leftSection={<LuUnplug />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRemoveFromCollectionModal(true);
                  }}
                >
                  Remove from this collection
                </Menu.Item>
              )}
              <Menu.Item
                color="red"
                leftSection={<BsTrash2Fill />}
                onClick={() => {
                  setShowRemoveFromLibraryModal(true);
                }}
              >
                Remove from library
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>

      <AddCardToModal
        isOpen={showAddToModal}
        onClose={() => setShowAddToModal(false)}
        url={props.cardContent.url}
        cardId={props.id}
        note={props.note?.text}
        isInYourLibrary={props.urlIsInLibrary}
        urlLibraryCount={props.urlLibraryCount}
        viaCardId={props.viaCardId}
      />

      <NoteCardModal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        note={props.note}
        cardContent={props.cardContent}
        cardAuthor={props.cardAuthor}
      />

      {props.currentCollection && (
        <RemoveCardFromCollectionModal
          isOpen={showRemoveFromCollectionModal}
          onClose={() => setShowRemoveFromCollectionModal(false)}
          cardId={props.id}
          collectionId={props.currentCollection.id}
        />
      )}
      <RemoveCardFromLibraryModal
        isOpen={showRemoveFromLibaryModal}
        onClose={() => setShowRemoveFromLibraryModal(false)}
        cardId={props.id}
      />
    </Fragment>
  );
}
