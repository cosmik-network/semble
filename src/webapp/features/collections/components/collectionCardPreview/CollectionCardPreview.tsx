import { AspectRatio, Card, Center, Grid, Text, Image } from '@mantine/core';
import useCollection from '../../lib/queries/useCollection';

interface Props {
  rkey: string;
  handle: string;
}

export default function CollectionCardPreview(props: Props) {
  const { data } = useCollection({
    rkey: props.rkey,
    handle: props.handle,
    limit: 4,
  });

  const cards = data?.pages.flatMap((col) => col.urlCards) ?? [];

  if (cards.length === 0) return null;

  return (
    <Grid gutter={'xs'}>
      {cards.map((c) => (
        <Grid.Col key={c.id} span={3}>
          {c.cardContent.thumbnailUrl ? (
            <AspectRatio ratio={16 / 9}>
              <Image
                src={c.cardContent.thumbnailUrl}
                alt={`${c.cardContent.url} social preview image`}
                radius={'md'}
                h={45}
                w={'100%'}
              />
            </AspectRatio>
          ) : (
            <AspectRatio ratio={16 / 9}>
              <Card p={'xs'} radius={'md'} h={45} w={'100%'} withBorder>
                <Center>
                  <Text fz={'xs'} fw={500} lineClamp={1}>
                    {c.cardContent.title ??
                      c.cardContent.description ??
                      c.cardContent.url}
                  </Text>
                </Center>
              </Card>
            </AspectRatio>
          )}
        </Grid.Col>
      ))}
    </Grid>
  );
}
