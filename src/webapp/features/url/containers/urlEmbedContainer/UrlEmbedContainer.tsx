'use client';

import {
  Container,
  Group,
  Stack,
  Text,
  Image,
  Card,
  Anchor,
  Paper,
  Divider,
} from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';
import Link from 'next/link';
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
      <Container p={4} fluid h="100vh">
        <Stack justify="center" align="center" h="100%">
          <Text c="dimmed">Loading...</Text>
        </Stack>
      </Container>
    );
  }

  if (!data || !metadata) {
    return (
      <Container p={4} fluid h="100vh">
        <Stack justify="center" align="center" h="100%">
          <Text c="dimmed">URL not found</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container p={4} fluid h="100vh" style={{ overflow: 'hidden' }}>
      <Stack gap="md" h="100%">
        {/* Header */}
        <Group justify="space-between" align="center" wrap="nowrap">
          <Link href={appUrl} target="_blank">
            <Image
              src={SembleLogo.src}
              alt="Semble logo"
              height={20}
              w={'auto'}
            />
          </Link>

          <Anchor
            component={Link}
            href={`${appUrl}/url?id=${encodeURIComponent(props.url)}`}
            target="_blank"
            fz="xs"
            c="bright"
          >
            View on Semble
          </Anchor>
        </Group>

        {/* Main Content */}
        <Group align="stretch" gap="md" flex={1} style={{ overflow: 'hidden' }}>
          {/* URL Card */}
          <Card
            component="article"
            radius={'lg'}
            p={'xs'}
            withBorder
            flex={1}
            style={{
              cursor: 'pointer',
              maxWidth: '600px',
              margin: '0 auto',
            }}
            onClick={handleCardClick}
          >
            <UrlCardContent
              url={props.url}
              uri={undefined}
              cardContent={{ ...metadata, url: metadata.url || props.url }}
            />
          </Card>

          {/* Stats Panel */}
          <Paper
            radius="lg"
            p="md"
            withBorder
            w={200}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--mantine-spacing-xs)',
            }}
          >
            <Text fz="sm" fw={600} c="bright" mb="xs">
              Activity
            </Text>
            <Divider />

            <Stack gap="xs" mt="xs">
              <Group justify="space-between" wrap="nowrap">
                <Text fz="xs" c="dimmed">
                  Libraries
                </Text>
                <Text fz="xs" fw={600}>
                  {stats?.libraryCount || 0}
                </Text>
              </Group>

              <Group justify="space-between" wrap="nowrap">
                <Text fz="xs" c="dimmed">
                  Collections
                </Text>
                <Text fz="xs" fw={600}>
                  {stats?.collectionCount || 0}
                </Text>
              </Group>

              <Group justify="space-between" wrap="nowrap">
                <Text fz="xs" c="dimmed">
                  Connections
                </Text>
                <Text fz="xs" fw={600}>
                  {stats?.connections?.all?.total || 0}
                </Text>
              </Group>

              <Group justify="space-between" wrap="nowrap">
                <Text fz="xs" c="dimmed">
                  Notes
                </Text>
                <Text fz="xs" fw={600}>
                  {stats?.noteCount || 0}
                </Text>
              </Group>
            </Stack>
          </Paper>
        </Group>
      </Stack>
    </Container>
  );
}
