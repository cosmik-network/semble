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
  Button,
} from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';
import Link from 'next/link';
import UrlCardContent from '@/features/cards/components/urlCardContent/UrlCardContent';
import useUrlMetadata from '@/features/cards/lib/queries/useUrlMetadata';
import useAddCard from '@/features/cards/lib/mutations/useAddCard';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { isCollectionPage, isProfilePage } from '@/lib/utils/link';
import { CardSaveSource } from '@/features/analytics/types';

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
  const [hasStorageAccess, setHasStorageAccess] = useState(false);
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);

  const addCardMutation = useAddCard({
    saveSource: CardSaveSource.SEMBLE_PAGE,
    pagePath: '/embed/url',
  });

  const handleCardClick = () => {
    if (isCollectionPage(props.url) || isProfilePage(props.url)) {
      router.push(props.url);
      return;
    }
    router.push(`/url?id=${encodeURIComponent(props.url)}`);
  };

  const requestStorageAccess = async () => {
    if (!document.requestStorageAccess) {
      // Storage Access API not supported
      notifications.show({
        title: 'Browser not supported',
        message: 'Your browser does not support the Storage Access API',
        color: 'red',
      });
      return false;
    }

    try {
      setIsRequestingAccess(true);

      // Check if we already have storage access
      const hasAccess = await document.hasStorageAccess();
      if (hasAccess) {
        setHasStorageAccess(true);
        return true;
      }

      // Request storage access
      await document.requestStorageAccess();
      setHasStorageAccess(true);
      return true;
    } catch (error) {
      console.error('Storage access denied:', error);
      notifications.show({
        title: 'Access denied',
        message: 'Please allow cookies for this site to save to library',
        color: 'red',
      });
      return false;
    } finally {
      setIsRequestingAccess(false);
    }
  };

  const handleSaveToLibrary = async () => {
    // First ensure we have storage access
    const hasAccess = hasStorageAccess || (await requestStorageAccess());

    if (!hasAccess) {
      return;
    }

    try {
      await addCardMutation.mutateAsync({
        url: props.url,
      });

      notifications.show({
        title: 'Success',
        message: 'URL saved to library',
        color: 'green',
      });
    } catch (error) {
      console.error('Failed to save to library:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save to library. Please try again.',
        color: 'red',
      });
    }
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
          <Group gap="xs">
            <Button
              size="compact-xs"
              variant="light"
              onClick={handleSaveToLibrary}
              loading={addCardMutation.isPending || isRequestingAccess}
              disabled={addCardMutation.isPending || isRequestingAccess}
            >
              Save to Library
            </Button>
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
