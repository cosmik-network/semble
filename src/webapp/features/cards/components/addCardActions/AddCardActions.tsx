'use client';

import { Dispatch, SetStateAction, useState } from 'react';
import useRemoveCardFromLibrary from '../../lib/mutations/useRemoveCardFromLibrary';
import { notifications } from '@mantine/notifications';
import {
  ActionIcon,
  Button,
  Card,
  Flex,
  Group,
  Input,
  Stack,
  Text,
  Textarea,
  Tooltip,
  VisuallyHidden,
} from '@mantine/core';
import { BsExclamation, BsTrash2Fill } from 'react-icons/bs';
import { MdOutlineStickyNote2 } from 'react-icons/md';
import NoteTextarea from '@/components/input/noteTextarea/NoteTextarea';

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
          message: 'Could not delete note',
          color: 'red',
          autoClose: 5000,
          withCloseButton: true,
          position: 'top-center',
          icon: <BsExclamation />,
        });
      },
      onSettled: () => {
        props.onClose();
      },
    });
  };

  if (noteMode) {
    return (
      <Card withBorder component="article" p={'xs'} radius={'lg'}>
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

            <NoteTextarea
              id="note"
              placeholder="Add a note about this card"
              variant="filled"
              size="md"
              rows={3}
              maxLength={MAX_NOTE_LENGTH}
              aria-describedby="note-char-remaining"
              value={note ?? ''}
              onValueChange={setNote}
            />
            <VisuallyHidden id="note-char-remaining" aria-live="polite">
              {`${MAX_NOTE_LENGTH - (note?.length ?? 0)} characters remaining`}
            </VisuallyHidden>
          </Stack>
          {showDeleteWarning ? (
            <Group justify="space-between" gap={'xs'} wrap="nowrap">
              <Text fw={500} c="red">
                Delete note?
              </Text>
              <Group gap={'xs'} wrap="nowrap">
                <Button
                  variant="light"
                  color="gray"
                  size="md"
                  disabled={removeNote.isPending}
                  onClick={() => setShowDeleteWarning(false)}
                >
                  Cancel
                </Button>
                <Button
                  color="red"
                  size="md"
                  onClick={handleDeleteNote}
                  loading={removeNote.isPending}
                >
                  Delete
                </Button>
              </Group>
            </Group>
          ) : (
            <Group gap={'xs'} wrap="nowrap">
              {props.noteId && (
                <Tooltip label="Delete note">
                  <ActionIcon
                    size={36}
                    radius="xl"
                    variant="light"
                    color="red"
                    aria-label="Delete note"
                    onClick={() => setShowDeleteWarning(true)}
                  >
                    <BsTrash2Fill size={14} />
                  </ActionIcon>
                </Tooltip>
              )}
              <Button
                variant="light"
                color="gray"
                size="md"
                onClick={() => {
                  setNoteMode(false);
                  setNote(props.note);
                }}
              >
                Cancel
              </Button>
              <Button
                size="md"
                style={{ flex: 1 }}
                onClick={() => {
                  props.onUpdateNote(note);
                  setNoteMode(false);
                }}
                disabled={note?.trimEnd() === ''}
              >
                Ok
              </Button>
            </Group>
          )}
        </Stack>
      </Card>
    );
  }

  return (
    <Button
      variant="light"
      size="xs"
      color="gray"
      w="fit-content"
      leftSection={<MdOutlineStickyNote2 />}
      onClick={(e) => {
        e.stopPropagation();
        setShowDeleteWarning(false);
        setNoteMode(true);
      }}
    >
      {note ? 'Edit note' : 'Add note'}
    </Button>
  );
}
