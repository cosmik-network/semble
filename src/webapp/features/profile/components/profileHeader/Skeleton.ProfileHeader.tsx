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
              <Avatar size={'clamp(90px, 22vw, 100px)'} radius={'lg'} />
            </GridCol>
            <GridCol span={{ base: 12, xs: 10 }}>
              <Stack gap={0}>
                <Stack gap={0}>
                  {/* Name */}
                  <Skeleton w={'30%'} h={27} />

                  {/* Handle */}
                  <Skeleton w={'40%'} h={22} mt={'xs'} />
                </Stack>

                {/* Description */}
                <Skeleton w={'80%'} h={22} mt={'md'} />
              </Stack>
            </GridCol>
          </Grid>
        </Stack>
        <Group>
          <Skeleton w={150} h={36} radius={'xl'} />
        </Group>
      </Stack>
    </Container>
  );
}
