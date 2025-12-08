import {
  AspectRatio,
  Card,
  Grid,
  Skeleton,
  Stack,
  GridCol,
} from '@mantine/core';

export default function CollectionCardSkeleton() {
  return (
    <Card withBorder radius={'lg'} p={'sm'}>
      <Stack justify="space-between" h={'100%'} gap={'lg'}>
        <Stack gap={5}>
          {/* Title */}
          <Skeleton w={'100%'} h={14} />
          {/* Description */}
          <Stack gap={5}>
            <Skeleton w={'100%'} h={14} />
          </Stack>
          <Grid gutter={'xs'}>
            {Array.from({ length: 4 }).map((_, i) => (
              <GridCol key={i} span={3}>
                <AspectRatio ratio={16 / 9}>
                  <Skeleton radius={'md'} h={45} w={'100%'} />
                </AspectRatio>
              </GridCol>
            ))}
          </Grid>
        </Stack>
        {/* Collection metadata */}
        <Skeleton w={'80%'} h={10} />
      </Stack>
    </Card>
  );
}
