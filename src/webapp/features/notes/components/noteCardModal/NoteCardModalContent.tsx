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
  Flex,
  Input,
  VisuallyHidden,
} from '@mantine/core';
import { UrlCard, User } from '@semble/types';
import Link from 'next/link';
import { Fragment, useState } from 'react';
import useUpdateNote from '../../lib/mutations/useUpdateNote';
import { notifications } from '@mantine/notifications';
import useRemoveCardFromLibrary from '@/features/cards/lib/mutations/useRemoveCardFromLibrary';

interface Props {
  onClose: () => void;
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
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const maxNoteLength = 500;

  const removeNote = useRemoveCardFromLibrary();
  const updateNote = useUpdateNote();

  const handleDeleteNote = () => {
    if (!isMyCard || !props.note) return;

    removeNote.mutate(props.note.id, {
      onError: () => {
        notifications.show({
          message: 'Could not delete note.',
          position: 'top-center',
        });
      },
      onSettled: () => {
        props.onClose();
      },
    });
  };

  const handleUpdateNote = () => {
    if (!props.note || !note) {
      props.onClose();
      return;
    }

    if (props.note.text === note) {
      props.onClose();
      return;
    }

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
        <Stack gap={0}>
          <Flex justify="space-between">
            <Input.Label size="md" htmlFor="note">
              Your note
            </Input.Label>
            <Text aria-hidden>
              {note?.length ?? 0} / {maxNoteLength}
            </Text>
          </Flex>

          <Textarea
            id="note"
            placeholder="Add a note about this card"
            variant="filled"
            size="md"
            autosize
            minRows={3}
            maxRows={8}
            maxLength={maxNoteLength}
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
          />
          <VisuallyHidden id="note-char-remaining" aria-live="polite">
            {`${maxNoteLength - (note?.length ?? 0)} characters remaining`}
          </VisuallyHidden>
        </Stack>

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
            src={props.cardAuthor.avatarUrl?.replace(
              'avatar',
              'avatar_thumbnail',
            )}
            alt={`${props.cardAuthor.name}'s avatar`}
          />
          <Anchor
            component={Link}
            href={`/profile/${props.cardAuthor.handle}`}
            target="_blank"
            fw={700}
            c="bright"
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
            {props.cardContent.imageUrl && (
              <AspectRatio ratio={1 / 1} flex={0.1}>
                <Image
                  src={props.cardContent.imageUrl}
                  alt={`${props.cardContent.url} social preview image`}
                  radius={'md'}
                  w={45}
                  h={45}
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
                <Anchor
                  component={Link}
                  href={props.cardContent.url}
                  target="_blank"
                  fw={500}
                  lineClamp={1}
                  c={'bright'}
                  w={'fit-content'}
                >
                  {props.cardContent.title}
                </Anchor>
              )}
            </Stack>
          </Group>
        </Stack>
      </Card>
      {isMyCard && (
        <Fragment>
          {showDeleteWarning ? (
            <Group justify="space-between" gap={'xs'}>
              <Text>Delete note?</Text>
              <Group gap={'xs'}>
                <Button
                  color="red"
                  onClick={handleDeleteNote}
                  loading={removeNote.isPending}
                >
                  Delete
                </Button>
                <Button
                  variant="light"
                  color="gray"
                  onClick={() => setShowDeleteWarning(false)}
                >
                  Cancel
                </Button>
              </Group>
            </Group>
          ) : (
            <Group gap={'xs'} grow>
              <Button
                variant="light"
                color="gray"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditMode(true);
                }}
              >
                Edit note
              </Button>

              <Button
                variant="light"
                color="red"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteWarning(true);
                }}
              >
                Delete note
              </Button>
            </Group>
          )}
        </Fragment>
      )}
    </Stack>
  );
}
