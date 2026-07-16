import {
  AspectRatio,
  Card,
  Center,
  Group,
  Text,
  Image,
  Box,
  Stack,
} from '@mantine/core';
import { useScroller } from '@mantine/hooks';
import { BiWorld } from 'react-icons/bi';
import { getDomain } from '@/lib/utils/link';
import useCollection from '../../lib/queries/useCollection';
import { useState } from 'react';
import { UrlCard } from '@semble/types';

interface Props {
  rkey: string;
  handle: string;
}

const CARD_WIDTH = 110;

function PreviewCard(props: { card: UrlCard }) {
  const [imageError, setImageError] = useState(false);
  const cardContent = props.card.cardContent;
  const domain = getDomain(cardContent.url);
  const hasImage = cardContent.imageUrl && !imageError;

  return (
    <Box w={CARD_WIDTH} miw={CARD_WIDTH}>
      <AspectRatio ratio={16 / 9}>
        {hasImage ? (
          <Image
            src={cardContent.imageUrl}
            alt={`${cardContent.url} social preview image`}
            radius={'md'}
            fit="cover"
            draggable={false}
            onError={() => setImageError(true)}
          />
        ) : (
          <Card p={'xs'} radius={'md'} withBorder>
            <Center my={'auto'}>
              <BiWorld size={24} color="var(--mantine-color-dimmed)" />
            </Center>
          </Card>
        )}
      </AspectRatio>
      <Stack gap={0} mt={6}>
        <Text c={'gray'} fz={11} lineClamp={1}>
          {domain}
        </Text>
        {cardContent.title && (
          <Text c={'bright'} fz={12} fw={500} lineClamp={2}>
            {cardContent.title}
          </Text>
        )}
      </Stack>
    </Box>
  );
}

export default function CollectionCardPreview(props: Props) {
  const scroller = useScroller();

  const { data } = useCollection({
    rkey: props.rkey,
    handle: props.handle,
    limit: 6,
  });

  const cards = data?.pages.flatMap((col) => col.urlCards) ?? [];

  if (cards.length === 0) return null;

  return (
    <Box
      ref={scroller.ref}
      {...scroller.dragHandlers}
      style={{
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
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
