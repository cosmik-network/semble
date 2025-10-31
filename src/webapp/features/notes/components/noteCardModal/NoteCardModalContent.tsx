import useGetCardFromMyLibrary from '@/features/cards/lib/queries/useGetCardFromMyLibrary';
import {
  Anchor,
  AspectRatio,
  Avatar,
  Card,
  Group,
  Stack,
  Tooltip,
  Text,
  Image,
  Textarea,
  Button,
} from '@mantine/core';
import { UrlCard, User } from '@semble/types';
import Link from 'next/link';
import { useState } from 'react';
import useUpdateNote from '../../lib/mutations/useUpdateNote';
import { notifications } from '@mantine/notifications';

interface Props {
  note: UrlCard['note'];
  cardContent: UrlCard['cardContent'];
  cardAuthor?: User;
  domain: string;
}

export default function NoteCardModalContent(props: Props) {
  const cardStatus = useGetCardFromMyLibrary({ url: props.cardContent.url });
  const isMyCard = props.cardAuthor?.id === cardStatus.data.card?.author.id;
  const [note, setNote] = useState(isMyCard ? props.note?.text : '');
  const [editMode, setEditMode] = useState(false);

  const updateNote = useUpdateNote();

  const handleUpdateNote = () => {
    if (!props.note || !note) return;

    updateNote.mutate(
      {
        cardId: props.note?.id,
        note: note,
      },
      {
        onError: () => {
          notifications.show({
            message: 'Could not update note.',
            position: 'top-center',
          });
        },
        onSettled: () => {
          setEditMode(false);
        },
      },
    );
  };

  if (editMode) {
    return (
      <Stack gap={'xs'}>
        <Textarea
          id="note"
          label="Your note"
          placeholder="Add a note about this card"
          variant="filled"
          size="md"
          autosize
          maxRows={8}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
        />
        <Group gap={'xs'} grow>
          <Button
            variant="light"
            color="gray"
            onClick={() => {
              setEditMode(false);
              setNote(props.note?.text);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateNote}
            loading={updateNote.isPending}
            disabled={note?.trimEnd() === ''}
          >
            Save
          </Button>
        </Group>
      </Stack>
    );
  }
  return (
    <Stack gap={'xs'}>
      {props.cardAuthor && (
        <Group gap={5}>
          <Avatar
            size={'sm'}
            component={Link}
            href={`/profile/${props.cardAuthor.handle}`}
            target="_blank"
            src={props.cardAuthor.avatarUrl}
            alt={`${props.cardAuthor.name}'s' avatar`}
          />
          <Anchor
            component={Link}
            href={`/profile/${props.cardAuthor.handle}`}
            target="_blank"
            fw={700}
            c="blue"
            lineClamp={1}
          >
            {props.cardAuthor.name}
          </Anchor>
        </Group>
      )}
      {props.note && <Text fs={'italic'}>{props.note.text}</Text>}
      <Card withBorder component="article" p={'xs'} radius={'lg'}>
        <Stack>
          <Group gap={'sm'} justify="space-between">
            {props.cardContent.thumbnailUrl && (
              <AspectRatio ratio={1 / 1} flex={0.1}>
                <Image
                  src={props.cardContent.thumbnailUrl}
                  alt={`${props.cardContent.url} social preview image`}
                  radius={'md'}
                  w={50}
                  h={50}
                />
              </AspectRatio>
            )}
            <Stack gap={0} flex={0.9}>
              <Tooltip label={props.cardContent.url}>
                <Anchor
                  component={Link}
                  href={props.cardContent.url}
                  target="_blank"
                  c={'gray'}
                  lineClamp={1}
                  onClick={(e) => e.stopPropagation()}
                >
                  {props.domain}
                </Anchor>
              </Tooltip>
              {props.cardContent.title && (
                <Text fw={500} lineClamp={1}>
                  {props.cardContent.title}
                </Text>
              )}
            </Stack>
            <Button
              variant="light"
              color="gray"
              onClick={(e) => {
                e.stopPropagation();
                setEditMode(true);
              }}
            >
              {note ? 'Edit note' : 'Add note'}
            </Button>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}
