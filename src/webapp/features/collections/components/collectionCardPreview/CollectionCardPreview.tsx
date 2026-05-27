import {
  AspectRatio,
  Card,
  Center,
  Group,
  Text,
  Image,
  Box,
} from '@mantine/core';
import { useScroller } from '@mantine/hooks';
import useCollection from '../../lib/queries/useCollection';
import { useState } from 'react';

interface Props {
  rkey: string;
  handle: string;
}

const CARD_WIDTH = 110;

export default function CollectionCardPreview(props: Props) {
  const scroller = useScroller();
  const [imageError, setImageError] = useState(false);

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
      <Group gap={'xs'} grow={cards.length > 2} wrap="nowrap">
        {cards.map((c) => (
          <Box key={c.id} w={CARD_WIDTH} miw={CARD_WIDTH}>
            {c.cardContent.imageUrl && !imageError ? (
              <AspectRatio ratio={16 / 9}>
                <Image
                  src={c.cardContent.imageUrl}
                  alt={`${c.cardContent.url} social preview image`}
                  radius={'md'}
                  fit="cover"
                  draggable={false}
                  onError={() => setImageError(true)}
                />
              </AspectRatio>
            ) : (
              <AspectRatio ratio={16 / 9}>
                <Card p={'xs'} radius={'md'} withBorder>
                  <Center my={'auto'}>
                    <Text fz={8} fw={500} lineClamp={2}>
                      {c.cardContent.title ??
                        c.cardContent.description ??
                        c.cardContent.url}
                    </Text>
                  </Center>
                </Card>
              </AspectRatio>
            )}
          </Box>
        ))}
      </Group>
    </Box>
  );
}
