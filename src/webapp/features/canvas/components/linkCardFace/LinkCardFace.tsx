'use client';

import { Badge, Box, Card, Stack } from '@mantine/core';
import type { TLShapeId } from 'tldraw';
import LinkCardContent from '@/features/cards/components/urlCardContent/LinkCardContent';
import NoteCardInline from '@/features/notes/components/noteCardInline/NoteCardInline';
import {
  LINK_CARD_WIDTH,
  NOTE_LINES,
  linkCardLayout,
  linkCardParts,
} from '../../model/linkCards';
import { useCopyState } from '../../lib/canvasCopiesContext';
import useCanvasLink from '../../lib/queries/useCanvasLink';
import EdgeDots from '../edgeDots/EdgeDots';

interface Props {
  id: TLShapeId;
  url: string;
  height: number;
}

// Only its edge dots take clicks: the selection popup holds the card's actions
export default function LinkCardFace(props: Props) {
  const { data: link } = useCanvasLink(props.url);
  const layout = linkCardLayout(linkCardParts(link));
  const copyState = useCopyState(props.id, props.url);

  return (
    <Box pos="relative">
      <Card
        withBorder
        radius="lg"
        p={layout.padding}
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
        <Stack gap={layout.gap}>
          <Box h={layout.contentHeight} style={{ overflow: 'hidden' }}>
            <LinkCardContent
              cardContent={link?.metadata ?? { url: props.url }}
              cardView="grid"
            />
          </Box>
          {link?.note && (
            <Box h={layout.noteHeight} style={{ overflow: 'hidden' }}>
              <NoteCardInline
                note={link.note}
                cardAuthor={link.note.author}
                lineClamp={NOTE_LINES}
              />
            </Box>
          )}
        </Stack>
      </Card>
      {copyState.count > 1 && (
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
