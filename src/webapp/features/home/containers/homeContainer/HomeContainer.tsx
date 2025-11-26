'use client';

import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import useMyCards from '@/features/cards/lib/queries/useMyCards';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import useMyCollections from '@/features/collections/lib/queries/useMyCollections';
import CreateCollectionDrawer from '@/features/collections/components/createCollectionDrawer/CreateCollectionDrawer';
import {
  Anchor,
  Container,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Title,
  Text,
  Button,
  Avatar,
} from '@mantine/core';
import Link from 'next/link';
import { useState } from 'react';
import { BiCollection } from 'react-icons/bi';
import { FiPlus } from 'react-icons/fi';
import { FaRegNoteSticky } from 'react-icons/fa6';
import AddCardDrawer from '@/features/cards/components/addCardDrawer/AddCardDrawer';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import { useNavbarContext } from '@/providers/navbar';
import useGlobalFeed from '@/features/feeds/lib/queries/useGlobalFeed';
import FeedItem from '@/features/feeds/components/feedItem/FeedItem';
import { MdOutlineEmojiNature } from 'react-icons/md';
import { sanitizeText } from '@/lib/utils/text';
import { getRelativeTime } from '@/lib/utils/time';

export default function HomeContainer() {
  const { data: collectionsData } = useMyCollections({ limit: 4 });
  const { data: myCardsData } = useMyCards({ limit: 8 });
  const { data: profile } = useMyProfile();
  const { data: feed } = useGlobalFeed();

  const { desktopOpened } = useNavbarContext();
  const [showCollectionDrawer, setShowCollectionDrawer] = useState(false);
  const [showAddDrawer, setShowAddDrawer] = useState(false);

  const collections =
    collectionsData?.pages.flatMap((page) => page.collections) ?? [];
  const cards = myCardsData?.pages.flatMap((page) => page.cards) ?? [];

  return (
    <Container p="xs" size="xl">
      <Stack gap="xl">
        <Title order={1}>Home</Title>

        <Stack gap={50}>
          {/* Explore */}
          <Stack>
            <Group justify="space-between">
              <Group gap="xs">
                <MdOutlineEmojiNature size={22} />
                <Title order={2}>Latest on Semble</Title>
              </Group>
              <Button
                variant="light"
                component={Link}
                color="blue"
                href={'/explore'}
              >
                View all
              </Button>
            </Group>

            {feed.pages[0].activities.length > 0 ? (
              <Grid>
                {feed.pages[0].activities.slice(0, 3).map((item) => (
                  <Grid.Col
                    key={item.card.id}
                    span={{
                      base: 12,
                      xs: desktopOpened ? 12 : 6,
                      sm: desktopOpened ? 6 : 4,
                      md: 4,
                    }}
                  >
                    <Stack gap={'xs'} align="stretch" h={'100%'}>
                      <Group gap={'sm'} wrap="nowrap">
                        <Group gap={'xs'} wrap="nowrap" flex={1}>
                          <Avatar src={item.user.avatarUrl} />
                          <Text
                            component={Link}
                            href={`/profile/${item.user.handle}`}
                            fw={600}
                            c={'bright'}
                            lineClamp={1}
                          >
                            {sanitizeText(item.user.name)}
                          </Text>
                        </Group>
                        <Text
                          fz={'sm'}
                          fw={600}
                          c={'gray'}
                          span
                          display={'block'}
                        >
                          {getRelativeTime(item.createdAt.toString()) ===
                          'just now'
                            ? `Now`
                            : `${getRelativeTime(item.createdAt.toString())} ago`}
                        </Text>
                      </Group>
                      <UrlCard
                        id={item.card.id}
                        url={item.card.url}
                        cardContent={item.card.cardContent}
                        note={item.card.note}
                        urlLibraryCount={item.card.urlLibraryCount}
                        urlIsInLibrary={item.card.urlInLibrary}
                        cardAuthor={item.card.author}
                      />
                    </Stack>
                  </Grid.Col>
                ))}
              </Grid>
            ) : (
              <Stack align="center" gap="xs">
                <Text fz="h3" fw={600} c="gray">
                  No recent activity to show yet
                </Text>
              </Stack>
            )}
          </Stack>

          {/* Collections */}
          <Stack>
            <Group justify="space-between">
              <Group gap="xs">
                <BiCollection size={22} />
                <Title order={2}>Collections</Title>
              </Group>
              <Button
                variant="light"
                component={Link}
                color="blue"
                href={`/profile/${profile.handle}/collections`}
              >
                View all
              </Button>
            </Group>

            {collections.length > 0 ? (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                {collections.map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </SimpleGrid>
            ) : (
              <Stack align="center" gap="xs">
                <Text fz="h3" fw={600} c="gray">
                  No collections
                </Text>
                <Button
                  onClick={() => setShowCollectionDrawer(true)}
                  variant="light"
                  color="gray"
                  size="md"
                  rightSection={<FiPlus size={22} />}
                >
                  Create your first collection
                </Button>
              </Stack>
            )}
          </Stack>

          {/* Cards */}
          <Stack>
            <Group justify="space-between">
              <Group gap="xs">
                <FaRegNoteSticky size={22} />
                <Title order={2}>Cards</Title>
              </Group>
              <Button
                variant="light"
                component={Link}
                color="blue"
                href={`/profile/${profile.handle}/cards`}
              >
                View all
              </Button>
            </Group>

            {cards.length > 0 ? (
              <Grid gutter="md">
                {cards.map((card) => (
                  <Grid.Col
                    key={card.id}
                    span={{
                      base: 12,
                      xs: desktopOpened ? 12 : 6,
                      sm: desktopOpened ? 6 : 4,
                      md: 4,
                      lg: 3,
                    }}
                  >
                    <UrlCard
                      id={card.id}
                      url={card.url}
                      cardContent={card.cardContent}
                      note={card.note}
                      urlLibraryCount={card.urlLibraryCount}
                      urlIsInLibrary={card.urlInLibrary}
                      cardAuthor={card.author}
                    />
                  </Grid.Col>
                ))}
              </Grid>
            ) : (
              <Stack align="center" gap="xs">
                <Text fz="h3" fw={600} c="gray">
                  No cards
                </Text>
                <Button
                  variant="light"
                  color="gray"
                  size="md"
                  rightSection={<FiPlus size={22} />}
                  onClick={() => setShowAddDrawer(true)}
                >
                  Add your first card
                </Button>

                <Text ta={'center'} fw={500} c={'gray'}>
                  Need inspiration?{' '}
                  <Anchor
                    component={Link}
                    href={'/explore'}
                    fw={500}
                    c={'grape'}
                  >
                    Explore cards from the community
                  </Anchor>
                </Text>
              </Stack>
            )}
          </Stack>
        </Stack>
      </Stack>

      {/* Drawers */}
      <CreateCollectionDrawer
        isOpen={showCollectionDrawer}
        onClose={() => setShowCollectionDrawer(false)}
      />
      <AddCardDrawer
        isOpen={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
      />
    </Container>
  );
}
