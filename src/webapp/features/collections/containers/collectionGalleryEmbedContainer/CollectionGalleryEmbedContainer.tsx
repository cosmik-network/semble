'use client';

import {
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
  Divider,
} from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';
import Link from 'next/link';
import UrlCardContent from '@/features/cards/components/urlCardContent/UrlCardContent';
import { isCollectionPage, isProfilePage } from '@/lib/utils/link';
import useCollection from '../../lib/queries/useCollection';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { CollectionAccessType } from '@semble/types';

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
      <Stack justify="space-between" h="100%">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap={'xs'} align="center">
            <Link href={appUrl} target="_blank">
              <Image
                src={SembleLogo.src}
                alt="Semble logo"
                height={20}
                w={'auto'}
              />
            </Link>
            <Text
              fw={700}
              c={
                firstPage.accessType === CollectionAccessType.OPEN
                  ? 'green'
                  : 'bright'
              }
              fz="xs"
            >
              {firstPage.name}
            </Text>
          </Group>

          <Group gap={'xs'} wrap="nowrap">
            <Avatar
              size={20}
              component={Link}
              href={`/profile/${firstPage.author.handle}`}
              target="_blank"
              src={firstPage.author.avatarUrl?.replace(
                'avatar',
                'avatar_thumbnail',
              )}
              alt={`${firstPage.author.name}'s avatar`}
              radius={'sm'}
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

            <Group justify="center" align="center" gap={'xs'}>
              <ActionIcon
                size="md"
                variant="light"
                color="grape"
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

        <Group justify="center" align="center" gap={'xs'}>
          <Button
            size="compact-xs"
            variant="transparent"
            color="gray"
            onClick={() =>
              send({
                command: 'open',
                url: `${appUrl}/profile/${props.handle}/collections/${props.rkey}/embed`,
              })
            }
          >
            View Collection
          </Button>
          <Divider h={15} my={'auto'} orientation="vertical" />
          <Button
            size="compact-xs"
            variant="transparent"
            color="gray"
            component={Link}
            href={`${appUrl}/profile/${props.handle}/collections/${props.rkey}`}
            target="_blank"
          >
            View on Semble
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
