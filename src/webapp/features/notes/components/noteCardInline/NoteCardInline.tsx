'use client';

import {
  ActionIcon,
  Anchor,
  Button,
  Card,
  Flex,
  Group,
  Input,
  Menu,
  Stack,
  Text,
  Textarea,
  VisuallyHidden,
} from '@mantine/core';
import { IoEyeOffOutline } from 'react-icons/io5';
import { BsThreeDots, BsTrash2Fill } from 'react-icons/bs';
import { MdOutlineEdit } from 'react-icons/md';
import { notifications } from '@mantine/notifications';
import type { UrlCard, User } from '@/api-client';
import { useState } from 'react';
import { BsExclamation } from 'react-icons/bs';
import { LinkAvatar } from '@/components/link/MantineLink';
import { isBotAccount } from '@/features/platforms/bluesky/lib/utils/account';
import BotLabel from '@/features/profile/components/botLabel/BotLabel';
import useUpdateNote from '../../lib/mutations/useUpdateNote';
import useRemoveCardFromLibrary from '@/features/cards/lib/mutations/useRemoveCardFromLibrary';
import styles from './NoteCardInline.module.css';

interface Props {
  note: UrlCard['note'];
  cardContent: UrlCard['cardContent'];
  cardAuthor?: User;
  isOwner: boolean;
  onClose: () => void;
}

export default function NoteCardInline(props: Props) {
  const [noteText, setNoteText] = useState(props.note?.text ?? '');
  const [editMode, setEditMode] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const MAX_NOTE_LENGTH = 500;

  const removeNote = useRemoveCardFromLibrary();
  const updateNote = useUpdateNote();

  const handleDeleteNote = () => {
    if (!props.isOwner || !props.note) return;

    removeNote.mutate(props.note.id, {
      onError: () => {
        notifications.show({
          message: 'Could not delete note',
          position: 'top-center',
          color: 'red',
          title: 'Error',
          loading: false,
          autoClose: false,
          withCloseButton: true,
          icon: <BsExclamation />,
        });
      },
      onSettled: () => {
        props.onClose();
      },
    });
  };

  const handleUpdateNote = () => {
    if (!props.note || !noteText) {
      props.onClose();
      return;
    }

    if (props.note.text === noteText) {
      setEditMode(false);
      return;
    }

    updateNote.mutate(
      { cardId: props.note.id, note: noteText },
      {
        onError: () => {
          notifications.show({
            message: 'Could not update note',
            position: 'top-center',
            color: 'red',
            title: 'Error',
            loading: false,
            autoClose: false,
            withCloseButton: true,
            icon: <BsExclamation />,
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
      <Card
        className={styles.root}
        radius="md"
        p="sm"
        onClick={(e) => e.stopPropagation()}
      >
        <Stack gap={'xs'}>
          <Stack gap={0}>
            <Flex justify="space-between">
              <Input.Label size="md" htmlFor="note-inline">
                Your note
              </Input.Label>
              <Text c={'gray'} aria-hidden>
                {noteText.length} / {MAX_NOTE_LENGTH}
              </Text>
            </Flex>
            <Textarea
              id="note-inline"
              placeholder="Add a note about this card"
              variant="filled"
              size="md"
              autosize
              minRows={3}
              maxRows={8}
              maxLength={MAX_NOTE_LENGTH}
              value={noteText}
              onChange={(e) => setNoteText(e.currentTarget.value)}
            />
            <VisuallyHidden id="note-inline-char-remaining" aria-live="polite">
              {`${MAX_NOTE_LENGTH - noteText.length} characters remaining`}
            </VisuallyHidden>
          </Stack>
          <Group gap={'xs'} grow>
            <Button
              variant="light"
              color="gray"
              onClick={() => {
                setEditMode(false);
                setNoteText(props.note?.text ?? '');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateNote}
              loading={updateNote.isPending}
              disabled={noteText.trimEnd() === ''}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Card>
    );
  }

  return (
    <Card
      className={styles.root}
      radius="md"
      p="sm"
      onClick={(e) => e.stopPropagation()}
    >
      <Stack gap={'xs'}>
        <Group justify="space-between" wrap="nowrap">
          {props.cardAuthor ? (
            <Group gap={'5'}>
              <LinkAvatar
                href={`/profile/${props.cardAuthor.handle}`}
                src={props.cardAuthor.avatarUrl?.replace(
                  'avatar',
                  'avatar_thumbnail',
                )}
                alt={`${props.cardAuthor.handle}'s avatar`}
                size={'xs'}
                radius={'sm'}
              />
              <Anchor
                href={`/profile/${props.cardAuthor.handle}`}
                fz={'xs'}
                fw={600}
                c={'bright'}
                underline="never"
                onClick={(e) => e.stopPropagation()}
              >
                {props.cardAuthor.name || `@${props.cardAuthor.handle}`}
              </Anchor>
              {isBotAccount(props.cardAuthor) && <BotLabel />}
            </Group>
          ) : (
            <span />
          )}
          <Group gap={'xs'}>
            {props.isOwner && (
              <Menu shadow="sm" position="bottom-end">
                <Menu.Target>
                  <ActionIcon
                    variant="light"
                    color="gray"
                    size="md"
                    radius="xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <BsThreeDots size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                  <Menu.Item
                    leftSection={<MdOutlineEdit size={14} />}
                    onClick={() => setEditMode(true)}
                  >
                    Edit note
                  </Menu.Item>
                  <Menu.Item
                    color="red"
                    leftSection={<BsTrash2Fill size={14} />}
                    onClick={() => setShowDeleteWarning(true)}
                  >
                    Delete note
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
            <ActionIcon
              variant="light"
              color="gray"
              size="md"
              radius="xl"
              onClick={(e) => {
                e.stopPropagation();
                props.onClose();
              }}
            >
              <IoEyeOffOutline size={18} />
            </ActionIcon>
          </Group>
        </Group>

        {props.note && (
          <Text
            fw={500}
            fz={'sm'}
            fs={'italic'}
            c={'gray'}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              props.onClose();
            }}
          >
            {props.note.text}
          </Text>
        )}

        {showDeleteWarning && (
          <Group justify="space-between" gap={'xs'}>
            <Text fz="sm">Delete note?</Text>
            <Group gap={'xs'}>
              <Button
                color="red"
                size="xs"
                onClick={handleDeleteNote}
                loading={removeNote.isPending}
              >
                Delete
              </Button>
              <Button
                variant="light"
                color="gray"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteWarning(false);
                }}
              >
                Cancel
              </Button>
            </Group>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
