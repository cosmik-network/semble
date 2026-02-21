import { Container, Stack, Group, Skeleton } from '@mantine/core';
import { Fragment } from 'react';

export default function ProfileHeaderSkeleton() {
  return (
    <Fragment>
      {/* Banner */}
      <Skeleton h={150} radius={0} />

      <Container p={0} size={'xl'}>
        <Stack gap={'sm'} p={'xs'}>
          <Stack gap={'xs'}>
            <Group justify="space-between" align="start">
              {/* Avatar */}
              <Skeleton
                h={95}
                w={95}
                mt={'-57.5'}
                radius={'lg'}
                style={{
                  border: '2.5px solid var(--mantine-color-body)',
                }}
              />

              {/* Follow button skeleton */}
              <Skeleton w={100} h={36} radius={'xl'} mt={4} />
            </Group>

            {/* Profile info */}
            <Stack gap={'sm'}>
              <Stack gap={0}>
                {/* Name */}
                <Skeleton w={'30%'} h={32} mb={4} />

                <Group gap={'xs'}>
                  {/* Handle */}
                  <Skeleton w={'40%'} h={24} />

                  {/* Bluesky badge */}
                  <Skeleton w={26} h={26} radius={'xl'} />
                </Group>
              </Stack>

              {/* Description */}
              <Stack gap={'xs'}>
                <Skeleton w={'80%'} h={20} />
                <Skeleton w={'70%'} h={20} />
              </Stack>

              {/* Follow stats */}
              <Group gap="sm">
                {/* Followers */}
                <Skeleton w={100} h={21} />
                {/* Following */}
                <Skeleton w={90} h={21} />
                {/* Collection Following */}
                <Skeleton w={150} h={21} />
              </Group>
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Fragment>
  );
}
