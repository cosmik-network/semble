'use client';

import {
  Box,
  Container,
  Group,
  Stack,
  Text,
  Avatar,
  Card,
  ActionIcon,
  Image,
  Anchor,
  Button,
  Tooltip,
  Badge,
} from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';
import Link from 'next/link';
import UrlCardContent from '@/features/cards/components/urlCardContent/UrlCardContent';
import { isCollectionPage, isProfilePage } from '@/lib/utils/link';
import useCollection from '../../lib/queries/useCollection';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CollectionAccessType } from '@semble/types';
import {
  RpcSessionProvider,
  useRpcSession,
} from '@/lib/embed/rpcSessionProvider';
import { FaSeedling } from 'react-icons/fa6';

interface Props {
  rkey: string;
  handle: string;
  mode?: 'edit' | 'view';
}

function CollectionGalleryContent(props: Props) {
  const { data } = useCollection({
    rkey: props.rkey,
    handle: props.handle,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const firstPage = data.pages[0];
  const allCards = data.pages.flatMap((page) => page.urlCards ?? []);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:4000';
  const router = useRouter();
  const session = useRpcSession();

  const currentCard = allCards[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allCards.length - 1;

  const goToPrev = () => {
    if (hasPrev) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const isOpen = firstPage.accessType === CollectionAccessType.OPEN;
  const darkColor = isOpen
    ? 'var(--mantine-color-green-9)'
    : 'var(--mantine-color-grape-9)';
  const lightColor = isOpen
    ? 'var(--mantine-color-green-1)'
    : 'var(--mantine-color-grape-1)';

  return (
    <Box style={{ position: 'relative', width: '100%', height: '100svh' }}>
      {/* Dark mode gradient – all sides */}
      <Box
        lightHidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `
            linear-gradient(to bottom, ${darkColor} 0%, color-mix(in srgb, ${darkColor} 30%, transparent) 0%, transparent 6%),
            linear-gradient(to top, ${darkColor} 0%, color-mix(in srgb, ${darkColor} 30%, transparent) 0%, transparent 6%),
            linear-gradient(to right, ${darkColor} 0%, color-mix(in srgb, ${darkColor} 30%, transparent) 0%, transparent 6%),
            linear-gradient(to left, ${darkColor} 0%, color-mix(in srgb, ${darkColor} 30%, transparent) 0%, transparent 6%)
          `,
        }}
      />
      {/* Light mode gradient – all sides */}
      <Box
        darkHidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `
            linear-gradient(to bottom, ${lightColor} 0%, color-mix(in srgb, ${lightColor} 30%, transparent) 0%, transparent 6%),
            linear-gradient(to top, ${lightColor} 0%, color-mix(in srgb, ${lightColor} 30%, transparent) 0%, transparent 6%),
            linear-gradient(to right, ${lightColor} 0%, color-mix(in srgb, ${lightColor} 30%, transparent) 0%, transparent 6%),
            linear-gradient(to left, ${lightColor} 0%, color-mix(in srgb, ${lightColor} 30%, transparent) 0%, transparent 6%)
          `,
        }}
      />

      <Container
        p={'xs'}
        fluid
        h="100%"
        style={{
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Stack justify="space-between" gap={'xs'} h="100%">
          <Group justify="space-between" align="start" wrap="nowrap">
            <Stack gap={0}>
              <Group gap={'xs'}>
                <Text fw={700} c={isOpen ? 'green' : 'grape'} fz="sm">
                  Collection
                </Text>
                {isOpen && (
                  <Tooltip label="This collection is open to everyone. Add cards to help it grow.">
                    <Badge
                      color="green"
                      leftSection={<FaSeedling />}
                      variant="light"
                      size="xs"
                    >
                      Open
                    </Badge>
                  </Tooltip>
                )}
              </Group>
              <Text fw={700}>{firstPage.name}</Text>
            </Stack>

            <Group gap={5} wrap="nowrap">
              <Text fw={600} fz={'sm'} c={'dimmed'} span>
                By
              </Text>
              <Avatar
                size={'xs'}
                radius={'sm'}
                component={Link}
                href={`/profile/${firstPage.author.handle}`}
                target="_blank"
                src={firstPage.author.avatarUrl?.replace(
                  'avatar',
                  'avatar_thumbnail',
                )}
                alt={`${firstPage.author.name}'s avatar`}
              />
              <Anchor
                component={Link}
                href={`/profile/${firstPage.author.handle}`}
                target="_blank"
                fw={600}
                fz={'sm'}
                c="bright"
              >
                {firstPage.author.name}
              </Anchor>
            </Group>
          </Group>

          {allCards.length > 0 && currentCard ? (
            <Stack gap={'xs'} flex={1} style={{ overflow: 'hidden' }}>
              <Group justify="center" align="center" flex={1}>
                <Card
                  component="article"
                  radius={'lg'}
                  p={'xs'}
                  withBorder
                  style={{
                    cursor: 'pointer',
                    maxWidth: '600px',
                    width: '100%',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();

                    if (
                      isCollectionPage(currentCard.url) ||
                      isProfilePage(currentCard.url)
                    ) {
                      router.push(currentCard.url);
                      return;
                    }

                    router.push(`/url?id=${currentCard.cardContent.url}`);
                  }}
                >
                  <Stack justify="space-between" gap={'xs'} flex={1}>
                    <UrlCardContent
                      url={currentCard.url}
                      uri={currentCard.uri}
                      cardContent={currentCard.cardContent}
                    />
                  </Stack>
                </Card>
              </Group>

              <Group justify="center" align="center" gap={'xs'}>
                <ActionIcon
                  size="md"
                  variant="light"
                  color="gray"
                  radius={'xl'}
                  onClick={goToPrev}
                  disabled={!hasPrev}
                  style={{ visibility: hasPrev ? 'visible' : 'hidden' }}
                >
                  ←
                </ActionIcon>

                <Text ta="center" c="gray" fz="xs" fw={600}>
                  {currentIndex + 1} / {allCards.length}
                </Text>

                <ActionIcon
                  size="md"
                  variant="light"
                  radius={'xl'}
                  color="gray"
                  onClick={goToNext}
                  disabled={!hasNext}
                  style={{ visibility: hasNext ? 'visible' : 'hidden' }}
                >
                  →
                </ActionIcon>
              </Group>
            </Stack>
          ) : (
            <Stack align="center" gap="xs" flex={1} justify="center">
              <Text fz="sm" fw={600} c="gray">
                No cards
              </Text>
            </Stack>
          )}

          <Group justify="space-between" align="center" gap={'xs'}>
            {props.mode === 'edit' ? (
              <Button
                size="compact-xs"
                variant="transparent"
                color="gray"
                onClick={async () => {
                  if (!session || !currentCard) return;
                  await session.replaceWith({
                    type: 'embed',
                    url: `${appUrl}/embed/url?id=${encodeURIComponent(
                      currentCard.cardContent.url || currentCard.url,
                    )}`,
                    aspectRatio: '16:9',
                  });
                }}
              >
                Replace with
              </Button>
            ) : (
              <>
                <Button
                  size="compact-xs"
                  variant="transparent"
                  color="gray"
                  px={0}
                  onClick={async () => {
                    if (!session) return;
                    await session.open(
                      `${appUrl}/profile/${props.handle}/collections/${props.rkey}/embed`,
                    );
                  }}
                >
                  View Collection
                </Button>

                <Button
                  size="compact-xs"
                  variant="transparent"
                  pr={0}
                  leftSection={<Image src={SembleLogo.src} h={20} />}
                  component={Link}
                  href={`${appUrl}/profile/${props.handle}/collections/${props.rkey}`}
                  target="_blank"
                >
                  View on Semble
                </Button>
              </>
            )}
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}

export default function CollectionGalleryEmbedContainer(props: Props) {
  return (
    <RpcSessionProvider>
      <CollectionGalleryContent {...props} />
    </RpcSessionProvider>
  );
}
