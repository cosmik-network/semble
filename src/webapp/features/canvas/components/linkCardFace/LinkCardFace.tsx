'use client';

import { Box, Card, Stack } from '@mantine/core';
import LinkCardContent from '@/features/cards/components/urlCardContent/LinkCardContent';
import NoteCardInline from '@/features/notes/components/noteCardInline/NoteCardInline';
import {
  LINK_CARD_WIDTH,
  NOTE_LINES,
  linkCardLayout,
  linkCardParts,
} from '../../model/linkCards';
import useCanvasLink from '../../lib/queries/useCanvasLink';

interface Props {
  url: string;
  height: number;
}

// Takes no clicks: the selection popup holds the card's actions
export default function LinkCardFace(props: Props) {
  const { data: link } = useCanvasLink(props.url);
  const layout = linkCardLayout(linkCardParts(link));

  return (
    <Card
      withBorder
      radius="lg"
      p={layout.padding}
      w={LINK_CARD_WIDTH}
      h={props.height}
      shadow="none"
      style={{ pointerEvents: 'none' }}
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
  );
}
