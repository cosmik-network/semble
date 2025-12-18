import {
  AspectRatio,
  Group,
  Stack,
  Image,
  Text,
  Card,
  Anchor,
  Tooltip,
  Textarea,
  Button,
} from '@mantine/core';
import Link from 'next/link';
import { Dispatch, SetStateAction, useState } from 'react';
import { getDomain } from '@/lib/utils/link';
import useRemoveCardFromLibrary from '../../lib/mutations/useRemoveCardFromLibrary';
import { notifications } from '@mantine/notifications';

interface Props {
  url: string;
  thumbnailUrl?: string;
  title?: string;
  note?: string;
  noteId?: string;
  onUpdateNote: Dispatch<SetStateAction<string | undefined>>;
  onClose: () => void;
}

export default function CardToBeAddedPreview(props: Props) {
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [noteMode, setNoteMode] = useState(false);
  const [note, setNote] = useState(props.note);
  const domain = getDomain(props.url);

  const removeNote = useRemoveCardFromLibrary();

  const handleDeleteNote = () => {
    if (!props.noteId) return;

    removeNote.mutate(props.noteId, {
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

  if (noteMode) {
    return (
      <Card
        withBorder
        component="article"
        p={'xs'}
        radius={'lg'}
        style={{ cursor: 'pointer' }}
      >
        <Stack gap={'xs'}>
          <Textarea
            id="note"
            label="Your note"
            placeholder="Add a note about this card"
            variant="filled"
            size="md"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
          />
          <Group gap={'xs'} grow>
            <Button
              variant="light"
              color="gray"
              onClick={() => {
                setNoteMode(false);
                setNote(props.note);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                props.onUpdateNote(note);
                setNoteMode(false);
              }}
              disabled={note?.trimEnd() === ''}
            >
              Ok
            </Button>
          </Group>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap={'xs'}>
      <Card withBorder component="article" p={'xs'} radius={'lg'}>
        <Stack>
          <Group gap={'sm'} justify="space-between">
            {props.thumbnailUrl && (
              <AspectRatio ratio={1 / 1} flex={0.1}>
                <Image
                  src={props.thumbnailUrl}
                  alt={`${props.url} social preview image`}
                  radius={'md'}
                  w={45}
                  h={45}
                />
              </AspectRatio>
            )}
            <Stack gap={0} flex={0.9}>
              <Tooltip label={props.url}>
                <Anchor
                  component={Link}
                  href={props.url}
                  target="_blank"
                  c={'gray'}
                  lineClamp={1}
                  onClick={(e) => e.stopPropagation()}
                >
                  {domain}
                </Anchor>
              </Tooltip>
              {props.title && (
                <Text fw={500} lineClamp={1} c={'bright'}>
                  {props.title}
                </Text>
              )}
            </Stack>
          </Group>
        </Stack>
      </Card>
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
        <Group gap={'xs'}>
          <Button
            variant="light"
            color="gray"
            onClick={(e) => {
              e.stopPropagation();
              setNoteMode(true);
            }}
          >
            {note ? 'Edit note' : 'Add note'}
          </Button>
          {props.noteId && (
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
          )}
        </Group>
      )}
    </Stack>
  );
}
