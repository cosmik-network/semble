import { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { Button, CopyButton, Group, Stack, Text } from '@mantine/core';
import { BsInfo } from 'react-icons/bs';
import { BiCopy } from 'react-icons/bi';
import { FiArrowUpRight } from 'react-icons/fi';
import { IoMdCheckmark } from 'react-icons/io';
import { useRouter } from 'next/navigation';
import { getSembleHref } from '@/lib/utils/link';
import { getCardFromMyLibrary } from '../dal';
import { cardKeys } from '../cardKeys';

interface NewCard {
  url: string;
  note: string;
  collectionIds: string[];
}

function pluralize(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/**
 * Saving a URL that's already in the reader's library only adds what's new:
 * collections it isn't in yet, and a note if it has none.
 */
export default function useUrlInLibrary() {
  const queryClient = useQueryClient();
  const router = useRouter();

  /**
   * Returns the card narrowed to what's new, with a message for the success
   * notification, or null when there's nothing to add — the loading
   * notification then says so.
   */
  const narrowToNew = async (
    card: NewCard,
    notificationId: string,
  ): Promise<(NewCard & { message?: ReactNode }) | null> => {
    // Always fresh: a stale "no note" would send a note that overwrites the
    // existing one. A failed check falls through to a normal add.
    const status = await queryClient
      .fetchQuery({
        queryKey: cardKeys.byUrl(card.url),
        queryFn: () => getCardFromMyLibrary(card.url),
        staleTime: 0,
      })
      .catch(() => null);
    if (!status?.card) return card;

    const existingCollectionIds = new Set(status.collections?.map((c) => c.id));
    const collectionIds = card.collectionIds.filter(
      (id) => !existingCollectionIds.has(id),
    );
    const hasNote = !!status.card.note;
    const note = hasNote ? '' : card.note;

    const added = [
      collectionIds.length > 0 &&
        `added to ${pluralize(collectionIds.length, 'collection')}`,
      note && 'note added',
    ].filter(Boolean);
    const viewButton = (
      <Button
        size="xs"
        variant="light"
        color="gray"
        rightSection={<FiArrowUpRight size={14} />}
        onClick={() => {
          notifications.hide(notificationId);
          router.push(getSembleHref(card.url));
        }}
      >
        View
      </Button>
    );
    const summary = (
      <Text size="sm">
        {added.length > 0
          ? `Already in your library — ${added.join(' and ')}`
          : 'Already in your library'}
      </Text>
    );
    const message =
      hasNote && card.note ? (
        <Stack gap="xs">
          <Stack gap={2}>
            {summary}
            <Text size="xs" c="dimmed">
              You already have a note on this — edit it from the card
            </Text>
          </Stack>
          <Group gap="xs">
            <CopyButton value={card.note}>
              {({ copied, copy }) => (
                <Button
                  size="xs"
                  variant="light"
                  color={copied ? 'green' : 'gray'}
                  leftSection={
                    copied ? <IoMdCheckmark size={14} /> : <BiCopy size={14} />
                  }
                  onClick={copy}
                >
                  {copied ? 'Copied' : 'Copy new note'}
                </Button>
              )}
            </CopyButton>
            {viewButton}
          </Group>
        </Stack>
      ) : (
        <Group gap="xs" justify="space-between" wrap="nowrap" align="center">
          {summary}
          {viewButton}
        </Group>
      );

    if (added.length > 0) return { ...card, collectionIds, note, message };

    notifications.update({
      id: notificationId,
      color: 'blue',
      title: null,
      message,
      position: 'top-center',
      loading: false,
      autoClose: 5000,
      withCloseButton: true,
      icon: <BsInfo />,
    });
    return null;
  };

  return { narrowToNew };
}
