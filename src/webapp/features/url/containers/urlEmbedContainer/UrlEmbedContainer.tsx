'use client';

import {
  Container,
  Group,
  Stack,
  Text,
  Image,
  Card,
  Badge,
  Box,
  ActionIcon,
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
import SembleHeaderBackground from '@/features/semble/containers/sembleContainer/SembleHeaderBackground';
import UrlEmbedContainerSkeleton from './skeleton.UrlEmbedContainer';

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
    return <UrlEmbedContainerSkeleton />;
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
    <Container p={0} fluid h="100%" style={{ overflow: 'hidden' }}>
      <SembleHeaderBackground height={40}>
        <Box mx={'xs'} my={6}>
          <ActionIcon
            size="compact-xs"
            variant="transparent"
            radius={'xs'}
            component={Link}
            href={`${appUrl}/url?id=${encodeURIComponent(props.url)}`}
            target="_blank"
          >
            <Image src={SembleLogo.src} h={24} />
          </ActionIcon>
        </Box>
      </SembleHeaderBackground>
      <Stack justify="space-between" h="100%">
        {/* Center: card + stats */}
        <Stack gap="xs" align="center">
          <Card
            component="article"
            radius="lg"
            px="xs"
            py={0}
            bg={'transparent'}
            style={{ cursor: 'pointer', width: '100%' }}
          >
            <Stack justify="space-between" flex={1}>
              <Box onClick={handleCardClick}>
                <UrlCardContent
                  url={props.url}
                  uri={undefined}
                  cardContent={{ ...metadata, url: metadata.url || props.url }}
                />
              </Box>
              {stats && (
                <Group gap="xs">
                  <Badge
                    variant="transparent"
                    color="orange"
                    size="sm"
                    px={0}
                    leftSection={<LuLibrary />}
                  >
                    {stats.libraryCount}{' '}
                    {stats.libraryCount === 1 ? 'save' : 'saves'}
                  </Badge>
                  <Badge
                    variant="transparent"
                    color="grape"
                    size="sm"
                    px={0}
                    leftSection={<BiCollection />}
                  >
                    {stats.collectionCount}{' '}
                    {stats.collectionCount === 1 ? 'collection' : 'collections'}
                  </Badge>
                  <Badge
                    variant="transparent"
                    color="green"
                    size="sm"
                    px={0}
                    leftSection={<BiLink />}
                  >
                    {stats.connections?.all?.total ?? 0}{' '}
                    {stats.connections?.all?.total === 1
                      ? 'connection'
                      : 'connections'}
                  </Badge>
                  <Badge
                    variant="transparent"
                    color="violet"
                    size="sm"
                    px={0}
                    leftSection={<MdOutlineStickyNote2 />}
                  >
                    {stats.noteCount} {stats.noteCount === 1 ? 'note' : 'notes'}
                  </Badge>
                </Group>
              )}
            </Stack>
          </Card>
        </Stack>
      </Stack>
    </Container>
  );
}
