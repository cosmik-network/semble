'use client';

import {
  Container,
  Group,
  Stack,
  Text,
  Image,
  Card,
  Button,
  Badge,
  Skeleton,
} from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';
import Link from 'next/link';
import { LuLibrary } from 'react-icons/lu';
import { MdOutlineStickyNote2 } from 'react-icons/md';
import { BiCollection, BiLink } from 'react-icons/bi';
import UrlCardContent from '@/features/cards/components/urlCardContent/UrlCardContent';
import useUrlMetadata from '@/features/cards/lib/queries/useUrlMetadata';
import { useRouter } from 'next/navigation';
import { isCollectionPage, isProfilePage } from '@/lib/utils/link';

interface Props {
  url: string;
}

export default function UrlEmbedContainer(props: Props) {
  const { data, isPending } = useUrlMetadata({
    url: props.url,
    includeStats: true,
  });

  const router = useRouter();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:4000';
  const stats = data?.stats;
  const metadata = (data as any)?.metadata;

  const handleCardClick = () => {
    if (isCollectionPage(props.url) || isProfilePage(props.url)) {
      router.push(props.url);
      return;
    }
    router.push(`/url?id=${encodeURIComponent(props.url)}`);
  };

  if (isPending) {
    return (
      <Container p={0} fluid h="100svh" style={{ overflow: 'hidden' }}>
        <Skeleton w={'100%'} h={'100%'} radius={'lg'} />
      </Container>
    );
  }

  if (!data || !metadata) {
    return (
      <Container p={0} fluid h="100svh" style={{ overflow: 'hidden' }}>
        <Stack justify="center" align="center" h="100%">
          <Text c="dimmed">URL not found</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container p={0} fluid h="100svh" style={{ overflow: 'hidden' }}>
      <Stack justify="space-between" h="100%">
        {/* Center: card + stats */}
        <Stack gap="xs" align="center">
          <Card
            component="article"
            radius="lg"
            p="xs"
            withBorder
            style={{ cursor: 'pointer', maxWidth: '600px', width: '100%' }}
            onClick={handleCardClick}
          >
            <Stack justify="space-between" gap="xs" flex={1}>
              <UrlCardContent
                url={props.url}
                uri={undefined}
                cardContent={{ ...metadata, url: metadata.url || props.url }}
              />
              {stats && (
                <Group gap="xs" justify="center">
                  <Badge
                    variant="light"
                    color="orange"
                    size="sm"
                    leftSection={<LuLibrary />}
                  >
                    {stats.libraryCount}{' '}
                    {stats.libraryCount === 1 ? 'save' : 'saves'}
                  </Badge>
                  <Badge
                    variant="light"
                    color="grape"
                    size="sm"
                    leftSection={<BiCollection />}
                  >
                    {stats.collectionCount}{' '}
                    {stats.collectionCount === 1 ? 'collection' : 'collections'}
                  </Badge>
                  <Badge
                    variant="light"
                    color="green"
                    size="sm"
                    leftSection={<BiLink />}
                  >
                    {stats.connections?.all?.total ?? 0}{' '}
                    {stats.connections?.all?.total === 1
                      ? 'connection'
                      : 'connections'}
                  </Badge>
                  <Badge
                    variant="light"
                    color="gray"
                    size="sm"
                    leftSection={<MdOutlineStickyNote2 />}
                  >
                    {stats.noteCount} {stats.noteCount === 1 ? 'note' : 'notes'}
                  </Badge>
                </Group>
              )}
            </Stack>
          </Card>

          <Stack>
            <Button
              size="compact-xs"
              variant="transparent"
              pr={0}
              leftSection={<Image src={SembleLogo.src} h={20} />}
              component={Link}
              href={`${appUrl}/url?id=${encodeURIComponent(props.url)}`}
              target="_blank"
            >
              View on Semble
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Container>
  );
}
