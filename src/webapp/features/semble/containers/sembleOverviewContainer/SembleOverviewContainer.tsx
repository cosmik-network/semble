'use client';

import { Button, Grid, Group, SimpleGrid, Stack, Title } from '@mantine/core';
import useSembleNotes from '../../lib/queries/useSembleNotes';
import ProfileEmptyTab from '@/features/profile/components/profileEmptyTab/ProfileEmptyTab';
import { FaRegNoteSticky } from 'react-icons/fa6';
import NoteCard from '@/features/notes/components/noteCard/NoteCard';
import { useNavbarContext } from '@/providers/navbar';
import useSembleCollections from '@/features/collections/lib/queries/useSembleCollectionts';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import { BiCollection, BiLink } from 'react-icons/bi';
import SembleEmptyTab from '../../components/sembleEmptyTab/SembleEmptyTab';
import useSembleLibraries from '../../lib/queries/useSembleLibraries';
import AddedByCard from '../../components/addedByCard/AddedByCard';
import { LuLibrary } from 'react-icons/lu';
import useSembleSimilarCards from '../../lib/queries/useSembleSimilarCards';
import SimilarUrlCard from '../../components/similarUrlCard/SimilarUrlCard';
import SembleNotesContainerError from '../sembleNotesContainer/Error.SembleNotesContainer';
import SembleCollectionsError from '../sembleCollectionsContainer/Error.SembleCollectionsContainer';
import SembleLibrariesContainerError from '../sembleLibrariesContainer/Error.SembleLibrariesContainer';
import SembleSimilarCardsContainerError from '../sembleSimilarCardsContainer/Error.SembleSimilarCardsContainer';

type TabValue = 'overview' | 'notes' | 'collections' | 'addedBy' | 'similar';

interface Props {
  url: string;
  onViewTab: (tab: TabValue) => void;
}

export default function SembleOverviewContainer(props: Props) {
  const { desktopOpened } = useNavbarContext();

  const { data: notes, error: errorNotes } = useSembleNotes({
    url: props.url,
    limit: 4,
  });
  const { data: collections, error: errorCollections } = useSembleCollections({
    url: props.url,
    limit: 4,
  });
  const { data: libraries, error: errorLibraries } = useSembleLibraries({
    url: props.url,
    limit: 3,
  });
  const { data: similarCards, error: errorSimilarCards } =
    useSembleSimilarCards({
      url: props.url,
      limit: 3,
    });

  const allNotes = notes?.pages.flatMap((page) => page.notes ?? []) ?? [];
  const allCollections =
    collections?.pages.flatMap((page) => page.collections ?? []) ?? [];
  const allLibraries =
    libraries?.pages.flatMap((page) => page.libraries ?? []) ?? [];
  const allSimilarCards =
    similarCards?.pages.flatMap((page) => page.urls ?? []) ?? [];

  return (
    <Stack>
      <Stack gap={50}>
        {/* Notes */}
        <Stack>
          <Group justify="space-between">
            <Title order={2} fz={'h3'}>
              Notes
            </Title>
            <Button
              onClick={() => props.onViewTab('notes')}
              variant="light"
              color="blue"
            >
              View all
            </Button>
          </Group>

          {errorNotes ? (
            <SembleNotesContainerError />
          ) : allNotes.length > 0 ? (
            <Grid gutter="md">
              {allNotes.map((note) => (
                <Grid.Col
                  key={note.id}
                  span={{
                    base: 12,
                    xs: desktopOpened ? 12 : 6,
                    sm: desktopOpened ? 6 : 4,
                    lg: 4,
                  }}
                >
                  <NoteCard
                    id={note.id}
                    author={note.author}
                    createdAt={note.createdAt}
                    note={note.note}
                  />
                </Grid.Col>
              ))}
            </Grid>
          ) : (
            <ProfileEmptyTab message="No notes" icon={FaRegNoteSticky} />
          )}
        </Stack>

        {/* Collections */}
        <Stack>
          <Group justify="space-between">
            <Title order={2} fz={'h3'}>
              Collections
            </Title>
            <Button
              onClick={() => props.onViewTab('collections')}
              variant="light"
              color="blue"
            >
              View all
            </Button>
          </Group>

          {errorCollections ? (
            <SembleCollectionsError />
          ) : allCollections.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              {allCollections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </SimpleGrid>
          ) : (
            <SembleEmptyTab message="No collections" icon={BiCollection} />
          )}
        </Stack>

        {/* Libraries */}
        <Stack>
          <Group justify="space-between">
            <Title order={2} fz={'h3'}>
              Added by
            </Title>
            <Button
              onClick={() => props.onViewTab('addedBy')}
              variant="light"
              color="blue"
            >
              View all
            </Button>
          </Group>

          {errorLibraries ? (
            <SembleLibrariesContainerError />
          ) : allLibraries.length > 0 ? (
            <Grid gutter="md">
              {allLibraries.map((item) => (
                <Grid.Col
                  key={item.user.name}
                  span={{
                    base: 12,
                    xs: desktopOpened ? 12 : 6,
                    sm: desktopOpened ? 6 : 4,
                    lg: 4,
                  }}
                >
                  <AddedByCard item={item} />
                </Grid.Col>
              ))}
            </Grid>
          ) : (
            <SembleEmptyTab
              message="No one has added this link to their library yet"
              icon={LuLibrary}
            />
          )}
        </Stack>

        {/* Similar cards */}
        <Stack>
          <Group justify="space-between">
            <Title order={2} fz={'h3'}>
              Similar cards
            </Title>
            <Button
              onClick={() => props.onViewTab('similar')}
              variant="light"
              color="blue"
            >
              View all
            </Button>
          </Group>

          {errorSimilarCards ? (
            <SembleSimilarCardsContainerError />
          ) : allSimilarCards.length > 0 ? (
            <Grid gutter="md">
              {allSimilarCards.map((urlView) => (
                <Grid.Col
                  key={urlView.url}
                  span={{
                    base: 12,
                    xs: desktopOpened ? 12 : 6,
                    sm: desktopOpened ? 6 : 4,
                    md: 4,
                    lg: 3,
                  }}
                >
                  <SimilarUrlCard urlView={urlView} />
                </Grid.Col>
              ))}
            </Grid>
          ) : (
            <SembleEmptyTab message="No similar cards found" icon={BiLink} />
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}
