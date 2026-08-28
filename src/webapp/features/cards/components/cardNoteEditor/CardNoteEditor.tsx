'use client';

import { Dispatch, SetStateAction, useState } from 'react';
import {
  Button,
  Group,
  Stack,
  Text,
  Textarea,
  VisuallyHidden,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { BsExclamation, BsTrash2Fill } from 'react-icons/bs';
import useRemoveCardFromLibrary from '../../lib/mutations/useRemoveCardFromLibrary';

export const MAX_NOTE_LENGTH = 500;

interface Props {
  note?: string;
  onChange: Dispatch<SetStateAction<string | undefined>>;
  noteId?: string;
  onDeleted: () => void;
  onCancel: () => void;
}

export default function CardNoteEditor(props: Props) {
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const removeNote = useRemoveCardFromLibrary();

  const handleDeleteNote = () => {
    if (!props.noteId) return;

    removeNote.mutate(props.noteId, {
      onError: () => {
        notifications.show({
          message: 'Could not delete note',
          color: 'red',
          autoClose: 5000,
          withCloseButton: true,
          position: 'top-center',
          icon: <BsExclamation />,
        });
      },
      onSettled: () => {
        props.onDeleted();
      },
    });
  };

  return (
    <Stack gap={'xs'}>
      <Textarea
        id="note"
        aria-label="Your note"
        placeholder="Add a note about this card"
        variant="filled"
        size="md"
        rows={2}
        autoFocus
        maxLength={MAX_NOTE_LENGTH}
        aria-describedby="note-char-remaining"
        value={props.note ?? ''}
        onChange={(e) => props.onChange(e.currentTarget.value)}
      />
      <VisuallyHidden id="note-char-remaining" aria-live="polite">
        {`${MAX_NOTE_LENGTH - (props.note?.length ?? 0)} characters remaining`}
      </VisuallyHidden>

      {showDeleteWarning ? (
        <Group justify="space-between" gap={'xs'} wrap="nowrap">
          <Text fw={500} c="red">
            Delete note?
          </Text>
          <Group gap={'xs'} wrap="nowrap">
            <Button
              variant="light"
              color="gray"
              size="xs"
              disabled={removeNote.isPending}
              onClick={() => setShowDeleteWarning(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              size="xs"
              onClick={handleDeleteNote}
              loading={removeNote.isPending}
            >
              Delete
            </Button>
          </Group>
        </Group>
      ) : (
        <Group justify="space-between" gap={'xs'} wrap="nowrap" mih={26}>
          <Text c={'gray'} fz={'sm'} aria-hidden>
            {props.note?.length ?? 0} / {MAX_NOTE_LENGTH}
          </Text>
          <Group gap={'xs'} wrap="nowrap">
            {props.noteId && (
              <Button
                variant="light"
                size="xs"
                color="red"
                leftSection={<BsTrash2Fill />}
                onClick={() => setShowDeleteWarning(true)}
              >
                Delete note
              </Button>
            )}
            <Button
              variant="light"
              size="xs"
              color="gray"
              onClick={props.onCancel}
            >
              Cancel
            </Button>
          </Group>
        </Group>
      )}
    </Stack>
  );
}
