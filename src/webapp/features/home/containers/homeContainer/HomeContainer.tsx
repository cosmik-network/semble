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

export default function HomeContainer() {
  const { data: collectionsData } = useMyCollections({ limit: 4 });
  const { data: myCardsData } = useMyCards({ limit: 8 });
  const { data: profile } = useMyProfile();
  const { data: feed } = useGlobalFeed({ limit: 3 });

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
                <Title order={2}>What's new</Title>
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
                {feed.pages[0].activities.map((item) => (
                  <Grid.Col
                    key={item.card.id}
                    span={{
                      base: 12,
                      xs: desktopOpened ? 12 : 6,
                      sm: desktopOpened ? 6 : 4,
                      md: 4,
                    }}
                  >
                    <FeedItem item={item} />
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
