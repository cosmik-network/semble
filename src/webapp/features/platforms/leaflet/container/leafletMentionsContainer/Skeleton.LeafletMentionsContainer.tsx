import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import { Grid, GridCol, Stack } from '@mantine/core';

export default function LeafletMentionsContainerSkeleton() {
  return (
    <Stack>
      <Grid gutter="sm" mx={'auto'} maw={600}>
        {Array.from({ length: 8 }).map((_, i) => (
          <GridCol key={i} span={12}>
            <UrlCardSkeleton />
          </GridCol>
        ))}
      </Grid>
    </Stack>
  );
}
