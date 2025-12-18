'use client';

import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import useCards from '@/features/cards/lib/queries/useCards';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import useCollections from '@/features/collections/lib/queries/useCollections';
import {
  Container,
  Group,
  SimpleGrid,
  Stack,
  Title,
  Grid,
  Button,
} from '@mantine/core';
import Link from 'next/link';
import ProfileEmptyTab from '../../components/profileEmptyTab/ProfileEmptyTab';
import { BiCollection } from 'react-icons/bi';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { useNavbarContext } from '@/providers/navbar';

interface Props {
  handle: string;
}

export default function ProfileContainer(props: Props) {
  const { data: collectionsData } = useCollections({
    limit: 4,
    didOrHandle: props.handle,
  });
  const { data: cardsData } = useCards({ limit: 4, didOrHandle: props.handle });

  const collections =
    collectionsData?.pages.flatMap((page) => page.collections) ?? [];

  const cards = cardsData?.pages.flatMap((page) => page.cards) ?? [];

  const { desktopOpened } = useNavbarContext();

  return (
    <Container p={'xs'} size={'xl'}>
      <Stack>
        <Stack gap={50}>
          {/* Cards */}
          <Stack>
            <Group justify="space-between">
              <Title order={2} fz={'h3'}>
                Cards
              </Title>
              <Button
                variant="light"
                component={Link}
                color="blue"
                href={`/profile/${props.handle}/cards`}
              >
                View all
              </Button>
            </Group>

            {cards.length > 0 ? (
              <Grid gutter="xs">
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
                      cardAuthor={card.author}
                      cardContent={card.cardContent}
                      note={card.note}
                      authorHandle={props.handle}
                      urlLibraryCount={card.urlLibraryCount}
                      urlIsInLibrary={card.urlInLibrary}
                      viaCardId={card.id}
                    />
                  </Grid.Col>
                ))}
              </Grid>
            ) : (
              <ProfileEmptyTab message="No cards" icon={FaRegNoteSticky} />
            )}
          </Stack>

          {/* Collections */}
          <Stack>
            <Group justify="space-between">
              <Title order={2} fz={'h3'}>
                Collections
              </Title>
              <Button
                variant="light"
                component={Link}
                color="blue"
                href={`/profile/${props.handle}/collections`}
              >
                View all
              </Button>
            </Group>

            {collections.length > 0 ? (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs">
                {collections.map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </SimpleGrid>
            ) : (
              <ProfileEmptyTab message="No collections" icon={BiCollection} />
            )}
          </Stack>
        </Stack>
      </Stack>
    </Container>
  );
}
