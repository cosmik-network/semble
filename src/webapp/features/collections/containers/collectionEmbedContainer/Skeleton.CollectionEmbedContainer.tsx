import {
  Container,
  Group,
  Select,
  Skeleton,
  Stack,
  Image,
  Text,
} from '@mantine/core';
import CollectionContainerContentSkeleton from '../collectionContainerContent/Skeleton.CollectionContainerContent';
import SembleLogo from '@/assets/semble-logo.svg';

export default function CollectionEmbedContainerSkeleton() {
  return (
    <Container p="xs" fluid>
      <Stack justify="flex-start">
        <Group justify="space-between" align="start">
          <Stack gap={'xs'} align="flex-start">
            <Image src={SembleLogo.src} alt="Semble logo" w={'auto'} h={30} />

            <Stack gap={0}>
              <Text fw={700} c="grape">
                Collection
              </Text>
              {/* Title */}
              <Skeleton w={300} h={27} />
            </Stack>
          </Stack>

          <Stack>
            {/* By */}
            <Skeleton w={100} h={24} />
          </Stack>
        </Group>

        {/* Cards */}
        <CollectionContainerContentSkeleton />
      </Stack>
    </Container>
  );
}
