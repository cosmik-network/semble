'use client';

import { Dispatch, SetStateAction, useState } from 'react';
import useRemoveCardFromLibrary from '../../lib/mutations/useRemoveCardFromLibrary';
import { notifications } from '@mantine/notifications';
import { Button, Card, Group, Stack, Text, Textarea } from '@mantine/core';

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
