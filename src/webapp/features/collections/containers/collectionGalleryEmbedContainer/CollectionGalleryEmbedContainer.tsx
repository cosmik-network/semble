'use client';

import {
  Container,
  Group,
  Stack,
  Text,
  Title,
  Avatar,
  Card,
  ActionIcon,
} from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';
import Link from 'next/link';
import UrlCardContent from '@/features/cards/components/urlCardContent/UrlCardContent';
import { isCollectionPage, isProfilePage } from '@/lib/utils/link';
import useCollection from '../../lib/queries/useCollection';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

function usePartsPageChannel() {
  const portRef = useRef<MessagePort | null>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== 'parts.page.channel') return;
      let port = event.ports[0];
      if (!port) return;
      portRef.current = port;
    }
    window.addEventListener('message', handleMessage);

    // Request channel from parent
    window.parent.postMessage({ type: 'parts.page.connect' }, '*');

    return () => {
      window.removeEventListener('message', handleMessage);
      portRef.current?.close();
    };
  }, []);

  function send(data: { command: string; [key: string]: any }) {
    portRef.current?.postMessage(data);
  }

  return { send };
}

interface Props {
  rkey: string;
  handle: string;
}

export default function CollectionGalleryEmbedContainer(props: Props) {
  const { data, isPending } = useCollection({
    rkey: props.rkey,
    handle: props.handle,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const firstPage = data.pages[0];
  const allCards = data.pages.flatMap((page) => page.urlCards ?? []);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:4000';
  const router = useRouter();
  const { send } = usePartsPageChannel();

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

  return (
    <Container p={4} fluid h="100vh" style={{ overflow: 'hidden' }}>
      <Stack justify="space-between" h="100%" gap={4}>
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap={4} align="center">
            <Link href={appUrl} target="_blank">
              <img
                src={SembleLogo.src}
                alt="Semble logo"
                style={{ height: 20, width: 'auto' }}
              />
            </Link>
            <Text fw={700} c="grape" fz="xs">
              {firstPage.name}
            </Text>
          </Group>

          <Group gap={4} wrap="nowrap">
            <Avatar
              size={16}
              component={Link}
              href={`/profile/${firstPage.author.handle}`}
              target="_blank"
              src={firstPage.author.avatarUrl?.replace(
                'avatar',
                'avatar_thumbnail',
              )}
              alt={`${firstPage.author.name}'s avatar`}
            />
            <Link
              href={`/profile/${firstPage.author.handle}`}
              target="_blank"
              style={{
                fontWeight: 500,
                color: 'inherit',
                textDecoration: 'none',
                fontSize: '12px',
              }}
            >
              {firstPage.author.name}
            </Link>
          </Group>
        </Group>

        {allCards.length > 0 && currentCard ? (
          <Stack gap={4} flex={1} style={{ overflow: 'hidden' }}>
            <Group justify="center" align="center" flex={1}>
              <Card
                component="article"
                radius={'md'}
                p={'xs'}
                withBorder
                style={{ cursor: 'pointer', maxWidth: '600px', width: '100%' }}
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

            <Group justify="center" align="center" gap={8}>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="grape"
                onClick={goToPrev}
                disabled={!hasPrev}
                style={{ visibility: hasPrev ? 'visible' : 'hidden' }}
              >
                ←
              </ActionIcon>

              <Text ta="center" c="gray" fz="xs">
                {currentIndex + 1} / {allCards.length}
              </Text>

              <ActionIcon
                size="sm"
                variant="subtle"
                color="grape"
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

        <Group justify="center" gap={8}>
          <button
            onClick={() =>
              send({
                command: 'open',
                url: `${appUrl}/profile/${props.handle}/collections/${props.rkey}/embed`,
              })
            }
            style={{
              background: 'none',
              border: 'none',
              textDecoration: 'none',
              color: 'inherit',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            View Collection
          </button>
          <Text c="gray" fz="11px">
            |
          </Text>
          <Link
            href={`${appUrl}/profile/${props.handle}/collections/${props.rkey}`}
            target="_blank"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              fontSize: '11px',
              fontWeight: 500,
            }}
          >
            View on Semble →
          </Link>
        </Group>
      </Stack>
    </Container>
  );
}
