import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import {
  Button,
  Combobox,
  Grid,
  GridCol,
  Group,
  Select,
  Skeleton,
  Stack,
} from '@mantine/core';

export default function SembleMentionsContainerSkeleton() {
  return (
    <Stack gap={'xs'} align="center">
      <Group justify="space-between" w={'100%'} maw={600}>
        <Combobox>
          <Combobox.Target>
            <Button variant="light" color="gray" loading>
              <Skeleton height={16} width={60} />
            </Button>
          </Combobox.Target>
        </Combobox>
        <Select ml={'auto'} size="sm" variant="filled" disabled />
      </Group>
      <Stack>
        <Grid gutter="sm" mx={'auto'} maw={600}>
          {Array.from({ length: 8 }).map((_, i) => (
            <GridCol key={i} span={12}>
              <UrlCardSkeleton />
            </GridCol>
          ))}
        </Grid>
      </Stack>
    </Stack>
  );
}
