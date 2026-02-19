import {
  Container,
  Stack,
  Grid,
  GridCol,
  Avatar,
  Group,
  Skeleton,
} from '@mantine/core';

export default function ProfileHeaderSkeleton() {
  return (
    <Container p={'xs'} size={'xl'}>
      <Stack gap={'sm'}>
        <Stack gap={'xl'}>
          <Grid gutter={'md'} align={'center'} grow>
            <GridCol span={'auto'}>
              <Avatar
                size={'95px'}
                mt={'-57.5'}
                radius={'lg'}
                style={{
                  border: '2.5px solid var(--mantine-color-body)',
                }}
              />
            </GridCol>
            <GridCol span={{ base: 12, xs: 10 }}>
              <Stack gap={0}>
                <Stack gap={0}>
                  {/* Name */}
                  <Skeleton w={'30%'} h={27} />

                  <Group gap={'xs'}>
                    {/* Handle */}
                    <Skeleton w={'40%'} h={22} mt={'xs'} />
                    {/* Bluesky badge */}
                    <Skeleton w={26} h={26} radius={'xl'} />
                  </Group>
                </Stack>

                {/* Description */}
                <Skeleton w={'80%'} h={22} mt={'md'} />
              </Stack>
            </GridCol>
          </Grid>
        </Stack>
      </Stack>
    </Container>
  );
}
