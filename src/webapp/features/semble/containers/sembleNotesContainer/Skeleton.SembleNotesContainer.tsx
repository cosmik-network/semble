import NoteCardSkeleton from '@/features/notes/components/noteCard/Skeleton.NoteCard';
import { Grid, GridCol, Stack } from '@mantine/core';

export default function SembleNotesContainerSkeleton() {
  return (
    <Stack>
      <Grid gap="xs">
        {Array.from({ length: 8 }).map((_, i) => (
          <GridCol key={i} span={{ base: 12, xs: 6, sm: 4, lg: 3 }}>
            <NoteCardSkeleton />
          </GridCol>
        ))}
      </Grid>
    </Stack>
  );
}
