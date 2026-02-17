'use client';

import AddCardToModal from '@/features/cards/components/addCardToModal/AddCardToModal';
import useGetCardFromMyLibrary from '@/features/cards/lib/queries/useGetCardFromMyLibrary';
import { ActionIcon, Button, CopyButton, Group, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Fragment, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { IoMdCheckmark } from 'react-icons/io';
import { MdIosShare } from 'react-icons/md';
import useSembleLibraries from '../../lib/queries/useSembleLibraries';
import { track } from '@vercel/analytics';
import posthog from 'posthog-js';

interface Props {
  url: string;
  viaCardId?: string;
}

export default function SembleActions(props: Props) {
  const cardStatus = useGetCardFromMyLibrary({ url: props.url });
  const isInYourLibrary = cardStatus.data.card?.urlInLibrary;
  const [showAddToModal, setShowAddToModal] = useState(false);

  const { data } = useSembleLibraries({ url: props.url });
  const allLibraries =
    data?.pages.flatMap((page) => page.libraries ?? []) ?? [];

  const urlLibraryCount = allLibraries.length ?? 0;

  const shareLink = `${process.env.NEXT_PUBLIC_APP_URL}/url?id=${props.url}`;

  if (cardStatus.error) {
    return null;
  }

  return (
    <Fragment>
      <Group gap={'xs'}>
        <CopyButton value={shareLink}>
          {({ copied, copy }) => (
            <Tooltip
              label={copied ? 'Link copied!' : 'Share'}
              withArrow
              position="top"
            >
              <ActionIcon
                variant="light"
                color="gray"
                size={'xl'}
                radius={'xl'}
                onClick={() => {
                  copy();

                  if (copied) return;
                  notifications.show({
                    message: 'Link copied!',
                    position: 'top-center',
                    id: copied.toString(),
                  });
                }}
              >
                <MdIosShare size={22} />
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
        <Button
          variant={isInYourLibrary ? 'default' : 'filled'}
          size="md"
          leftSection={
            isInYourLibrary ? <IoMdCheckmark size={18} /> : <FiPlus size={18} />
          }
          onClick={() => {
            setShowAddToModal(true);
            track(
              `Semble: ${isInYourLibrary ? 'update card' : 'add to library'}`,
            );
            posthog.capture(
              `Semble: ${isInYourLibrary ? 'update card' : 'add to library'}`,
            );
          }}
        >
          {isInYourLibrary ? 'Update card' : 'Add to library'}
        </Button>
      </Group>

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
      />
    </Fragment>
  );
}
