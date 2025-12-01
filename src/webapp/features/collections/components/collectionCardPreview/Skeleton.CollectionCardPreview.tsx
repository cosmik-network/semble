import { AspectRatio, Grid, GridCol, Skeleton } from '@mantine/core';

export default function CollectionCardPreviewSkeleton() {
  return (
    <Grid gutter={'xs'}>
      {Array.from({ length: 4 }).map((_, i) => (
        <GridCol key={i} span={3}>
          <AspectRatio ratio={16 / 9}>
            <Skeleton radius={'md'} h={45} w={'100%'} />
          </AspectRatio>
        </GridCol>
      ))}
    </Grid>
  );
}
