import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import {
  Button,
  Combobox,
  Grid,
  GridCol,
  Group,
  Select,
  Stack,
} from '@mantine/core';

export default function SembleMentionsContainerSkeleton() {
  return (
    <Stack gap={'xs'} align="center">
      <Group justify="space-between" w={'100%'} maw={600}>
        <Combobox>
          <Combobox.Target>
            <Button
              variant="light"
              color="gray"
              leftSection={<Combobox.Chevron />}
              loading
            />
          </Combobox.Target>
        </Combobox>
        <Select ml={'auto'} size="sm" variant="filled" disabled />
      </Group>
      <Stack>
        <Grid gutter="sm" mx={'auto'} maw={600}>
          {/* not necessary to check if navbar is open */}
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
