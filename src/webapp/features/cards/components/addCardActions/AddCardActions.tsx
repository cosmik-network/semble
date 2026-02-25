'use client';

import { Dispatch, SetStateAction, useState } from 'react';
import useRemoveCardFromLibrary from '../../lib/mutations/useRemoveCardFromLibrary';
import { notifications } from '@mantine/notifications';
import {
  Button,
  Card,
  Flex,
  Group,
  Input,
  Stack,
  Text,
  Textarea,
  VisuallyHidden,
} from '@mantine/core';

interface Props {
  note?: string;
  noteId?: string;
  onUpdateNote: Dispatch<SetStateAction<string | undefined>>;
  onClose: () => void;
}

export default function AddCardActions(props: Props) {
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [noteMode, setNoteMode] = useState(false);
  const [note, setNote] = useState(props.note);
  const MAX_NOTE_LENGTH = 500;

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
          <Stack gap={0}>
            <Flex justify="space-between">
              <Input.Label size="md" htmlFor="note">
                Your note
              </Input.Label>
              <Text c={'gray'} aria-hidden>
                {note?.length ?? 0} / {MAX_NOTE_LENGTH}
              </Text>
            </Flex>

            <Textarea
              id="note"
              placeholder="Add a note about this card"
              variant="filled"
              size="md"
              rows={3}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.currentTarget.value)}
            />
            <VisuallyHidden id="note-char-remaining" aria-live="polite">
              {`${MAX_NOTE_LENGTH - (note?.length ?? 0)} characters remaining`}
            </VisuallyHidden>
          </Stack>
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
            size="xs"
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
              size="xs"
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
