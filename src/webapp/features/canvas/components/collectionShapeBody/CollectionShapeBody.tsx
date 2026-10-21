import { useState } from 'react';
import {
  ActionIcon,
  Avatar,
  Group,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { stopEventPropagation, useEditor, useValue } from 'tldraw';
import {
  LuChevronDown,
  LuChevronUp,
  LuExternalLink,
  LuLayoutGrid,
  LuLock,
  LuPencil,
} from 'react-icons/lu';
import { CARD_TYPE, COLLECTION_HEADER_H } from '../../const';
import {
  arrangeCollection,
  openCollectionPage,
  toggleCollapsed,
} from '../../lib/frames';
import { useCanvasSession } from '../../lib/canvasSession';
import {
  useIsMyCollection,
  useRenameCollection,
} from '../../lib/useRenameCollection';
import type { CollectionShape } from '../../shapes/collectionShape/CollectionShapeUtil';
import styles from './CollectionShapeBody.module.css';

interface Props {
  shape: CollectionShape;
}

export default function CollectionShapeBody(props: Props) {
  const editor = useEditor();
  const p = props.shape.props;
  const shapeId = props.shape.id;
  const session = useCanvasSession();
  const isMine = useIsMyCollection(props.shape);
  const rename = useRenameCollection(editor);
  const renaming = useValue(
    'renaming collection',
    () => session.renamingCollectionId.get() === shapeId,
    [session, shapeId],
  );

  const cardCount = useValue(
    'collection card count',
    () =>
      editor
        .getSortedChildIdsForParent(shapeId)
        .filter((id) => editor.getShape(id)?.type === CARD_TYPE).length,
    [editor, shapeId],
  );
  // tldraw hints a container while shapes are dragged over it
  const hinted = useValue(
    'collection drop target',
    () => editor.getHintingShapeIds().includes(shapeId),
    [editor, shapeId],
  );

  const controls = [
    ...(isMine
      ? [
          {
            label: 'Rename',
            icon: <LuPencil />,
            onClick: () => session.renamingCollectionId.set(shapeId),
          },
        ]
      : []),
    {
      label: 'Open collection',
      icon: <LuExternalLink />,
      onClick: () => openCollectionPage(editor, shapeId),
    },
    ...(p.collapsed
      ? []
      : [
          {
            label: 'Re-arrange cards',
            icon: <LuLayoutGrid />,
            onClick: () => arrangeCollection(editor, shapeId),
          },
        ]),
    {
      label: p.collapsed ? 'Expand' : 'Collapse',
      icon: p.collapsed ? <LuChevronDown /> : <LuChevronUp />,
      onClick: () => toggleCollapsed(editor, shapeId),
    },
  ];

  return (
    <div
      className={styles.root}
      data-hinted={hinted || undefined}
      data-collapsed={p.collapsed || undefined}
    >
      <Group
        className={styles.header}
        h={COLLECTION_HEADER_H}
        px="md"
        justify="space-between"
        wrap="nowrap"
        gap="md"
      >
        <Stack gap={0} miw={0}>
          <Group gap={6} wrap="nowrap">
            {p.readOnly && (
              <Tooltip label="Someone else's collection, read only">
                <LuLock className={styles.controls} size={14} />
              </Tooltip>
            )}
            {renaming && isMine ? (
              <NameInput
                initial={p.name}
                onDone={(name) => {
                  session.renamingCollectionId.set(null);
                  if (name !== null) rename(shapeId, name);
                  editor.focus();
                }}
              />
            ) : (
              <Text
                fw={600}
                lineClamp={1}
                c={p.accessType === 'OPEN' ? 'green' : 'bright'}
              >
                {p.name || 'Untitled collection'}
              </Text>
            )}
          </Group>
          {p.description && (
            <Text fz="sm" c="gray" lineClamp={1}>
              {p.description}
            </Text>
          )}
        </Stack>
        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Text c="gray" fz="sm">
            {cardCount} {cardCount === 1 ? 'card' : 'cards'}
          </Text>
          {p.authorHandle && (
            <Avatar
              src={
                p.authorAvatarUrl.replace('avatar', 'avatar_thumbnail') || null
              }
              alt={`${p.authorHandle}'s avatar`}
              size="sm"
            />
          )}
          <Group
            gap={0}
            wrap="nowrap"
            className={styles.controls}
            onPointerDown={stopEventPropagation}
          >
            {controls.map((c) => (
              <Tooltip key={c.label} label={c.label}>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="gray"
                  aria-label={c.label}
                  onClick={c.onClick}
                >
                  {c.icon}
                </ActionIcon>
              </Tooltip>
            ))}
          </Group>
        </Group>
      </Group>
    </div>
  );
}

function NameInput(props: {
  initial: string;
  onDone: (name: string | null) => void;
}) {
  const [value, setValue] = useState(props.initial);
  const [done, setDone] = useState(false);
  const finish = (name: string | null) => {
    if (done) return;
    setDone(true);
    props.onDone(name);
  };

  return (
    <TextInput
      className={styles.controls}
      size="xs"
      w={240}
      autoFocus
      value={value}
      aria-label="Collection name"
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setValue(e.currentTarget.value)}
      onPointerDown={stopEventPropagation}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') finish(value);
        if (e.key === 'Escape') finish(null);
      }}
      onBlur={() => finish(value)}
    />
  );
}
