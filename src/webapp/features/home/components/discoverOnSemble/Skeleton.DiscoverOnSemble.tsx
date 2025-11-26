import { Button, Grid, GridCol, Group, Stack, Title } from '@mantine/core';
import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import Link from 'next/link';
import { MdOutlineEmojiNature } from 'react-icons/md';

export default function DiscoverOnSembleSkeleton() {
  return (
    <Stack>
      <Group justify="space-between">
        <Group gap="xs">
          <MdOutlineEmojiNature size={22} />
          <Title order={2}>Discover on Semble</Title>
        </Group>
        <Button variant="light" component={Link} color="blue" href={'/explore'}>
          View all
        </Button>
      </Group>

      <Grid gutter="md">
        {Array.from({ length: 3 }).map((_, i) => (
          <GridCol key={i} span={{ base: 12, sm: 4 }}>
            <UrlCardSkeleton />
          </GridCol>
        ))}
      </Grid>
    </Stack>
  );
}
