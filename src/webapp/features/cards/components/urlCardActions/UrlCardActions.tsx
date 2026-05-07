'use client';

import {
  type UrlCard,
  type Collection,
  type User,
  CollectionAccessType,
} from '@/api-client';
import {
  ActionIcon,
  Button,
  Collapse,
  CopyButton,
  Group,
  Menu,
  Tooltip,
} from '@mantine/core';
import { Fragment, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { BsThreeDots, BsTrash2Fill } from 'react-icons/bs';
import RemoveCardFromCollectionModal from '../removeCardFromCollectionModal/RemoveCardFromCollectionModal';
import RemoveCardFromLibraryModal from '../removeCardFromLibraryModal/RemoveCardFromLibraryModal';
import AddCardToModal from '@/features/cards/components/addCardToModal/AddCardToModal';
import { MdIosShare, MdOutlineStickyNote2 } from 'react-icons/md';
import NoteCardInline from '@/features/notes/components/noteCardInline/NoteCardInline';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { IoMdCheckmark } from 'react-icons/io';
import { notifications } from '@mantine/notifications';
import { BiCopy } from 'react-icons/bi';
import { CardSaveAnalyticsContext } from '@/features/analytics/types';
import { TbPlugConnected } from 'react-icons/tb';
import AddConnectionModal from '@/features/connections/components/addConnectionModal/AddConnectionModal';
import { AiOutlineDisconnect } from 'react-icons/ai';
import { useWebHaptics } from 'web-haptics/react';

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
  urlIsConnected?: boolean;
  urlConnectionCount: number;
  viaCardId?: string;
  semblePageUrl?: string;
  analyticsContext?: CardSaveAnalyticsContext;
}

export default function UrlCardActions(props: Props) {
  const { isAuthenticated, user } = useAuth();

  const userId = user?.id;
  const userHandle = user?.handle;

  const isAuthor =
    !!user &&
    (props.authorHandle
      ? userHandle === props.authorHandle
      : userId === props.cardAuthor?.id);

  const isOpenCollection =
    props.currentCollection?.accessType === CollectionAccessType.OPEN;

  const isCardAdder = userId === props.cardAuthor?.id;
  const isCollectionOwner = userId === props.currentCollection?.author.id;

  const canRemoveFromOpenCollection =
    !!user && isOpenCollection && (isCardAdder || isCollectionOwner);

  const canRemoveFromLibrary = isAuthor && props.urlIsInLibrary;

  const [showNote, setShowNote] = useState(false);
  const [showRemoveFromCollectionModal, setShowRemoveFromCollectionModal] =
    useState(false);
  const [showRemoveFromLibaryModal, setShowRemoveFromLibraryModal] =
    useState(false);
  const [showAddToModal, setShowAddToModal] = useState(false);
  const [showAddConnectionModal, setShowAddConnectionModal] = useState(false);

  const { trigger } = useWebHaptics();
  const router = useRouter();

  return (
    <Fragment>
      {props.note && (
        <Collapse expanded={showNote}>
          <NoteCardInline
            note={props.note}
            cardContent={props.cardContent}
            cardAuthor={props.cardAuthor}
            isOwner={isAuthenticated && isAuthor}
            onClose={() => setShowNote(false)}
          />
        </Collapse>
      )}
      <Group justify="space-between">
        <Group gap={'xs'}>
          <Tooltip label="Save or update" withArrow>
            <Button
              variant="light"
              color={'gray'}
              size="xs"
              radius={'xl'}
              leftSection={
                props.urlLibraryCount > 0 ? (
                  props.urlIsInLibrary ? (
                    <IoMdCheckmark size={18} />
                  ) : (
                    <FiPlus size={18} />
                  )
                ) : undefined
              }
              onClick={(e) => {
                e.stopPropagation();
                if (!isAuthenticated) {
                  router.push('/login');
                  return;
                }
                trigger();
                setShowAddToModal(true);
              }}
            >
              {props.urlLibraryCount ? (
                props.urlLibraryCount
              ) : props.urlIsInLibrary ? (
                <IoMdCheckmark size={18} />
              ) : (
                <FiPlus size={18} />
              )}
            </Button>
          </Tooltip>
          <Tooltip label="Connect to another card" withArrow>
            <Button
              variant="light"
              color="gray"
              c={props.urlIsConnected ? 'green' : 'gray'}
              size="xs"
              radius={'xl'}
              leftSection={
                props.urlConnectionCount > 0 ? (
                  <TbPlugConnected size={15} />
                ) : undefined
              }
              onClick={(e) => {
                e.stopPropagation();
                if (!isAuthenticated) {
                  router.push('/login');
                  return;
                }
                trigger();
                setShowAddConnectionModal(true);
              }}
            >
              {props.urlConnectionCount ? (
                props.urlConnectionCount
              ) : (
                <TbPlugConnected size={15} />
              )}
            </Button>
          </Tooltip>

          {props.note && (
            <Tooltip label="View note" withArrow>
              <ActionIcon
                variant="light"
                color="gray"
                radius={'xl'}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNote((prev) => !prev);
                }}
              >
                <MdOutlineStickyNote2 />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>

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
            <CopyButton value={props.cardContent.url}>
              {({ copy }) => (
                <Menu.Item
                  leftSection={<BiCopy />}
                  onClick={(e) => {
                    e.stopPropagation();
                    copy();
                    notifications.show({
                      message: 'Link copied!',
                      position: 'top-center',
                    });
                  }}
                >
                  Copy link
                </Menu.Item>
              )}
            </CopyButton>

            <CopyButton
              value={`${process.env.NEXT_PUBLIC_APP_URL}/url?id=${props.cardContent.url}`}
            >
              {({ copy }) => (
                <Menu.Item
                  leftSection={<MdIosShare />}
                  onClick={(e) => {
                    e.stopPropagation();
                    copy();
                    notifications.show({
                      message: 'Semble link copied!',
                      position: 'top-center',
                    });
                  }}
                >
                  Share Semble page
                </Menu.Item>
              )}
            </CopyButton>

            {props.currentCollection &&
              (isAuthor || canRemoveFromOpenCollection) && (
                <Menu.Item
                  leftSection={<AiOutlineDisconnect />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRemoveFromCollectionModal(true);
                  }}
                >
                  Remove from this collection
                </Menu.Item>
              )}
            {canRemoveFromLibrary && (
              <Menu.Item
                color="red"
                leftSection={<BsTrash2Fill />}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRemoveFromLibraryModal(true);
                }}
              >
                Remove from library
              </Menu.Item>
            )}
          </Menu.Dropdown>
        </Menu>
      </Group>

      {isAuthenticated && (
        <>
          <AddCardToModal
            isOpen={showAddToModal}
            onClose={() => setShowAddToModal(false)}
            url={props.cardContent.url}
            cardContent={props.cardContent}
            cardId={props.id}
            note={props.note?.text}
            isInYourLibrary={props.urlIsInLibrary}
            urlLibraryCount={props.urlLibraryCount}
            viaCardId={props.viaCardId}
            analyticsContext={props.analyticsContext}
          />

          <AddConnectionModal
            isOpen={showAddConnectionModal}
            onClose={() => setShowAddConnectionModal(false)}
            sourceUrl={props.cardContent.url}
            targetUrl={props.semblePageUrl}
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
        </>
      )}
    </Fragment>
  );
}
