'use client';

import { Badge, Box, Card, Stack, Text } from '@mantine/core';
import { useEditor, useValue, type TLShapeId } from 'tldraw';
import { getDomain } from '@/lib/utils/link';
import LinkCardContent from '@/features/cards/components/urlCardContent/LinkCardContent';
import CardAuthorRow from '@/features/cards/components/cardAuthorRow/CardAuthorRow';
import NoteCardInline from '@/features/notes/components/noteCardInline/NoteCardInline';
import {
  LINK_CARD_WIDTH,
  NOTE_LINES,
  LINK_CARD_GAP,
  LINK_CARD_PADDING,
  linkCardPreview,
  shownNote,
  type EntryCard,
} from '../../model/linkCards';
import type { DetailLevel } from '../../model/detailLevel';
import { detailLevel } from '../../shapes/detailLevel';
import { useCopyState } from '../../lib/canvasCopiesContext';
import { useMediaRevealed } from '../../lib/canvasMediaRevealsContext';
import useCanvasLink from '../../lib/queries/useCanvasLink';
import EdgeDots from '../edgeDots/EdgeDots';
import LinkCardPreviewContent from './LinkCardPreviewContent';

interface Props {
  id: TLShapeId;
  url: string;
  height: number;
  // A collection entry's card, rather than the viewer's own
  entry: EntryCard | null;
}

// Only its edge dots take clicks: the selection popup holds the card's actions
export default function LinkCardFace(props: Props) {
  const { data: link } = useCanvasLink(props.url);
  const preview = linkCardPreview(link);
  const note = shownNote(link, props.entry);
  const copyState = useCopyState(props.id, props.url);
  const mediaRevealed = useMediaRevealed(props.id);
  const editor = useEditor();
  const level = useValue('detail level', () => detailLevel(editor), [editor]);
  const full = level === 'full';

  return (
    <Box pos="relative">
      <Card
        withBorder
        radius="lg"
        p={LINK_CARD_PADDING}
        w={LINK_CARD_WIDTH}
        h={props.height}
        shadow="none"
        style={{
          pointerEvents: 'none',
          outline: copyState.isOutlined
            ? '2px dashed var(--mantine-primary-color-filled)'
            : undefined,
          outlineOffset: 2,
        }}
      >
        {/* The controller sized the card to its content. The By row and the
            note take what they need, and the link's content the rest. */}
        <Stack gap={LINK_CARD_GAP} h="100%">
          <Box flex={1} mih={0} style={{ overflow: 'hidden' }}>
            {!full ? (
              <TitleOnly
                level={level}
                title={link?.metadata.title || getDomain(props.url)}
              />
            ) : link && preview.kind !== 'plain' ? (
              <LinkCardPreviewContent
                metadata={link.metadata}
                preview={preview}
                mediaRevealed={mediaRevealed}
              />
            ) : (
              <LinkCardContent
                cardContent={link?.metadata ?? { url: props.url }}
                cardView="grid"
              />
            )}
          </Box>
          {full && props.entry?.byRow && (
            <CardAuthorRow author={props.entry.author} />
          )}
          {full && note && (
            <NoteCardInline
              note={note}
              cardAuthor={note.author}
              lineClamp={NOTE_LINES}
            />
          )}
        </Stack>
      </Card>
      {full && copyState.count > 1 && (
        <Badge
          pos="absolute"
          top={-10}
          right={-10}
          variant="default"
          size="lg"
          radius="xl"
          tt="none"
          fw={600}
          style={{
            zIndex: 1,
            boxShadow: 'var(--mantine-shadow-sm)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ×{copyState.count}
        </Badge>
      )}
      <EdgeDots cardId={props.id} />
    </Box>
  );
}

interface TitleOnlyProps {
  level: Exclude<DetailLevel, 'full'>;
  title: string;
}

// What a card shows once it's too small on screen to read in full
function TitleOnly(props: TitleOnlyProps) {
  if (props.level === 'bar') {
    return (
      <Box
        h={16}
        w="80%"
        bg="var(--mantine-color-default-border)"
        style={{ borderRadius: 8 }}
      />
    );
  }

  return (
    <Text c="bright" lineClamp={2} fw={500}>
      {props.title}
    </Text>
  );
}
