import { Box, Card, Center, Group } from '@mantine/core';
import { useScroller } from '@mantine/hooks';
import { BiWorld } from 'react-icons/bi';
import useCollection from '../../lib/queries/useCollection';
import { UrlCard } from '@semble/types';
import ThumbnailPreviewCard, {
  THUMBNAIL_CARD_WIDTH,
} from '@/components/contentDisplay/thumbnailPreviewCard/ThumbnailPreviewCard';

interface Props {
  rkey: string;
  handle: string;
}

function PreviewCard(props: { card: UrlCard }) {
  const cardContent = props.card.cardContent;

  return (
    <Box w={THUMBNAIL_CARD_WIDTH} miw={THUMBNAIL_CARD_WIDTH}>
      <ThumbnailPreviewCard
        imageUrl={cardContent.imageUrl}
        title={cardContent.title}
        url={cardContent.url}
        fallback={
          <Card p="xs" radius="md" withBorder>
            <Center my="auto">
              <BiWorld size={24} color="var(--mantine-color-dimmed)" />
            </Center>
          </Card>
        }
      />
    </Box>
  );
}

const FADE_WIDTH = 28;

export default function CollectionCardPreview(props: Props) {
  const scroller = useScroller();

  const { data } = useCollection({
    rkey: props.rkey,
    handle: props.handle,
    limit: 6,
  });

  const cards = data?.pages.flatMap((col) => col.urlCards) ?? [];

  if (cards.length === 0) return null;

  // Fade the overflowing edges (left/right) instead of cutting them off,
  // toggled by whether there's more content to scroll in each direction.
  const maskImage =
    scroller.canScrollStart || scroller.canScrollEnd
      ? `linear-gradient(to right, ${
          scroller.canScrollStart ? 'transparent' : '#000'
        }, #000 ${FADE_WIDTH}px, #000 calc(100% - ${FADE_WIDTH}px), ${
          scroller.canScrollEnd ? 'transparent' : '#000'
        })`
      : undefined;

  return (
    <Box
      ref={scroller.ref}
      {...scroller.dragHandlers}
      style={{
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        maskImage,
        WebkitMaskImage: maskImage,
      }}
    >
      <Group gap={'xs'} grow={cards.length > 2} wrap="nowrap" align="start">
        {cards.map((c) => (
          <PreviewCard key={c.id} card={c} />
        ))}
      </Group>
    </Box>
  );
}
