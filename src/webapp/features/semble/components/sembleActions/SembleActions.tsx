'use client';

import AddCardToModal from '@/features/cards/components/addCardToModal/AddCardToModal';
import RemoveCardFromLibraryModal from '@/features/cards/components/removeCardFromLibraryModal/RemoveCardFromLibraryModal';
import useGetCardFromMyLibrary from '@/features/cards/lib/queries/useGetCardFromMyLibrary';
import { ActionIcon, Button, Group } from '@mantine/core';
import { Fragment, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { IoMdCheckmark } from 'react-icons/io';
import useSembleLibraries from '../../lib/queries/useSembleLibraries';
import { track } from '@vercel/analytics';
import { CardSaveSource } from '@/features/analytics/types';
import { usePathname } from 'next/navigation';
import { TbPlugConnected } from 'react-icons/tb';
import AddConnectionModal from '@/features/connections/components/addConnectionModal/AddConnectionModal';
import { BsTrash2Fill } from 'react-icons/bs';

interface Props {
  url: string;
  viaCardId?: string;
}

export default function SembleActions(props: Props) {
  const pathname = usePathname();
  const cardStatus = useGetCardFromMyLibrary({ url: props.url });
  const isInYourLibrary = cardStatus.data.card?.urlInLibrary;
  const [showAddToModal, setShowAddToModal] = useState(false);
  const [showAddConnectionModal, setShowAddConnectionModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  const { data } = useSembleLibraries({ url: props.url });
  const allLibraries =
    data?.pages.flatMap((page) => page.libraries ?? []) ?? [];

  const urlLibraryCount = allLibraries.length ?? 0;

  if (cardStatus.error) {
    return null;
  }

  return (
    <Fragment>
      <Group gap={'xs'}>
        <Button
          variant="light"
          color="green"
          radius={'xl'}
          leftSection={<TbPlugConnected size={18} />}
          onClick={(e) => {
            e.stopPropagation();
            setShowAddConnectionModal(true);
          }}
        >
          Connect
        </Button>
        <Button
          variant={isInYourLibrary ? 'light' : 'filled'}
          leftSection={
            isInYourLibrary ? <IoMdCheckmark size={18} /> : <FiPlus size={18} />
          }
          onClick={() => {
            setShowAddToModal(true);
            track(
              `Semble: ${isInYourLibrary ? 'update card' : 'add to library'}`,
            );
          }}
        >
          {isInYourLibrary ? 'Update' : 'Add'}
        </Button>
        {isInYourLibrary && (
          <ActionIcon
            variant="light"
            color="red"
            size={36}
            radius={'xl'}
            onClick={() => setShowRemoveModal(true)}
          >
            <BsTrash2Fill />
          </ActionIcon>
        )}
      </Group>

      <AddConnectionModal
        isOpen={showAddConnectionModal}
        onClose={() => setShowAddConnectionModal(false)}
        sourceUrl={props.url}
      />

      <AddCardToModal
        isOpen={showAddToModal}
        onClose={() => setShowAddToModal(false)}
        url={props.url}
        cardContent={cardStatus.data.card?.cardContent}
        cardId={cardStatus.data.card?.id}
        note={cardStatus.data.card?.note?.text}
        isInYourLibrary={cardStatus.data.card?.urlInLibrary}
        urlLibraryCount={urlLibraryCount}
        viaCardId={props.viaCardId}
        analyticsContext={{
          saveSource: CardSaveSource.SEMBLE_PAGE,
          pagePath: pathname,
        }}
      />
      {isInYourLibrary && cardStatus.data.card?.id && (
        <RemoveCardFromLibraryModal
          isOpen={showRemoveModal}
          onClose={() => setShowRemoveModal(false)}
          cardId={cardStatus.data.card.id}
        />
      )}
    </Fragment>
  );
}
