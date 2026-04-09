import {
  Card,
  Stack,
  Group,
  Skeleton,
  Grid,
  GridCol,
  ThemeIcon,
  Box,
} from '@mantine/core';
import { IoArrowDown, IoArrowForward } from 'react-icons/io5';
import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import styles from './ProfileConnectionItem.module.css';

export default function ProfileConnectionItemSkeleton() {
  return (
    <Card radius={'lg'} p={'xs'} className={styles.root}>
      <Stack gap={'xs'}>
        <Group justify="space-between" align="center">
          <Stack gap={'xs'}>
            <Group gap={'xs'}>
              {/* Avatar */}
              <Skeleton w={26} h={26} />
              {/* User name and timestamp */}
              <Skeleton w={150} h={16} />
            </Group>
          </Stack>
        </Group>

        <Grid gutter={'xs'} align="center">
          {/* Source URL */}
          <GridCol span={{ base: 12, sm: 4.75 }}>
            <UrlCardSkeleton />
          </GridCol>

          {/* Connection Metadata */}
          <GridCol span={{ base: 12, sm: 2.5 }}>
            <Card p={0} radius={'md'} bg={'transparent'}>
              <Group justify="center" wrap="nowrap" align="center">
                <Stack gap={0} align="center">
                  <Stack align="center" gap={'xs'}>
                    <ThemeIcon
                      color="gray"
                      variant="light"
                      radius={'xl'}
                      hiddenFrom="sm"
                    >
                      <IoArrowDown size={18} />
                    </ThemeIcon>

                    <ThemeIcon
                      color="gray"
                      variant="light"
                      radius={'xl'}
                      visibleFrom="sm"
                    >
                      <IoArrowForward />
                    </ThemeIcon>

                    <Skeleton w={100} h={26} radius={'xl'} />
                  </Stack>
                </Stack>
              </Group>
            </Card>
          </GridCol>

          {/* Target URL */}
          <GridCol span={{ base: 12, sm: 4.75 }}>
            <UrlCardSkeleton />
          </GridCol>
        </Grid>
      </Stack>
    </Card>
  );
}
