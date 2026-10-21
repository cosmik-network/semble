import { useEffect, useState } from 'react';
import { Button, Group, Paper, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { stopEventPropagation, TLShapeId, useEditor, useValue } from 'tldraw';
import { CollectionAccessType } from '@semble/types';
import useCreateCollection from '@/features/collections/lib/mutations/useCreateCollection';
import useAddCard from '@/features/cards/lib/mutations/useAddCard';
import useUpdateCardAssociations from '@/features/cards/lib/mutations/useUpdateCardAssociations';
import { CARD_TYPE } from '../../const';
import { isCardShape, serverWrite } from '../../lib/arrows';
import { useCanvasSession } from '../../lib/canvasSession';
import { convertFrameToCollection } from '../../lib/frames';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import styles from './CollectionNamePrompt.module.css';

export default function CollectionNamePrompt() {
  const editor = useEditor();
  const session = useCanvasSession();
  const createCollection = useCreateCollection();
  const updateAssociations = useUpdateCardAssociations();
  const addCard = useAddCard();
  const { data: profile } = useMyProfile();
  const frameId = useValue(session.pendingFrameId);
  const [name, setName] = useState('');

  const frameExists = useValue(
    'pending frame exists',
    () => !!frameId && !!editor.getShape(frameId),
    [editor, frameId],
  );
  // Hidden while the frame is still being drawn or resized
  const anchor = useValue(
    'collection prompt anchor',
    () => {
      if (!frameId || !editor.isIn('select.idle')) return null;
      const bounds = editor.getShapePageBounds(frameId);
      return bounds
        ? editor.pageToViewport({ x: bounds.midX, y: bounds.minY })
        : null;
    },
    [editor, frameId],
  );

  useEffect(() => {
    if (frameId && !frameExists) session.pendingFrameId.set(null);
  }, [frameId, frameExists, session]);

  if (!frameId || !anchor) return null;

  const close = () => {
    session.pendingFrameId.set(null);
    setName('');
    editor.focus();
  };

  const addChildren = (id: TLShapeId, collectionId: string) =>
    editor
      .getSortedChildIdsForParent(id)
      .map((childId) => editor.getShape(childId))
      .filter(isCardShape)
      // Two copies of a card in the frame only add it once
      .filter(
        (card, i, cards) =>
          cards.findIndex((c) => c.props.url === card.props.url) === i,
      )
      .forEach((card) => {
        const request = session.track<unknown>(
          card.props.url,
          card.props.cardId
            ? updateAssociations.mutateAsync({
                cardId: card.props.cardId,
                addToCollectionIds: [collectionId],
              })
            : addCard
                .mutateAsync({
                  url: card.props.url,
                  collectionIds: [collectionId],
                })
                .then((saved) =>
                  serverWrite(editor, () => {
                    if (!editor.getShape(card.id)) return;
                    editor.updateShape({
                      id: card.id,
                      type: CARD_TYPE,
                      props: { cardId: saved.urlCardId, status: 'ready' },
                    });
                  }),
                ),
        );
        request.catch(() =>
          notifications.show({
            message: `Could not add ${card.props.title || card.props.url}.`,
            color: 'red',
            position: 'top-center',
          }),
        );
      });

  const create = async () => {
    const collectionName = name.trim();
    if (!collectionName) return;
    const id = frameId;
    close();

    try {
      const { collectionId } = await createCollection.mutateAsync({
        name: collectionName,
        description: '',
        accessType: CollectionAccessType.CLOSED,
      });
      const collectionShapeId = convertFrameToCollection(editor, id, {
        collectionId,
        name: collectionName,
        description: '',
        accessType: 'CLOSED',
        authorHandle: profile.handle,
        authorAvatarUrl: profile.avatarUrl ?? '',
        rkey: '',
        readOnly: false,
      });
      if (collectionShapeId) addChildren(collectionShapeId, collectionId);
    } catch {
      notifications.show({
        message: 'Could not create collection.',
        color: 'red',
        position: 'top-center',
      });
    }
  };

  return (
    <Paper
      className={styles.root}
      style={{ left: anchor.x, top: anchor.y }}
      shadow="md"
      radius="lg"
      p="sm"
      withBorder
      onPointerDown={stopEventPropagation}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') close();
        if (e.key === 'Enter') create();
      }}
    >
      <Stack gap="xs">
        <Text size="sm" fw={600}>
          Make this a collection?
        </Text>
        <TextInput
          size="xs"
          placeholder="Collection name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          autoFocus
        />
        <Text size="xs" c="dimmed">
          Cards you drop into it are added to the collection.
        </Text>
        <Group justify="flex-end" gap={6}>
          <Button size="xs" variant="subtle" color="gray" onClick={close}>
            Keep as frame
          </Button>
          <Button size="xs" disabled={!name.trim()} onClick={create}>
            Create collection
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
